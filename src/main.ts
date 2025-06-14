import * as dotenv from 'dotenv';
dotenv.config();

import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, desktopCapturer, screen, nativeImage, Notification, shell } from 'electron';
import * as path from 'path';
import * as isDev from 'electron-is-dev';
import * as fs from 'fs';
import { exec } from 'child_process';
import { stop as stopRecording } from 'node-record-lpcm16';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import axios from 'axios';
import { INTERVIEW_ASSISTANT_PROMPT, WHISPER_TRANSCRIPTION_PROMPT } from './prompts';
import { uploadScreenshotToS3, uploadAudioToS3 } from './s3Service';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); // Keep for Whisper transcription

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isPlaying = false;
let recordingProcess: any = null;
let transcriptionStream: any = null;
let recordingStream: any = null;
let lastRecordingPath: string | null = null;
let chatWindow: BrowserWindow | null = null;
let lastAIResponse: string | null = null;
let lastActivityTime: number = Date.now();
let idleCheckInterval: NodeJS.Timeout | null = null;
let isIdlePromptShown: boolean = false;

function createTrayIcon() {
  try {
    // Use a built-in icon for now
    const iconPath = path.join(__dirname, '../public/icon.iconset/icon_16x16@2x.png');
    
    // Create a simple icon if it doesn't exist
    if (!fs.existsSync(iconPath)) {
      const iconBuffer = Buffer.from(`
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="14" fill="#FF2D55"/>
          <path d="M16 8v16M8 16h16" stroke="white" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `);
      fs.writeFileSync(iconPath, iconBuffer);
    }

    tray = new Tray(iconPath);
    tray.setToolTip('Contextor');

    let isInvisible = false;

    function updateTrayMenu() {
      const isVisible = mainWindow?.isVisible();
      const showHideLabel = isVisible ? 'Hide App' : 'Show App';
      const invisibleLabel = isInvisible ? 'Make Visible' : 'Make Invisible';
      const contextMenu = Menu.buildFromTemplate([
        {
          label: showHideLabel,
          click: () => {
            if (mainWindow) {
              if (mainWindow.isVisible()) {
                mainWindow.hide();
              } else {
                mainWindow.show();
                mainWindow.focus();
              }
              setTimeout(updateTrayMenu, 100);
            }
          }
        },
        {
          label: invisibleLabel,
          click: () => {
            if (mainWindow) {
              isInvisible = !isInvisible;
              if (isInvisible) {
                mainWindow.setOpacity(0.5);
                mainWindow.setSkipTaskbar(true);
                mainWindow.blur();
                new Notification({ title: 'Contextor', body: 'App is now invisible. Use the tray menu to make it visible again.' }).show();
              } else {
                mainWindow.setOpacity(1);
                mainWindow.setIgnoreMouseEvents(false);
                mainWindow.setSkipTaskbar(false);
                mainWindow.show();
                mainWindow.focus();
              }
              setTimeout(updateTrayMenu, 100);
            }
          }
        },
        {
          label: 'Logout',
          click: () => {
            // Send logout message to renderer process
            if (mainWindow) {
              mainWindow.webContents.send('logout');
            }
          }
        },
        {
          label: 'Quit',
          click: () => {
            app.quit();
          }
        }
      ]);
      tray?.setContextMenu(contextMenu);
    }

    updateTrayMenu();

    // Remove tray click handler (do nothing on click)
    tray.on('click', () => {});

    // Also update menu when window is shown/hidden
    mainWindow?.on('show', updateTrayMenu);
    mainWindow?.on('hide', updateTrayMenu);

    console.log('Tray icon created successfully');
  } catch (error) {
    console.error('Failed to create tray icon:', error);
  }
}

