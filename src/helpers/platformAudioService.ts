import { ipcMain, desktopCapturer, systemPreferences } from 'electron';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// ============================================================================
// PLATFORM-SPECIFIC AUDIO SERVICE
// ============================================================================

export interface AudioCaptureConfig {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  chunkDuration: number;
  enableEchoCancellation: boolean;
  echoCancellationSensitivity: 'low' | 'medium' | 'high';
}

export interface AudioChunk {
  data: string; // base64 encoded
  timestamp: number;
  source: 'microphone' | 'system';
  mimeType: string;
}

export interface PermissionStatus {
  microphone: 'granted' | 'denied' | 'not-determined' | 'restricted' | 'unknown';
  screen: 'granted' | 'denied' | 'not-determined' | 'restricted' | 'unknown';
  needsSetup: boolean;
  error?: string;
}

export class PlatformAudioService {
  private isCapturing: boolean = false;
  private lastScreenshot: any = null;
  private systemAudioProc: any = null;
  private audioChunks: AudioChunk[] = [];
  private screenshotInterval: NodeJS.Timeout | null = null;
  
  // Platform detection
  private readonly isMacOS = process.platform === 'darwin';
  private readonly isWindows = process.platform === 'win32';
  private readonly isLinux = process.platform === 'linux';
  
