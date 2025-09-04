// ============================================================================
// PLATFORM AUDIO CAPTURE SERVICE (RENDERER)
// ============================================================================

export interface AudioCaptureState {
  isRecording: boolean;
  isMicActive: boolean;
  isSystemAudioActive: boolean;
  recordingDuration: number;
  error: string | null;
  platform: 'macos' | 'windows' | 'linux';
}

export interface AudioChunk {
  data: string; // base64 encoded
  timestamp: number;
  source: 'microphone' | 'system';
  mimeType: string;
}

export class PlatformAudioCapture {
  private state: AudioCaptureState = {
    isRecording: false,
    isMicActive: false,
    isSystemAudioActive: false,
    recordingDuration: 0,
    error: null,
    platform: this.detectPlatform()
  };

  private mediaStream: MediaStream | null = null;
  private micMediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private audioProcessor: ScriptProcessorNode | null = null;
  private systemAudioContext: AudioContext | null = null;
  private systemAudioProcessor: ScriptProcessorNode | null = null;
  private recordingStartTime: number = 0;
  private durationInterval: NodeJS.Timeout | null = null;
  private audioChunks: AudioChunk[] = [];

  // Audio configuration
  private readonly SAMPLE_RATE = 24000;
  private readonly AUDIO_CHUNK_DURATION = 0.1;
  private readonly BUFFER_SIZE = 4096;

  // Platform detection
  private readonly isLinux = process.platform === 'linux';
  private readonly isMacOS = process.platform === 'darwin';
  private readonly isWindows = process.platform === 'win32';