function createWindow() {
  // Get the primary display's work area
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: 200,
    height: 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    movable: true,
    resizable: true,
    x: Math.floor(screenWidth - 400 - 100), // Position 100px from the right edge
    y: 80, // Position at the top with some margin
    title: 'Contextor',
    backgroundColor: '#000000', // Add background color
    show: false, // Don't show until ready
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Set the window title
  mainWindow.setTitle('Contextor');

  // In development mode, load from the dev server
  if (isDev) {
    mainWindow.loadURL('http://localhost:8080');
  } else {
    // In production, load from the built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      console.log('Window shown and focused');
    }
  });

  // Send stored auth callback data if available (Windows/Linux)
  mainWindow.webContents.once('did-finish-load', () => {
    if ((global as any).authCallback && mainWindow) {
      mainWindow.webContents.send('auth-callback', (global as any).authCallback);
      delete (global as any).authCallback;
    }
    
    if ((global as any).paymentCallback && mainWindow) {
      mainWindow.webContents.send('payment-callback', (global as any).paymentCallback);
      delete (global as any).paymentCallback;
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create tray icon
  createTrayIcon();

  // Start idle timer for monitoring conversation activity
  startIdleTimer();

  if (process.platform === 'darwin') {
    const iconPath = path.join(__dirname, '../public/apple-touch-icon.png');
    const image = nativeImage.createFromPath(iconPath);
    if (!image.isEmpty()) {
      app.dock?.setIcon(image);
    } else {
      console.warn('Failed to load Dock icon:', iconPath);
    }
  }
}

app.whenReady().then(() => {
  // Set the app name
  if (process.platform === 'darwin') {
    app.setName('Contextor');
  }

  // Register protocol for auth callback
  app.setAsDefaultProtocolClient('contextor-auth');
  
  // Register protocol for payment callback
  app.setAsDefaultProtocolClient('contextor-payment');

  createWindow();

  // Register global shortcut
  const shortcut = process.platform === 'darwin' ? 'CommandOrControl+Shift+K' : 'Control+Shift+K';
  globalShortcut.register(shortcut, () => {
    if (!mainWindow) {
      createWindow();
    } else {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  stopIdleTimer();
});

// Example IPC handler
ipcMain.handle('get-message', async () => {
  return 'Hello from the main process!';
});

async function captureScreen(): Promise<Buffer | null> {
  try {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;
    console.log('Screen size:', { width, height });

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width, height },
      fetchWindowIcons: false
    });

    if (sources.length === 0) {
      console.error('No screen sources found');
      return null;
    }

    const screenSource = sources[0];
    console.log('Capturing display:', screenSource.name);
    
    const image = screenSource.thumbnail;
    const size = image.getSize();
    console.log('Image size:', size);

    if (size.width === 0 || size.height === 0) {
      console.error('Invalid image size:', size);
      return null;
    }

    const buffer = image.toPNG();
    if (buffer.length === 0) {
      console.error('Generated buffer is empty');
      return null;
    }

    console.log('Buffer size:', buffer.length);
    return buffer;
  } catch (error) {
    console.error('Failed to capture screen:', error);
    return null;
  }
}

async function uploadScreenshotToS3AndGetUrl(buffer: Buffer): Promise<string | null> {
  try {
    const result = await uploadScreenshotToS3(buffer);
    if (result.success && result.url) {
      return result.url;
    } else {
      console.error('Failed to upload screenshot to S3:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Failed to upload screenshot to S3:', error);
    return null;
  }
}

interface ScreenshotResult {
  buffer: Buffer;
  url: string;
}

async function takeScreenshot(mainWindow: BrowserWindow): Promise<ScreenshotResult | null> {
  mainWindow.hide();
  try {
    await new Promise(resolve => setTimeout(resolve, 200));
    const buffer = await captureScreen();
    if (!buffer) return null;
    
    const screenshotUrl = await uploadScreenshotToS3AndGetUrl(buffer);
    if (!screenshotUrl) return null;
    
    return { buffer, url: screenshotUrl };
  } catch (error) {
    console.error('Screenshot process failed:', error);
    return null;
  } finally {
    mainWindow.show();
  }
}

async function takeScreenshotFromUrl(mainWindow: BrowserWindow, url: string): Promise<ScreenshotResult | null> {
  try {
    // Create a new hidden browser window for capturing the URL
    const screenshotWindow = new BrowserWindow({
      width: 1920,
      height: 1080,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await screenshotWindow.loadURL(url);
    
    // Wait for the page to load completely
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Capture the screenshot
    const image = await screenshotWindow.capturePage();
    const buffer = image.toPNG();
    
    // Close the screenshot window
    screenshotWindow.close();
    
    // Upload to S3
    const screenshotUrl = await uploadScreenshotToS3AndGetUrl(buffer);
    if (!screenshotUrl) return null;
    
    return { buffer, url: screenshotUrl };
  } catch (error) {
    console.error('URL screenshot process failed:', error);
    return null;
  }
}

async function createScreenshotRecord(aiFeedback: string, imageUrl: string): Promise<void> {
  try {
    // Get auth token from the renderer process
    const authToken = await getAuthTokenFromRenderer();
    if (!authToken) {
      console.log('No auth token available, skipping screenshot record creation');
      return;
    }

    const response = await axios.post('https://contextor-api-c1cb32489441.herokuapp.com/screenshots', {
      screenshot: {
        url: imageUrl,  // Use the actual S3 URL
        status: 'pending',
        ai_feedback: aiFeedback
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log('Screenshot record created successfully:', response.data);
  } catch (error) {
    console.error('Failed to create screenshot record:', error);
    if (axios.isAxiosError(error)) {
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
    }
  }
}

async function getAuthTokenFromRenderer(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!mainWindow) {
      resolve(null);
      return;
    }

    // Request auth token from renderer
    mainWindow.webContents.send('get-auth-token');
    
    // Listen for the response
    const handleAuthToken = (_event: any, token: string | null) => {
      ipcMain.removeListener('auth-token-response', handleAuthToken);
      resolve(token);
    };
    
    ipcMain.once('auth-token-response', handleAuthToken);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      ipcMain.removeListener('auth-token-response', handleAuthToken);
      resolve(null);
    }, 5000);
  });
}

async function transcribeWithWhisper(audioPath: string): Promise<string | null> {
  try {
    const resp = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-1',
      response_format: 'verbose_json',
      prompt: WHISPER_TRANSCRIPTION_PROMPT
    });

    if (!resp.text) return null;

    // Process the transcription to identify speakers
    const lines = resp.text.split('\n');
    const processedLines = lines.map(line => {
      // If the line already has a speaker label, keep it
      if (line.match(/^Speaker \d+:/)) {
        return line;
      }
      // Otherwise, assume it's a new speaker
      return `Speaker 1: ${line}`;
    });

    return processedLines.join('\n');
  } catch (error) {
    console.error('Whisper transcription failed:', error);
    return null;
  }
}

async function startAudioRecording(): Promise<void> {
  try {
    const desktopPath = app.getPath('desktop');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(desktopPath, `recording-${timestamp}.m4a`);
    lastRecordingPath = outputPath;
    // Use ffmpeg to record system audio
    recordingProcess = exec(`ffmpeg -f avfoundation -i ":0" -c:a aac -b:a 192k "${outputPath}"`);
    console.log('Started recording to:', outputPath);
  } catch (error) {
    console.error('Failed to start recording:', error);
  }
}

// audio
// mandar mensagem para o S3
// salvar dados no banco de dados (audio_id, user_id, created_at, updated_at)

async function stopAudioRecording(): Promise<void> {
  if (recordingProcess) {
    try {
      recordingProcess.kill('SIGINT');
      recordingProcess = null;
      console.log('Stopped recording');
      if (lastRecordingPath && mainWindow) {
        // Wait for file to be written
        setTimeout(async () => {
          const text = await transcribeWithWhisper(lastRecordingPath!);
          if (!mainWindow) return;
          const screenshotResult = await takeScreenshot(mainWindow);
          if (text && screenshotResult) {
            const chatResponse = await chatWithTextAndImage(text, screenshotResult.buffer);
            
            // Store the latest AI response and update activity
            lastAIResponse = chatResponse;
            updateLastActivity();
            
            mainWindow.webContents.send('chat-response', chatResponse);
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  }

  if (recordingStream) {
    try {
      stopRecording();
      recordingStream = null;
      console.log('Stopped audio stream');
    } catch (error) {
      console.error('Failed to stop audio stream:', error);
    }
  }

  if (transcriptionStream) {
    try {
      transcriptionStream.end();
      transcriptionStream = null;
      console.log('Stopped transcription');
    } catch (error) {
      console.error('Failed to stop transcription:', error);
    }
  }
}

// Listen for text sent from renderer
ipcMain.on('send-text-to-main', (event, text: string) => {
  // Update activity for any user input
  updateLastActivity();
  
  if (text === 'minimize-to-tray') {
    if (mainWindow) {
      mainWindow.minimize();
    }
    return;
  }
  
  if (text === 'take-screenshot') {
    if (mainWindow) {
      takeScreenshot(mainWindow).then(async (screenshotResult) => {
        if (screenshotResult) {
          try {
            const imageAnalysis = await chatWithTextAndImage(
              INTERVIEW_ASSISTANT_PROMPT,
              screenshotResult.buffer
            );
            
            // Store the latest AI response and update activity
            lastAIResponse = imageAnalysis;
            updateLastActivity();
            
            mainWindow?.webContents.send('screenshot-with-image', {
              analysis: imageAnalysis,
              imageUrl: screenshotResult.url
            });
            console.log('Image analysis:', imageAnalysis);
            
            // Create screenshot record in API
            await createScreenshotRecord(imageAnalysis, screenshotResult.url);
          } catch (error) {
            console.error('Failed to analyze screenshot:', error);
            mainWindow?.webContents.send('screenshot-analysis', 'Failed to analyze screenshot');
          }
        }
      });
    }
    return;
  }

  if (text.startsWith('prompt-screenshot:')) {
    const prompt = text.slice('prompt-screenshot:'.length);
    if (mainWindow) {
      takeScreenshot(mainWindow).then(async (screenshotResult) => {
        if (screenshotResult) {
          try {
            const imageAnalysis = await chatWithTextAndImage(
              prompt,
              screenshotResult.buffer
            );
            
            // Store the latest AI response and update activity
            lastAIResponse = imageAnalysis;
            updateLastActivity();
            
            mainWindow?.webContents.send('screenshot-with-image', {
              analysis: imageAnalysis,
              imageUrl: screenshotResult.url
            });
            
            // Create screenshot record in API
            await createScreenshotRecord(imageAnalysis, screenshotResult.url);
          } catch (error) {
            console.error('Failed to analyze screenshot:', error);
            mainWindow?.webContents.send('screenshot-analysis', 'Failed to analyze screenshot');
          }
        }
      });
    }
    return;
  }

  if (text.startsWith('prompt-transcription:')) {
    const prompt = text.slice('prompt-transcription:'.length);
    if (lastRecordingPath && mainWindow) {
      transcribeWithWhisper(lastRecordingPath).then(async (transcription) => {
        if (transcription) {
          try {
            const response = await chatWithText(
              `${prompt}\n\nTranscription: ${transcription}`
            );
            
            // Store the latest AI response and update activity
            lastAIResponse = response;
            updateLastActivity();
            
            mainWindow?.webContents.send('chat-response', response);
          } catch (error) {
            console.error('Failed to process transcription:', error);
            mainWindow?.webContents.send('chat-response', 'Failed to process transcription');
          }
        } else {
          mainWindow?.webContents.send('chat-response', 'No transcription available');
        }
      });
    }
    return;
  }

  if (text === 'initiate-payment') {
    // Open Stripe payment link
    shell.openExternal('https://www.contextor.app/en/pricing?electron=true');
    return;
  }

  if (text.startsWith('screenshot-url:')) {
    const url = text.slice('screenshot-url:'.length);
    if (mainWindow) {
      takeScreenshotFromUrl(mainWindow, url).then(async (screenshotResult) => {
        if (screenshotResult) {
          try {
            const imageAnalysis = await chatWithTextAndImage(
              `Analyze this screenshot from the URL: ${url}`,
              screenshotResult.buffer
            );
            
            // Store the latest AI response and update activity
            lastAIResponse = imageAnalysis;
            updateLastActivity();
            
            mainWindow?.webContents.send('screenshot-with-image', {
              analysis: imageAnalysis,
              imageUrl: screenshotResult.url
            });
            console.log('URL screenshot analysis:', imageAnalysis);
            
            // Create screenshot record in API
            await createScreenshotRecord(imageAnalysis, screenshotResult.url);
          } catch (error) {
            console.error('Failed to analyze URL screenshot:', error);
            mainWindow?.webContents.send('screenshot-analysis', 'Failed to analyze screenshot from URL');
          }
        } else {
          mainWindow?.webContents.send('screenshot-analysis', 'Failed to create screenshot from URL');
        }
      });
    }
    return;
  }

  if (text === 'play') {
    isPlaying = !isPlaying;
    if (mainWindow) {
      mainWindow.webContents.send('play-state-changed', isPlaying);
      
      if (isPlaying) {
        startAudioRecording();
      } else {
        stopAudioRecording();
      }
    }
    return;
  }

  // Handle general text input (not a special command)
  if (mainWindow) {
    processGeneralTextInput(text);
  }
  
  console.log('Received text from renderer:', text);
});

// Handle window resize requests
ipcMain.on('resize-window', (event, height: number) => {
  if (mainWindow) {
    mainWindow.setSize(320, height);
  }
});

// Handle window move requests
ipcMain.on('move-window', (event, x: number, y: number) => {
  if (mainWindow) {
    mainWindow.setPosition(x, y);
  }
});

// Handle window size requests
ipcMain.on('set-window-size', (event, width: number, height: number) => {
  if (mainWindow) {
    mainWindow.setSize(width, height);
  }
});

async function chatWithTextAndImage(text: string, imageBuffer: Buffer): Promise<string> {
  const imageBase64 = imageBuffer.toString('base64');
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: text
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${imageBase64}`
            }
          }
        ]
      }
    ],
    max_tokens: 1000
  });
  
  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response content from AI');
  }
  return content;
}

async function chatWithText(text: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: text
      }
    ],
    max_tokens: 1000
  });
  
  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response content from AI');
  }
  return content;
}

async function processGeneralTextInput(userText: string): Promise<void> {
  try {
    // Update activity time
    updateLastActivity();
    
    // Combine the latest AI response with the user's new text
    let combinedPrompt = userText;
    if (lastAIResponse) {
      combinedPrompt = `Previous AI response: ${lastAIResponse}\n\nUser's new input: ${userText}\n\nPlease consider both the previous response and the new input to provide a helpful response.`;
    }
    
    // Send to OpenAI
    const aiResponse = await chatWithText(combinedPrompt);
    
    // Store the latest response
    lastAIResponse = aiResponse;
    
    // Send response to the insights panel
    if (mainWindow) {
      mainWindow.webContents.send('chat-response', aiResponse);
    }
    
    console.log('Processed general text input:', userText);
    console.log('AI response:', aiResponse);
  } catch (error) {
    console.error('Failed to process general text input:', error);
    if (mainWindow) {
      mainWindow.webContents.send('chat-response', 'Failed to process your message. Please try again.');
    }
  }
}

function updateLastActivity(): void {
  lastActivityTime = Date.now();
  isIdlePromptShown = false;
  console.log('🔄 Activity updated at:', new Date(lastActivityTime).toISOString());
}

function startIdleTimer(): void {
  // Clear existing interval
  if (idleCheckInterval) {
    clearInterval(idleCheckInterval);
  }
  
  console.log('Starting idle timer...');
  
  // Check for idle state every 5 seconds (for testing - change to 30000 for production)
  idleCheckInterval = setInterval(() => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityTime;
    const idleTimeoutMs = 10 * 1000; // 10 seconds (for testing - change to 3 * 60 * 1000 for production)
    
    console.log(`Idle check: ${timeSinceLastActivity}ms since last activity, timeout: ${idleTimeoutMs}ms, prompt shown: ${isIdlePromptShown}`);
    
    if (timeSinceLastActivity >= idleTimeoutMs && !isIdlePromptShown && mainWindow) {
      showIdlePrompt();
    }
  }, 3 * 60 * 1000);
}

function showIdlePrompt(): void {
  if (!mainWindow || isIdlePromptShown) return;
  
  isIdlePromptShown = true;
  console.log('Showing idle prompt after 3 minutes of inactivity');
  
  mainWindow.webContents.send('idle-prompt', {
    message: 'Do you have any more questions? Can we end the conversation?',
    buttons: [
      { id: 'yes', text: 'Yes, end conversation' },
      { id: 'no', text: 'No, continue' }
    ]
  });
}

function stopIdleTimer(): void {
  if (idleCheckInterval) {
    clearInterval(idleCheckInterval);
    idleCheckInterval = null;
  }
}

function createChatWindow() {
  if (chatWindow) {
    chatWindow.focus();
    return;
  }
  const primaryDisplay = screen.getPrimaryDisplay();
  chatWindow = new BrowserWindow({
    width: 300,
    height: 600,
    x: 0,
    y: 80, // below the main bar
    frame: false,
    alwaysOnTop: true,
    resizable: true,
    transparent: false,
    title: 'Contextor Chat',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  if (isDev) {
    chatWindow.loadURL('http://localhost:8080?chat=1');
  } else {
    chatWindow.loadFile(path.join(__dirname, '../dist/index.html'), { query: { chat: '1' } });
  }
  chatWindow.on('closed', () => {
    chatWindow = null;
  });
}

function closeChatWindow() {
  if (chatWindow) {
    chatWindow.close();
    chatWindow = null;
  }
}

ipcMain.on('open-chat-window', () => {
  createChatWindow();
});

ipcMain.on('close-chat-window', () => {
  closeChatWindow();
});

ipcMain.on('open-external', (event, url: string) => {
  shell.openExternal(url);
});

// Handle idle prompt responses
ipcMain.on('idle-response', (event, response: string) => {
  if (response === 'yes') {
    // Hide the insights panel
    if (mainWindow) {
      mainWindow.webContents.send('hide-insights-panel');
      console.log('User chose to end conversation - hiding insights panel');
    }
    stopIdleTimer();
  } else if (response === 'no') {
    // Reset the timer and continue
    updateLastActivity();
    console.log('User chose to continue conversation - resetting idle timer');
  }
  
  isIdlePromptShown = false;
});

// Handle protocol URL (for auth callback)
app.on('open-url', (event, url) => {
  event.preventDefault();
  
  if (url.startsWith('contextor-auth://')) {
    const urlObj = new URL(url);
    const token = urlObj.searchParams.get('token');
    const user = urlObj.searchParams.get('user');
    const expiresAt = urlObj.searchParams.get('expires_at');
    
    if (token && mainWindow) {
      // Send auth data to renderer
      mainWindow.webContents.send('auth-callback', {
        token,
        user: user ? JSON.parse(decodeURIComponent(user)) : null,
        expires_at: expiresAt
      });
    }
  }

  if (url.startsWith('contextor-payment://')) {
    const urlObj = new URL(url);
    const success = urlObj.searchParams.get('success');
    const sessionId = urlObj.searchParams.get('session_id');
    
    if (success === 'true' && mainWindow) {
      // Send payment confirmation to renderer
      mainWindow.webContents.send('payment-callback', {
        status: 'success',
        session_id: sessionId
      });
    }
  }
});

// Handle auth callback on Windows/Linux via command line
if (process.platform === 'win32' || process.platform === 'linux') {
  const authUrl = process.argv.find(arg => arg.startsWith('contextor-auth://'));
  if (authUrl) {
    const urlObj = new URL(authUrl);
    const token = urlObj.searchParams.get('token');
    const user = urlObj.searchParams.get('user');
    const expiresAt = urlObj.searchParams.get('expires_at');
    
    if (token) {
      // Store auth data temporarily to send to renderer when ready
      (global as any).authCallback = {
        token,
        user: user ? JSON.parse(decodeURIComponent(user)) : null,
        expires_at: expiresAt
      };
    }
  }

  const paymentUrl = process.argv.find(arg => arg.startsWith('contextor-payment://'));
  if (paymentUrl) {
    const urlObj = new URL(paymentUrl);
    const success = urlObj.searchParams.get('success');
    const sessionId = urlObj.searchParams.get('session_id');
    
    if (success === 'true') {
      // Store payment data temporarily to send to renderer when ready
      (global as any).paymentCallback = {
        status: 'success',
        session_id: sessionId
      };
    }
  }
}
