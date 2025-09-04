import * as dotenv from 'dotenv';
dotenv.config();

import { app, globalShortcut, ipcMain, shell } from 'electron';

import { WindowManager } from './helpers/windowManager';
import { TrayManager } from './helpers/trayManager';
import { ScreenshotService } from './helpers/screenshotService';
import { AudioService } from './helpers/audioService';
import { audioScreenshotService } from 'electron-audio-shot';
import { APIService } from './helpers/apiService';

// ============================================================================
// MAIN APPLICATION
// ============================================================================

class ContextorApp {
  public windowManager: WindowManager;
  private trayManager: TrayManager;
  private screenshotService: ScreenshotService;
  private audioService: AudioService;
  private platformAudioService: audioScreenshotService;
  private apiService: APIService;
  private lastAIResponse: string | null = null;
  private currentAuthToken: string | null = null;
  private currentConversationId: string | null = null;
  private isFetchingToken: boolean = false;
  private tokenPromise: Promise<string | null> | null = null;
  private lastTokenCheck: number = 0;
  private readonly TOKEN_CHECK_INTERVAL = 3000; // 3 second

  constructor() {
    this.windowManager = new WindowManager();
    this.trayManager = new TrayManager(this.windowManager);
    this.screenshotService = new ScreenshotService();
    this.audioService = new AudioService();
    this.platformAudioService = new audioScreenshotService();
    this.apiService = new APIService();
    
    // Reset conversation ID on app startup
    this.currentConversationId = null;
    console.log('🚀 App starting - conversation ID reset');
  }

  // --------------------------------------------------------------------------
  // APP LIFECYCLE
  // --------------------------------------------------------------------------