  // Echo cancellation
  private aecProcessor: SimpleAEC | null = null;
  private systemAudioBuffer: Array<{ data: string; timestamp: number }> = [];
  private readonly MAX_SYSTEM_BUFFER_SIZE = 10;

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  async startCapture(screenshotIntervalSeconds: number = 5, imageQuality: 'low' | 'medium' | 'high' = 'medium'): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.state.isRecording) {
        console.log('⚠️ Already recording, stopping current session');
        await this.stopCapture();
      }

      console.log('🎯 Starting platform audio capture...');
      
      // Reset state
      this.audioChunks = [];
      this.state.isRecording = true;
      this.state.error = null;
      this.recordingStartTime = Date.now();

      // Initialize echo cancellation
      this.aecProcessor = new SimpleAEC();

      // Start platform-specific capture
      if (this.isMacOS) {
        await this.startMacOSCapture();
      } else if (this.isLinux) {
        await this.startLinuxCapture();
      } else if (this.isWindows) {
        await this.startWindowsCapture();
      }

      // Start screenshot capture if interval is specified
      if (screenshotIntervalSeconds !== 0) {
        this.startScreenshotCapture(screenshotIntervalSeconds, imageQuality);
      }

      // Start duration tracking
      this.startDurationTracking();

      console.log('✅ Platform audio capture started successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to start audio capture:', error);
      this.state.isRecording = false;
      this.state.error = error instanceof Error ? error.message : 'Unknown error';
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async stopCapture(): Promise<{ success: boolean; audioChunks?: AudioChunk[] }> {
    try {
      if (!this.state.isRecording) {
        return { success: true };
      }

      console.log('🛑 Stopping platform audio capture...');

      // Stop duration tracking
      this.stopDurationTracking();

      // Stop platform-specific capture
      if (this.isMacOS) {
        await this.stopMacOSCapture();
      } else if (this.isLinux) {
        await this.stopLinuxCapture();
      } else if (this.isWindows) {
        await this.stopWindowsCapture();
      }

      // Stop screenshot capture
      await this.stopScreenshotCapture();

      // Clean up resources
      this.cleanupAudioResources();

      this.state.isRecording = false;
      const capturedChunks = [...this.audioChunks];
      this.audioChunks = [];

      console.log('✅ Platform audio capture stopped');
      return { success: true, audioChunks: capturedChunks };
    } catch (error) {
      console.error('❌ Failed to stop audio capture:', error);
      this.state.isRecording = false;
      this.state.error = error instanceof Error ? error.message : 'Unknown error';
      return { success: false };
    }
  }

  async captureManualScreenshot(imageQuality: 'low' | 'medium' | 'high' = 'medium'): Promise<{ success: boolean; base64?: string; error?: string }> {
    try {
      console.log('📸 Capturing manual screenshot...');
      const result = await (window as any).api.captureScreenshot({ quality: imageQuality });
      
      if (result.success && result.base64) {
        console.log('✅ Manual screenshot captured successfully');
        return { success: true, base64: result.base64 };
      } else {
        console.error('❌ Failed to capture manual screenshot:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('❌ Error capturing manual screenshot:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  getState(): AudioCaptureState {
    return { ...this.state };
  }

  // ============================================================================
  // PRIVATE METHODS - PLATFORM-SPECIFIC CAPTURE
  // ============================================================================

  private async startMacOSCapture(): Promise<void> {
    console.log('🍎 Starting macOS capture...');

    // Start macOS audio capture in main process
    const audioResult = await (window as any).api.startPlatformAudioCapture();
    if (!audioResult.success) {
      throw new Error('Failed to start macOS audio capture: ' + audioResult.error);
    }

    // Get microphone input
    try {
      this.micMediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      console.log('✅ macOS microphone capture started');
      this.state.isMicActive = true;
      this.setupMicProcessing(this.micMediaStream);
    } catch (micErr) {
      console.warn('⚠️ Failed to get microphone on macOS:', micErr);
      this.state.isMicActive = false;
    }

    this.state.isSystemAudioActive = true;
    console.log('✅ macOS capture started - system audio handled by main process');
  }

  private async startLinuxCapture(): Promise<void> {
    console.log('🐧 Starting Linux capture...');

    // Get display media for screen capture
    this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        frameRate: 1,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
      audio: false, // Don't use system audio loopback on Linux
    });

    // Get microphone input
    try {
      this.micMediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      console.log('✅ Linux microphone capture started');
      this.state.isMicActive = true;
      this.setupLinuxMicProcessing(this.micMediaStream);
    } catch (micError) {
      console.warn('⚠️ Failed to get microphone access on Linux:', micError);
      this.state.isMicActive = false;
    }

    this.state.isSystemAudioActive = false; // Limited system audio support on Linux
    console.log('✅ Linux capture started');
  }

  private async startWindowsCapture(): Promise<void> {
    console.log('🪟 Starting Windows capture...');

    // Start screen capture in main process for screenshots
    const screenResult = await (window as any).api.startPlatformAudioCapture();
    if (!screenResult.success) {
      throw new Error('Failed to start screen capture: ' + screenResult.error);
    }

    // Get microphone input
    try {
      this.micMediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      console.log('✅ Windows microphone capture started');
      this.state.isMicActive = true;
      this.setupMicProcessing(this.micMediaStream);
    } catch (micErr) {
      console.warn('⚠️ Could not get microphone access on Windows:', micErr);
      this.state.isMicActive = false;
    }

    // Get system audio using native Electron loopback
    try {
      this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true // This will use native loopback
      });
      
      // Verify we got audio tracks
      const audioTracks = this.mediaStream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio track in native loopback stream');
      }
      
      console.log('✅ Windows native loopback audio capture started');
      this.state.isSystemAudioActive = true;
      this.setupSystemAudioProcessing(this.mediaStream);
    } catch (sysAudioErr) {
      console.error('❌ Failed to start Windows native loopback audio:', sysAudioErr);
      this.state.isSystemAudioActive = false;
    }
  }

  private async stopMacOSCapture(): Promise<void> {
    console.log('🛑 Stopping macOS capture...');
    
    // Stop microphone
    if (this.micMediaStream) {
      this.micMediaStream.getTracks().forEach(track => track.stop());
      this.micMediaStream = null;
      this.state.isMicActive = false;
    }

    // Stop system audio in main process
    await (window as any).api.stopPlatformAudioCapture();
    this.state.isSystemAudioActive = false;
  }

  private async stopLinuxCapture(): Promise<void> {
    console.log('🛑 Stopping Linux capture...');
    
    // Stop display media
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    // Stop microphone
    if (this.micMediaStream) {
      this.micMediaStream.getTracks().forEach(track => track.stop());
      this.micMediaStream = null;
      this.state.isMicActive = false;
    }

    this.state.isSystemAudioActive = false;
  }

  private async stopWindowsCapture(): Promise<void> {
    console.log('🛑 Stopping Windows capture...');
    
    // Stop microphone
    if (this.micMediaStream) {
      this.micMediaStream.getTracks().forEach(track => track.stop());
      this.micMediaStream = null;
      this.state.isMicActive = false;
    }

    // Stop system audio
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
      this.state.isSystemAudioActive = false;
    }

    // Stop screen capture in main process
    await (window as any).api.stopPlatformAudioCapture();
  }

  // ============================================================================
  // PRIVATE METHODS - AUDIO PROCESSING
  // ============================================================================

  private setupMicProcessing(micStream: MediaStream): void {
    const micAudioContext = new AudioContext({ sampleRate: this.SAMPLE_RATE });
    const micSource = micAudioContext.createMediaStreamSource(micStream);
    const micProcessor = micAudioContext.createScriptProcessor(this.BUFFER_SIZE, 1, 1);

    let audioBuffer: number[] = [];
    const samplesPerChunk = this.SAMPLE_RATE * this.AUDIO_CHUNK_DURATION;

    micProcessor.onaudioprocess = async (e: AudioProcessingEvent) => {
      const inputData = e.inputBuffer.getChannelData(0);
      audioBuffer.push(...inputData);

      while (audioBuffer.length >= samplesPerChunk) {
        let chunk = audioBuffer.splice(0, samplesPerChunk);
        let processedChunk = new Float32Array(chunk);

        // Apply echo cancellation if system audio is available
        if (this.aecProcessor && this.systemAudioBuffer.length > 0) {
          const latestSystemAudio = this.systemAudioBuffer[this.systemAudioBuffer.length - 1];
          const systemFloat32 = this.base64ToFloat32Array(latestSystemAudio.data);

          if (this.isVoiceActive(systemFloat32)) {
            processedChunk = this.aecProcessor.process(new Float32Array(chunk), systemFloat32);
            console.log('🔊 Applied AEC because system audio is active');
          }
        }

        const pcmData16 = this.convertFloat32ToInt16(processedChunk);
        const base64Data = this.arrayBufferToBase64(pcmData16.buffer);

        this.audioChunks.push({
          data: base64Data,
          timestamp: Date.now(),
          source: 'microphone',
          mimeType: 'audio/pcm;rate=24000'
        });
      }
    };

    micSource.connect(micProcessor);
    micProcessor.connect(micAudioContext.destination);

    this.audioContext = micAudioContext;
    this.audioProcessor = micProcessor;
  }

  private setupLinuxMicProcessing(micStream: MediaStream): void {
    const micAudioContext = new AudioContext({ sampleRate: this.SAMPLE_RATE });
    const micSource = micAudioContext.createMediaStreamSource(micStream);
    const micProcessor = micAudioContext.createScriptProcessor(this.BUFFER_SIZE, 1, 1);

    let audioBuffer: number[] = [];
    const samplesPerChunk = this.SAMPLE_RATE * this.AUDIO_CHUNK_DURATION;

    micProcessor.onaudioprocess = async (e: AudioProcessingEvent) => {
      const inputData = e.inputBuffer.getChannelData(0);
      audioBuffer.push(...inputData);

      while (audioBuffer.length >= samplesPerChunk) {
        const chunk = audioBuffer.splice(0, samplesPerChunk);
        const pcmData16 = this.convertFloat32ToInt16(new Float32Array(chunk));
        const base64Data = this.arrayBufferToBase64(pcmData16.buffer);

        this.audioChunks.push({
          data: base64Data,
          timestamp: Date.now(),
          source: 'microphone',
          mimeType: 'audio/pcm;rate=24000'
        });
      }
    };

    micSource.connect(micProcessor);
    micProcessor.connect(micAudioContext.destination);

    this.audioContext = micAudioContext;
    this.audioProcessor = micProcessor;
  }

  private setupSystemAudioProcessing(systemStream: MediaStream): void {
    const systemAudioContext = new AudioContext({ sampleRate: this.SAMPLE_RATE });
    const systemSource = systemAudioContext.createMediaStreamSource(systemStream);
    const systemProcessor = systemAudioContext.createScriptProcessor(this.BUFFER_SIZE, 1, 1);

    let audioBuffer: number[] = [];
    const samplesPerChunk = this.SAMPLE_RATE * this.AUDIO_CHUNK_DURATION;

    systemProcessor.onaudioprocess = async (e: AudioProcessingEvent) => {
      const inputData = e.inputBuffer.getChannelData(0);
      if (!inputData || inputData.length === 0) return;
      
      audioBuffer.push(...inputData);

      while (audioBuffer.length >= samplesPerChunk) {
        const chunk = audioBuffer.splice(0, samplesPerChunk);
        const pcmData16 = this.convertFloat32ToInt16(new Float32Array(chunk));
        const base64Data = this.arrayBufferToBase64(pcmData16.buffer);

        this.audioChunks.push({
          data: base64Data,
          timestamp: Date.now(),
          source: 'system',
          mimeType: 'audio/pcm;rate=24000'
        });

        // Store for echo cancellation
        this.systemAudioBuffer.push({
          data: base64Data,
          timestamp: Date.now()
        });

        // Remove old system audio data
        if (this.systemAudioBuffer.length > this.MAX_SYSTEM_BUFFER_SIZE) {
          this.systemAudioBuffer = this.systemAudioBuffer.slice(-this.MAX_SYSTEM_BUFFER_SIZE);
        }
      }
    };

    systemSource.connect(systemProcessor);
    systemProcessor.connect(systemAudioContext.destination);

    this.systemAudioContext = systemAudioContext;
    this.systemAudioProcessor = systemProcessor;
  }

  // ============================================================================
  // PRIVATE METHODS - SCREENSHOT CAPTURE
  // ============================================================================

  private startScreenshotCapture(intervalSeconds: number, imageQuality: 'low' | 'medium' | 'high'): void {
    console.log(`📸 Starting screenshot capture with ${intervalSeconds}s interval`);
    
    const intervalMilliseconds = intervalSeconds * 1000;
    
    // Capture first screenshot immediately
    setTimeout(() => this.captureScreenshot(imageQuality), 100);
    
    // Set up interval for subsequent screenshots
    setInterval(() => {
      if (this.state.isRecording) {
        this.captureScreenshot(imageQuality);
      }
    }, intervalMilliseconds);
  }

  private async stopScreenshotCapture(): Promise<void> {
    console.log('🛑 Stopping screenshot capture');
    // Screenshot capture is handled by intervals, no specific cleanup needed
  }

  private async captureScreenshot(imageQuality: 'low' | 'medium' | 'high'): Promise<void> {
    try {
      const result = await (window as any).api.captureScreenshot({ quality: imageQuality });
      if (result.success) {
        console.log('📸 Screenshot captured successfully');
      } else {
        console.error('❌ Failed to capture screenshot:', result.error);
      }
    } catch (error) {
      console.error('❌ Error capturing screenshot:', error);
    }
  }

  // ============================================================================
  // PRIVATE METHODS - UTILITY FUNCTIONS
  // ============================================================================

  private detectPlatform(): 'macos' | 'windows' | 'linux' {
    if (this.isMacOS) return 'macos';
    if (this.isWindows) return 'windows';
    if (this.isLinux) return 'linux';
    return 'windows'; // fallback
  }

  private startDurationTracking(): void {
    this.durationInterval = setInterval(() => {
      if (this.state.isRecording) {
        this.state.recordingDuration = Date.now() - this.recordingStartTime;
      }
    }, 100);
  }

  private stopDurationTracking(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
  }

  private cleanupAudioResources(): void {
    // Clean up microphone resources
    if (this.audioProcessor) {
      this.audioProcessor.disconnect();
      this.audioProcessor = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Clean up system audio resources
    if (this.systemAudioProcessor) {
      this.systemAudioProcessor.disconnect();
      this.systemAudioProcessor = null;
    }
    if (this.systemAudioContext) {
      this.systemAudioContext.close();
      this.systemAudioContext = null;
    }
  }

  private isVoiceActive(audioFloat32Array: Float32Array, threshold: number = 0.005): boolean {
    if (!audioFloat32Array || audioFloat32Array.length === 0) {
      return false;
    }

    let sumOfSquares = 0;
    for (let i = 0; i < audioFloat32Array.length; i++) {
      sumOfSquares += audioFloat32Array[i] * audioFloat32Array[i];
    }
    const rms = Math.sqrt(sumOfSquares / audioFloat32Array.length);

    return rms > threshold;
  }

  private base64ToFloat32Array(base64: string): Float32Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);

    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    return float32Array;
  }

  private convertFloat32ToInt16(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

// ============================================================================
// SIMPLE ACOUSTIC ECHO CANCELLATION
// ============================================================================

class SimpleAEC {
  private adaptiveFilter: Float32Array;
  private mu: number;
  private echoDelay: number;
  private sampleRate: number;
  private delaySamples: number;
  private echoGain: number;
  private noiseFloor: number;
  private targetErr: number;
  private adaptRate: number;

  constructor() {
    this.adaptiveFilter = new Float32Array(1024);
    this.mu = 0.2;
    this.echoDelay = 100;
    this.sampleRate = 24000;
    this.delaySamples = Math.floor((this.echoDelay / 1000) * this.sampleRate);
    this.echoGain = 0.5;
    this.noiseFloor = 0.01;
    this.targetErr = 0.002;
    this.adaptRate = 0.1;

    console.log('🎯 AEC initialized');
  }

  process(micData: Float32Array, systemData: Float32Array): Float32Array {
    const output = new Float32Array(micData.length);
    
    for (let i = 0; i < micData.length; i++) {
      const micSample = micData[i];
      const sysIndex = Math.max(0, i - this.delaySamples);
      const sysSample = sysIndex < systemData.length ? systemData[sysIndex] : 0;
      
      // Simple echo cancellation
      const echoEstimate = sysSample * this.echoGain;
      const error = micSample - echoEstimate;
      
      // Adaptive filter update
      if (Math.abs(sysSample) > this.noiseFloor) {
        this.echoGain += this.adaptRate * error * sysSample;
        this.echoGain = Math.max(0, Math.min(1, this.echoGain));
      }
      
      output[i] = error;
    }
    
    return output;
  }
}