  // Audio configuration
  private readonly config: AudioCaptureConfig = {
    sampleRate: 24000,
    channels: 1,
    bitsPerSample: 16,
    chunkDuration: 0.1,
    enableEchoCancellation: true,
    echoCancellationSensitivity: 'medium'
  };

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  async checkSystemPermissions(): Promise<PermissionStatus> {
    try {
      console.log('🔍 Checking system permissions...');
      
      let microphone: PermissionStatus['microphone'] = 'unknown';
      let screen: PermissionStatus['screen'] = 'unknown';
      let needsSetup = false;

      if (this.isMacOS) {
        // macOS specific permission checks
        try {
          const micStatus = systemPreferences.getMediaAccessStatus('microphone');
          microphone = micStatus as PermissionStatus['microphone'];
          
          // For screen recording, we need to trigger a capture request to register the app
          try {
            await desktopCapturer.getSources({ 
              types: ['screen'], 
              thumbnailSize: { width: 1, height: 1 } 
            });
            screen = 'granted';
          } catch (error) {
            screen = 'denied';
            needsSetup = true;
          }
        } catch (error) {
          console.error('Error checking macOS permissions:', error);
          microphone = 'unknown';
          needsSetup = true;
        }
      } else if (this.isWindows) {
        // Windows uses standard browser permissions
        microphone = 'granted'; // Will be checked via getUserMedia
        screen = 'granted'; // Will be checked via getDisplayMedia
      } else if (this.isLinux) {
        // Linux uses standard browser permissions
        microphone = 'granted'; // Will be checked via getUserMedia
        screen = 'granted'; // Will be checked via getDisplayMedia
      }

      const status: PermissionStatus = {
        microphone,
        screen,
        needsSetup
      };

      console.log('📋 Permission status:', status);
      return status;
    } catch (error) {
      console.error('❌ Error checking permissions:', error);
      return {
        microphone: 'unknown',
        screen: 'unknown',
        needsSetup: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async requestMicrophonePermission(): Promise<{ success: boolean; status: string; error?: string }> {
    if (!this.isMacOS) {
      return { success: true, status: 'granted' };
    }

    try {
      const status = systemPreferences.getMediaAccessStatus('microphone');
      console.log('🎤 Microphone status:', status);
      
      if (status === 'granted') {
        return { success: true, status: 'granted' };
      }

      // Request microphone permission
      const granted = await systemPreferences.askForMediaAccess('microphone');
      return { 
        success: granted, 
        status: granted ? 'granted' : 'denied'
      };
    } catch (error) {
      console.error('❌ Error requesting microphone permission:', error);
      return { 
        success: false, 
        status: 'denied',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async openSystemPreferences(section: 'screen-recording' | 'microphone'): Promise<{ success: boolean; error?: string }> {
    if (!this.isMacOS) {
      return { success: false, error: 'Not supported on this platform' };
    }

    try {
      if (section === 'screen-recording') {
        // First trigger screen capture request to register the app in system preferences
        try {
          console.log('📱 Triggering screen capture request to register app...');
          await desktopCapturer.getSources({ 
            types: ['screen'], 
            thumbnailSize: { width: 1, height: 1 } 
          });
          console.log('✅ App registered for screen recording');
        } catch (captureError) {
          console.log('📱 Screen capture request triggered (expected to fail):', captureError);
        }
        
        // Note: In a real implementation, you might want to open system preferences
        // await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
      }
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error opening system preferences:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async startAudioCapture(): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.isCapturing) {
        console.log('⚠️ Audio capture already running');
        return { success: true };
      }

      console.log('🎯 Starting platform-specific audio capture...');
      
      // Check permissions first
      const permissions = await this.checkSystemPermissions();
      if (permissions.needsSetup) {
        return { 
          success: false, 
          error: 'System permissions need to be configured. Please check microphone and screen recording permissions.' 
        };
      }

      this.isCapturing = true;
      this.audioChunks = [];

      if (this.isMacOS) {
        await this.startMacOSAudioCapture();
      } else if (this.isWindows) {
        await this.startWindowsAudioCapture();
      } else if (this.isLinux) {
        await this.startLinuxAudioCapture();
      }

      console.log('✅ Platform audio capture started successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to start audio capture:', error);
      this.isCapturing = false;
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async stopAudioCapture(): Promise<{ success: boolean; audioChunks?: AudioChunk[] }> {
    try {
      if (!this.isCapturing) {
        return { success: true };
      }

      console.log('🛑 Stopping platform audio capture...');

      // Stop platform-specific capture
      if (this.isMacOS) {
        await this.stopMacOSAudioCapture();
      } else if (this.isWindows) {
        await this.stopWindowsAudioCapture();
      } else if (this.isLinux) {
        await this.stopLinuxAudioCapture();
      }

      // Stop screenshot capture
      if (this.screenshotInterval) {
        clearInterval(this.screenshotInterval);
        this.screenshotInterval = null;
      }

      this.isCapturing = false;
      const capturedChunks = [...this.audioChunks];
      this.audioChunks = [];

      console.log('✅ Platform audio capture stopped');
      return { success: true, audioChunks: capturedChunks };
    } catch (error) {
      console.error('❌ Failed to stop audio capture:', error);
      this.isCapturing = false;
      return { success: false };
    }
  }

  async captureScreenshot(options: { quality?: 'low' | 'medium' | 'high' } = {}): Promise<{ success: boolean; base64?: string; width?: number; height?: number; error?: string }> {
    try {
      if (this.isMacOS) {
        return await this.captureMacOSScreenshot(options);
      } else {
        return await this.captureCrossPlatformScreenshot(options);
      }
    } catch (error) {
      console.error('❌ Failed to capture screenshot:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ============================================================================
  // PRIVATE METHODS - PLATFORM-SPECIFIC AUDIO CAPTURE
  // ============================================================================

  private async startMacOSAudioCapture(): Promise<void> {
    console.log('🍎 Starting macOS audio capture...');
    
    // Kill any existing SystemAudioDump processes
    await this.killExistingSystemAudioDump();
    
    // Start SystemAudioDump for system audio capture
    const { app } = require('electron');
    const systemAudioPath = app.isPackaged
      ? path.join(process.resourcesPath, 'app.asar.unpacked', 'assets', 'SystemAudioDump')
      : path.join(__dirname, '..', 'assets', 'SystemAudioDump');

    console.log('🔧 SystemAudioDump path:', systemAudioPath);

    this.systemAudioProc = spawn(systemAudioPath, [], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (!this.systemAudioProc.pid) {
      throw new Error('Failed to start SystemAudioDump');
    }

    console.log('✅ SystemAudioDump started with PID:', this.systemAudioProc.pid);

    // Set up audio processing
    const CHUNK_DURATION = this.config.chunkDuration;
    const SAMPLE_RATE = this.config.sampleRate;
    const BYTES_PER_SAMPLE = this.config.bitsPerSample / 8;
    const CHANNELS = this.config.channels;
    const CHUNK_SIZE = SAMPLE_RATE * BYTES_PER_SAMPLE * CHANNELS * CHUNK_DURATION;

    let audioBuffer = Buffer.alloc(0);

    this.systemAudioProc.stdout.on('data', async (data: Buffer) => {
      audioBuffer = Buffer.concat([audioBuffer, data]);

      while (audioBuffer.length >= CHUNK_SIZE) {
        const chunk = audioBuffer.slice(0, CHUNK_SIZE);
        audioBuffer = audioBuffer.slice(CHUNK_SIZE);

        const monoChunk = CHANNELS === 2 ? this.convertStereoToMono(chunk) : chunk;
        const base64Data = monoChunk.toString('base64');

        this.audioChunks.push({
          data: base64Data,
          timestamp: Date.now(),
          source: 'system',
          mimeType: 'audio/pcm;rate=24000'
        });
      }
    });

    this.systemAudioProc.stderr.on('data', (data: Buffer) => {
      console.error('SystemAudioDump stderr:', data.toString());
    });

    this.systemAudioProc.on('close', (code: number) => {
      console.log('SystemAudioDump process closed with code:', code);
      this.systemAudioProc = null;
    });

    this.systemAudioProc.on('error', (err: Error) => {
      console.error('SystemAudioDump process error:', err);
      this.systemAudioProc = null;
    });
  }

  private async startWindowsAudioCapture(): Promise<void> {
    console.log('🪟 Starting Windows audio capture...');
    
    // Windows audio capture is handled in the renderer process
    // The main process coordinates the capture
    console.log('ℹ️ Windows audio capture will be handled in renderer process');
  }

  private async startLinuxAudioCapture(): Promise<void> {
    console.log('🐧 Starting Linux audio capture...');
    
    // Linux audio capture is handled in the renderer process
    // Limited system audio support on Linux
    console.log('ℹ️ Linux audio capture will be handled in renderer process');
  }

  private async stopMacOSAudioCapture(): Promise<void> {
    if (this.systemAudioProc) {
      console.log('🛑 Stopping SystemAudioDump...');
      this.systemAudioProc.kill('SIGTERM');
      this.systemAudioProc = null;
    }
  }

  private async stopWindowsAudioCapture(): Promise<void> {
    console.log('🛑 Stopping Windows audio capture...');
    // Cleanup handled in renderer
  }

  private async stopLinuxAudioCapture(): Promise<void> {
    console.log('🛑 Stopping Linux audio capture...');
    // Cleanup handled in renderer
  }

  private async killExistingSystemAudioDump(): Promise<void> {
    return new Promise((resolve) => {
      console.log('🔍 Checking for existing SystemAudioDump processes...');

      const killProc = spawn('pkill', ['-f', 'SystemAudioDump'], {
        stdio: 'ignore',
      });

      killProc.on('close', (code: number) => {
        if (code === 0) {
          console.log('✅ Killed existing SystemAudioDump processes');
        } else {
          console.log('ℹ️ No existing SystemAudioDump processes found');
        }
        resolve();
      });

      killProc.on('error', (err: Error) => {
        console.log('ℹ️ Error checking for existing processes (this is normal):', err.message);
        resolve();
      });

      setTimeout(() => {
        killProc.kill();
        resolve();
      }, 2000);
    });
  }

  // ============================================================================
  // PRIVATE METHODS - SCREENSHOT CAPTURE
  // ============================================================================

  private async captureMacOSScreenshot(options: { quality?: 'low' | 'medium' | 'high' }): Promise<{ success: boolean; base64?: string; width?: number; height?: number; error?: string }> {
    try {
      const tempPath = path.join(os.tmpdir(), `screenshot-${Date.now()}.jpg`);
      const quality = options.quality || 'medium';
      
      // Map quality to JPEG quality
      const jpegQuality = quality === 'high' ? 90 : quality === 'medium' ? 80 : 60;

      await execFileAsync('screencapture', ['-x', '-t', 'jpg', tempPath]);
      const imageBuffer = await fs.promises.readFile(tempPath);
      await fs.promises.unlink(tempPath);

      // Resize image for efficiency
      const sharp = require('sharp');
      const resizedBuffer = await sharp(imageBuffer)
        .resize({ height: 384 })
        .jpeg({ quality: jpegQuality })
        .toBuffer();

      const base64 = resizedBuffer.toString('base64');
      const metadata = await sharp(resizedBuffer).metadata();

      this.lastScreenshot = {
        base64,
        width: metadata.width,
        height: metadata.height,
        timestamp: Date.now(),
      };

      return { 
        success: true, 
        base64, 
        width: metadata.width, 
        height: metadata.height 
      };
    } catch (error) {
      console.error('❌ Failed to capture macOS screenshot:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async captureCrossPlatformScreenshot(options: { quality?: 'low' | 'medium' | 'high' }): Promise<{ success: boolean; base64?: string; width?: number; height?: number; error?: string }> {
    try {
      const quality = options.quality || 'medium';
      const jpegQuality = quality === 'high' ? 90 : quality === 'medium' ? 70 : 50;

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
          width: 1920,
          height: 1080,
        },
      });

      if (sources.length === 0) {
        throw new Error('No screen sources available');
      }

      const source = sources[0];
      const buffer = source.thumbnail.toJPEG(jpegQuality);
      const base64 = buffer.toString('base64');
      const size = source.thumbnail.getSize();

      return {
        success: true,
        base64,
        width: size.width,
        height: size.height,
      };
    } catch (error) {
      console.error('❌ Failed to capture cross-platform screenshot:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ============================================================================
  // PRIVATE METHODS - UTILITY FUNCTIONS
  // ============================================================================

  private convertStereoToMono(buffer: Buffer): Buffer {
    const int16Array = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
    const monoArray = new Int16Array(int16Array.length / 2);
    
    for (let i = 0; i < monoArray.length; i++) {
      const left = int16Array[i * 2];
      const right = int16Array[i * 2 + 1];
      monoArray[i] = Math.round((left + right) / 2);
    }
    
    return Buffer.from(monoArray.buffer);
  }

  // ============================================================================
  // IPC HANDLERS SETUP
  // ============================================================================

  setupIpcHandlers(): void {
    ipcMain.handle('check-system-permissions', async () => {
      return await this.checkSystemPermissions();
    });

    ipcMain.handle('request-microphone-permission', async () => {
      return await this.requestMicrophonePermission();
    });

    ipcMain.handle('open-system-preferences', async (event, section) => {
      return await this.openSystemPreferences(section);
    });

    ipcMain.handle('start-platform-audio-capture', async () => {
      return await this.startAudioCapture();
    });

    ipcMain.handle('stop-platform-audio-capture', async () => {
      return await this.stopAudioCapture();
    });

    ipcMain.handle('capture-screenshot', async (event, options) => {
      return await this.captureScreenshot(options);
    });

    console.log('✅ Platform audio service IPC handlers registered');
  }
} 