  async initialize(): Promise<void> {
    this.setupApp();
    this.createWindow();
    this.setupGlobalShortcuts();
    this.setupIpcHandlers();
    this.platformAudioService.setupIpcHandlers();
    this.handleCommandLineArgs();
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS
  // --------------------------------------------------------------------------

  private setupApp(): void {
  if (process.platform === 'darwin') {
    app.setName('Contextor');
  }

  app.setAsDefaultProtocolClient('contextor-auth');
  app.setAsDefaultProtocolClient('contextor-payment');
  }

  public createWindow(): void {
    this.windowManager.createMainWindow();
    this.trayManager.createTray();
  }

  private setupGlobalShortcuts(): void {
  const shortcut = process.platform === 'darwin' ? 'CommandOrControl+Shift+K' : 'Control+Shift+K';
  globalShortcut.register(shortcut, () => {
      if (!this.windowManager.window) {
        this.createWindow();
    } else {
        this.windowManager.restore();
        this.windowManager.show();
      }
    });
  }

  private setupIpcHandlers(): void {
    // Basic handlers
    ipcMain.handle('get-message', async () => {
      return 'Hello from the main process!';
    });

    // Text processing
    ipcMain.on('send-text-to-main', async (event, text: string) => {
      await this.handleTextMessage(text);
    });

    // Window management
    ipcMain.on('resize-window', (event, height: number) => {
      this.windowManager.resize(undefined, height);
    });

    ipcMain.on('set-window-size', (event, width: number, height: number) => {
      this.windowManager.resize(width, height);
    });

    // External links
    ipcMain.on('open-external', (event, url: string) => {
      shell.openExternal(url);
    });

    // API handlers
    ipcMain.handle('create-message', async (event, conversationId: string, data: { content_type: string, text_content?: string, screenshot_url?: string, sender_type?: string }) => {
      return await this.handleCreateMessage(conversationId, data);
    });

    // System audio coordination handlers
    ipcMain.on('system-audio-started', () => {
      console.log('System audio recording started in renderer');
    });

    ipcMain.on('system-audio-stopped', (event, audioData: any) => {
      console.log('System audio recording stopped in renderer:', audioData);
      // Here you could potentially combine system audio with microphone audio
    });

    // Enhanced audio mixing handlers
    ipcMain.handle('start-combined-audio-recording', async () => {
      try {
        console.log('🎤 Main process: Starting combined audio recording...');
        
        // Check permissions before starting
        await this.checkAudioPermissions();
        
        await this.audioService.startRecording();
        console.log('✅ Main process: Combined audio recording started successfully');
        return { success: true };
      } catch (error) {
        console.error('❌ Main process: Failed to start combined audio recording:', error);
        console.error('Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    ipcMain.handle('stop-combined-audio-recording', async () => {
      try {
        const buffer = await this.audioService.stopRecording();
        
        if (buffer) {
          // Process the combined audio buffer
          await this.processCombinedAudioBuffer(buffer);
        }
        
        return { success: true, buffer };
      } catch (error) {
        console.error('Failed to stop combined audio recording:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Audio configuration handlers
    ipcMain.handle('set-audio-configuration', async (event, config: { systemAudioEnabled?: boolean; echoCancellationEnabled?: boolean; echoCancellationSensitivity?: 'low' | 'medium' | 'high'; audioScenario?: 'auto' | 'earphones' | 'speakers'; voiceRecordingMode?: 'headphones' | 'speakers' | 'auto' }) => {
      try {
        if (config.systemAudioEnabled !== undefined) {
          this.audioService.setSystemAudioRecording(config.systemAudioEnabled);
        }
        if (config.echoCancellationEnabled !== undefined) {
          this.audioService.setEchoCancellation(config.echoCancellationEnabled);
        }
        if (config.echoCancellationSensitivity !== undefined) {
          this.audioService.setEchoCancellationSensitivity(config.echoCancellationSensitivity);
        }
        if (config.audioScenario !== undefined) {
          this.audioService.setAudioScenario(config.audioScenario);
        }
        if (config.voiceRecordingMode !== undefined) {
          this.audioService.setVoiceRecordingMode(config.voiceRecordingMode);
        }
        return { success: true };
      } catch (error) {
        console.error('Failed to set audio configuration:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    ipcMain.handle('get-audio-configuration', async () => {
      try {
        return { success: true, config: this.audioService.getConfiguration() };
      } catch (error) {
        console.error('Failed to get audio configuration:', error);
        return { success: false, error: error instanceof Error ? error.message : String(error) };
      }
    });

    // Auth token handler
    ipcMain.on('auth-token-response', (event, token: string | null) => {
      this.handleAuthTokenResponse(token);
    });

    ipcMain.on('auth-state-changed', () => {
      // Clear token state when auth state changes
      this.clearTokenState();
      console.log('Auth state changed - token state cleared');
    });

    // Logout handler
    ipcMain.on('logout', () => {
      this.clearTokenState();
      console.log('Logout triggered - token state cleared');
    });
  }

  private async handleTextMessage(text: string): Promise<void> {
    if (text === 'end-conversation') {
      this.processEndConversation();
      return;
    }

    if (text === 'take-screenshot') {
      await this.processScreenshotCommand();
      return;
    }

    if (text === 'start-audio-recording') {
      await this.processAudioCommand();
      return;
    }

    if (text === 'stop-audio-recording') {
      await this.processAudioStopCommand();
      return;
    }

    await this.processGeneralTextInput(text);
  }

  private async processGeneralTextInput(userText: string): Promise<void> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        this.windowManager.sendMessage('chat-response', 'Please log in to use AI features.');
        return;
      }

      // Get or create conversation
      const conversationId = await this.getOrCreateConversation(token);
      if (!conversationId) {
        this.windowManager.sendMessage('chat-response', 'Failed to create conversation. Please try again.');
        return;
      }

      this.windowManager.sendMessage('loading-update', 'Processing with AI...');
      
      // Process message with AI via backend
      const result = await this.apiService.processMessageWithAI(token, conversationId, {
        content_type: 'text',
        text_content: userText,
        sender_type: 'user'
      });

      const aiResponse = result.ai_response.data.attributes.text_content || 'No response received';
      this.lastAIResponse = aiResponse;

      this.windowManager.sendMessage('chat-response', aiResponse);

      console.log('Processed general text input:', userText);
      console.log('AI response:', aiResponse);
    } catch (error) {
      console.error('Failed to process general text input:', error);
      if (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('402')) {
          this.windowManager.sendMessage('toggle-insights-panel', true);
          this.windowManager.sendMessage('chat-response', 'Your daily message limit has been reached. Please upgrade to continue or come back tomorrow.');
        } else {
          this.windowManager.sendMessage('chat-response', 'Failed to process your message. Please try again.');
        }
      }
    }
  }

  private async processScreenshotCommand(): Promise<void> {
    const window = this.windowManager.window;
    if (!window) return;

    const token = await this.getAuthToken();
    if (!token) {
      this.windowManager.sendMessage('screenshot-analysis', 'Please log in to use AI features.');
      return;
    }

    // Get or create conversation
    const conversationId = await this.getOrCreateConversation(token);
    if (!conversationId) {
      this.windowManager.sendMessage('screenshot-analysis', 'Failed to create conversation. Please try again.');
      return;
    }

    this.windowManager.sendMessage('loading-update', 'Capturing screen...');
    const screenshotResult = await this.screenshotService.takeScreenshot(window, token, conversationId);
    
    if (screenshotResult) {
      try {
        this.windowManager.sendMessage('loading-update', 'Analyzing with AI...');
        
        // Get the screenshot URL from the original upload response
        const screenshotUrl = screenshotResult.screenshotUrl;
        
        // Get AI analysis for the screenshot (this creates the AI response message)
        const aiAnalysis = await this.getScreenshotAnalysis(screenshotUrl, conversationId, screenshotResult.messageId);
        
        this.lastAIResponse = aiAnalysis;
        
        this.windowManager.sendMessage('screenshot-with-image', {
          analysis: aiAnalysis,
          imageUrl: screenshotUrl
        });

          console.log('Screenshot analysis:', aiAnalysis);
        } catch (error) {
          console.error('Failed to analyze screenshot:', error);
          if (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('402')) {
              this.windowManager.sendMessage('toggle-insights-panel', true);
              this.windowManager.sendMessage('chat-response', 'Your daily message limit has been reached. Please upgrade to continue or come back tomorrow.');
            } else {
              this.windowManager.sendMessage('chat-response', 'Failed to process your message. Please try again.');
            }
          }
        }
    } else {
      this.windowManager.sendMessage('screenshot-analysis', 'Failed to create screenshot');
    }
  }

  private async processAudioCommand(): Promise<void> {
    try {
      console.log('Starting audio recording...');
      await this.audioService.startRecording();
      this.windowManager.sendMessage('audio-recording-started');
      console.log('Audio recording started successfully');
    } catch (error) {
      console.error('Failed to start audio recording:', error);
      this.windowManager.sendMessage('audio-recording-error', 'Failed to start audio recording');
    }
  }

  private async processAudioStopCommand(): Promise<void> {
    const window = this.windowManager.window;
    if (!window) return;

    const token = await this.getAuthToken();
    if (!token) {
      this.windowManager.sendMessage('audio-analysis', 'Please log in to use AI features.');
      return;
    }

    // Get or create conversation
    const conversationId = await this.getOrCreateConversation(token);
    if (!conversationId) {
      this.windowManager.sendMessage('audio-analysis', 'Failed to create conversation. Please try again.');
      return;
    }

    try {
      console.log('Stopping audio recording...');
      const audioBuffer = await this.audioService.stopRecording();
      
      if (!audioBuffer) {
        this.windowManager.sendMessage('audio-analysis', 'No audio recorded or recording was too short. Please try again and speak for at least 0.5 seconds.');
        return;
      }

      if (audioBuffer.length === 0) {
        this.windowManager.sendMessage('audio-analysis', 'No audio data captured. Please check your microphone permissions and try again.');
        return;
      }

      console.log(`Audio buffer size: ${audioBuffer.length} bytes`);
      this.windowManager.sendMessage('loading-update', 'Processing audio...');
      
      // Upload audio buffer to S3
      const audioResult = await this.audioService.uploadAudioBuffer(audioBuffer, token, conversationId);
      
      if (audioResult) {
        this.windowManager.sendMessage('loading-update', 'Analyzing with AI...');
        
        // Get AI analysis for the audio (this creates the AI response message)
        const aiAnalysis = await this.getAudioAnalysis(audioResult.audioUrl, conversationId, audioResult.messageId);
        
        this.lastAIResponse = aiAnalysis;
        
        console.log('🎤 Sending audio-with-analysis message to renderer:', {
          analysis: aiAnalysis,
          audioUrl: audioResult.audioUrl
        });
        
        this.windowManager.sendMessage('audio-with-analysis', {
          analysis: aiAnalysis,
          audioUrl: audioResult.audioUrl
        });

        console.log('Audio analysis:', aiAnalysis);
      } else {
        this.windowManager.sendMessage('audio-analysis', 'Failed to upload or process audio. Please try again.');
      }
    } catch (error) {
      console.error('Failed to process audio:', error);
      if (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('402')) {
          this.windowManager.sendMessage('toggle-insights-panel', true);
          this.windowManager.sendMessage('chat-response', 'Your daily message limit has been reached. Please upgrade to continue or come back tomorrow.');
        } else if (errorMessage.includes('permission') || errorMessage.includes('microphone')) {
          this.windowManager.sendMessage('audio-analysis', 'Microphone permission denied. Please check your system settings and try again.');
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          this.windowManager.sendMessage('audio-analysis', 'Network error. Please check your internet connection and try again.');
        } else {
          this.windowManager.sendMessage('audio-analysis', `Audio processing failed: ${errorMessage}`);
        }
      }
    }
  }

  private processEndConversation(): void {
    this.windowManager.sendMessage('hide-insights-panel');
    console.log('End conversation command received - hiding insights panel');
    
    // Reset conversation ID so next interaction creates a new conversation
    this.currentConversationId = null;
    console.log('🔄 Conversation reset - next interaction will create new conversation');
  }

  private async handleCreateMessage(conversationId: string, data: { content_type: string, text_content?: string, screenshot_url?: string, sender_type?: string }): Promise<any> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      // Ensure content_type is properly typed
      const messageData = {
        ...data,
        content_type: data.content_type as 'text' | 'screenshot' | 'audio',
        sender_type: data.sender_type as 'user' | 'ai' | undefined
      };
      
      const result = await this.apiService.createMessage(token, conversationId, messageData);
      console.log('Message created successfully:', result);
      return result;
  } catch (error) {
      console.error('Failed to create message:', error);
      throw error;
    }
  }

  private async handleAuthTokenResponse(token: string | null): Promise<void> {
    this.currentAuthToken = token;
    console.log('Auth token received:', token ? 'Token available' : 'No token');
    if (token) {
      // Only fetch user data if we haven't already
      if (!this.isFetchingToken) {
        await this.handleReturnCurrentUser(token);
      }
    }
  }

  private async handleReturnCurrentUser(token: string): Promise<void> {
    try {
      this.isFetchingToken = true;
      const user = await this.apiService.returnCurrentUser(token);
      console.log('User:', user);
          } catch (error) {
        console.error('Failed to get current user:', error);
        this.windowManager.sendMessage('logout');
        console.log('User unauthorized - triggering logout to show login page');
      } finally {
      this.isFetchingToken = false;
    }
  }

  private async getAuthToken(): Promise<string | null> {
    const now = Date.now();
    
    // If we have a token and haven't checked recently, return it
    if (this.currentAuthToken && (now - this.lastTokenCheck) < this.TOKEN_CHECK_INTERVAL) {
      return this.currentAuthToken;
    }

    // If we're already fetching a token, return the existing promise
    if (this.tokenPromise) {
      return this.tokenPromise;
    }

    // Create a new promise for token fetching
    this.tokenPromise = new Promise((resolve) => {
      this.lastTokenCheck = now;
      
      // Request token from renderer
      this.windowManager.sendMessage('get-auth-token');
      
      // Set a timeout to resolve with current token if no response
      setTimeout(() => {
        this.tokenPromise = null;
        resolve(this.currentAuthToken);
      }, 1000);
    });

    return this.tokenPromise;
  }

  private async getOrCreateConversation(token: string): Promise<string | null> {
    try {
      // If we already have a conversation ID for this session, reuse it
      if (this.currentConversationId) {
        console.log('📝 Using existing conversation:', this.currentConversationId);
        return this.currentConversationId;
      }

      // Create a new conversation (only happens on app start or after "end conversation")
      const conversation = await this.apiService.createConversation(token, {
        title: `Interview - ${new Date().toLocaleString()}`
      });

      this.currentConversationId = conversation.data.id;
      console.log('✅ New conversation created:', this.currentConversationId);
      
      return this.currentConversationId;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      if (error instanceof Error && error.message.includes('402')) {
        this.windowManager.sendMessage('toggle-insights-panel', true);
        this.windowManager.sendMessage('chat-response', 'Your daily message limit has been reached. Please upgrade to continue or come back tomorrow.');
      }
      return null;
    }
  }

  private handleCommandLineArgs(): void {
    if (process.platform === 'win32' || process.platform === 'linux') {
      const authUrl = process.argv.find(arg => arg.startsWith('contextor-auth://'));
      const paymentUrl = process.argv.find(arg => arg.startsWith('contextor-payment://'));

      if (authUrl) {
        this.handleAuthProtocol(authUrl);
      }

      if (paymentUrl) {
        this.handlePaymentProtocol(paymentUrl);
      }
    }
  }

  public handleAuthProtocol(url: string): void {
    const urlObj = new URL(url);
    const token = urlObj.searchParams.get('token');
    const user = urlObj.searchParams.get('user');
    const expiresAt = urlObj.searchParams.get('expires_at');
    
    if (token) {
      const authData = {
        token,
        user: user ? JSON.parse(decodeURIComponent(user)) : null,
        expires_at: expiresAt || ''
      };

      if (this.windowManager.window) {
        this.windowManager.sendMessage('auth-callback', authData);
      } else {
        (global as any).authCallback = authData;
      }
    }
  }

  public handlePaymentProtocol(url: string): void {
    const urlObj = new URL(url);
    const success = urlObj.searchParams.get('success');
    const sessionId = urlObj.searchParams.get('session_id');
    
    if (success === 'true') {
      const paymentData = {
        status: 'success',
        session_id: sessionId || ''
      };

      if (this.windowManager.window) {
        this.windowManager.sendMessage('payment-callback', paymentData);
      } else {
        (global as any).paymentCallback = paymentData;
      }
    }
  }

  // Add a method to clear token state
  private clearTokenState(): void {
    this.currentAuthToken = null;
    this.tokenPromise = null;
    this.isFetchingToken = false;
    this.lastTokenCheck = 0;
  }

  // Get AI analysis for a screenshot
  private async getScreenshotAnalysis(screenshotUrl: string, conversationId: string, messageId: string): Promise<string> {
    try {
      // Use the existing message ID instead of creating a new message
      const response = await this.apiService.processExistingMessageWithAI(this.currentAuthToken!, conversationId, messageId);
      return response.ai_response.data.attributes.text_content || 'No analysis available';
    } catch (error) {
      console.error('Failed to get screenshot analysis:', error);
      return 'Failed to analyze screenshot. Please try again.';
    }
  }

  // Get AI analysis for audio
  private async getAudioAnalysis(audioUrl: string, conversationId: string, messageId: string): Promise<string> {
    try {
      // Use the existing message ID instead of creating a new message
      const response = await this.apiService.processExistingMessageWithAI(this.currentAuthToken!, conversationId, messageId);
      return response.ai_response.data.attributes.text_content || 'No analysis available';
    } catch (error) {
      console.error('Failed to get audio analysis:', error);
      return 'Failed to analyze audio. Please try again.';
    }
  }

  // Check audio permissions and system requirements
  private async checkAudioPermissions(): Promise<void> {
    try {
      console.log('🔍 Checking audio permissions and system requirements...');
      
      // Check if we're on macOS and provide specific guidance
      if (process.platform === 'darwin') {
        console.log('🍎 macOS detected - checking for common permission issues...');
        
        // Check if the app has microphone permissions
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        try {
          // This command checks if the app has microphone access
          await execAsync('tccutil query Microphone');
          console.log('✅ Microphone permissions check passed');
        } catch (error) {
          console.warn('⚠️ Microphone permissions may need to be granted manually');
          console.warn('Please check System Preferences > Privacy & Security > Microphone');
        }
      }
      
      // Check for required dependencies
      const { spawn } = require('child_process');
      
      // Check sox
      const soxTest = spawn('sox', ['--version']);
      await new Promise<void>((resolve, reject) => {
        soxTest.on('error', () => {
          console.error('❌ Sox not found - audio recording will fail');
          reject(new Error('Sox audio tool not found. Please install sox: brew install sox (macOS) or apt-get install sox (Linux)'));
        });
        soxTest.on('close', (code: number) => {
          if (code === 0) {
            console.log('✅ Sox is available');
            resolve();
          } else {
            console.error('❌ Sox test failed');
            reject(new Error('Sox audio tool test failed'));
          }
        });
      });
      
      console.log('✅ Audio permissions and requirements check completed');
    } catch (error) {
      console.error('❌ Audio permissions check failed:', error);
      throw error;
    }
  }

  // Process combined audio buffer (microphone + system audio)
  private async processCombinedAudioBuffer(buffer: Buffer): Promise<void> {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        this.windowManager.sendMessage('chat-response', 'Please log in to use AI features.');
        return;
      }

      // Get or create conversation
      const conversationId = await this.getOrCreateConversation(token);
      if (!conversationId) {
        this.windowManager.sendMessage('chat-response', 'Failed to create conversation. Please try again.');
        return;
      }

      this.windowManager.sendMessage('loading-update', 'Processing audio...');
      
      // Upload audio buffer to S3
      const audioResult = await this.audioService.uploadAudioBuffer(buffer, token, conversationId);
      
      if (audioResult) {
        this.windowManager.sendMessage('loading-update', 'Analyzing with AI...');
        
        // Get AI analysis for the audio (this creates the AI response message)
        const aiAnalysis = await this.getAudioAnalysis(audioResult.audioUrl, conversationId, audioResult.messageId);
        
        this.lastAIResponse = aiAnalysis;
        
        console.log('🎤 Sending audio-with-analysis message to renderer:', {
          analysis: aiAnalysis,
          audioUrl: audioResult.audioUrl
        });
        
        this.windowManager.sendMessage('audio-with-analysis', {
          analysis: aiAnalysis,
          audioUrl: audioResult.audioUrl
        });

        console.log('Combined audio analysis:', aiAnalysis);
      } else {
        this.windowManager.sendMessage('chat-response', 'Failed to upload or process audio. Please try again.');
      }
    } catch (error) {
      console.error('Failed to process combined audio buffer:', error);
      if (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('402')) {
          this.windowManager.sendMessage('toggle-insights-panel', true);
          this.windowManager.sendMessage('chat-response', 'Your daily message limit has been reached. Please upgrade to continue or come back tomorrow.');
        } else {
          this.windowManager.sendMessage('chat-response', 'Failed to process your audio. Please try again.');
        }
      }
    }
  }

  // Update a message with new content
  private async updateMessage(token: string, conversationId: string, messageId: string, content: string): Promise<void> {
    try {
      // For now, we'll just log the update since the PATCH endpoint might not exist
      console.log(`Would update message ${messageId} with content: ${content}`);
      // TODO: Implement message update endpoint in the API
    } catch (error) {
      console.error('Failed to update message:', error);
      throw error;
    }
  }
}

// ============================================================================
// APP INITIALIZATION
// ============================================================================

const contextorApp = new ContextorApp();

app.whenReady().then(() => {
  contextorApp.initialize();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (!contextorApp.windowManager?.window) {
    contextorApp.createWindow();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('open-url', (event, url) => {
  event.preventDefault();
  if (url.startsWith('contextor-auth://')) {
    contextorApp.handleAuthProtocol(url);
  } else if (url.startsWith('contextor-payment://')) {
    contextorApp.handlePaymentProtocol(url);
  }
});
