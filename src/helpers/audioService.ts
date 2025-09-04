import { BrowserWindow } from 'electron';
import * as recordModule from 'node-record-lpcm16';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';

// ============================================================================
// AUDIO SERVICE
// ============================================================================

export interface AudioResult {
  buffer: Buffer;
  messageId: string;
  audioUrl: string;
}

export class AudioService {
  private readonly baseUrl = 'https://contextor-api-c1cb32489441.herokuapp.com';
  private recordingInstance: any = null;
  private audioChunks: Buffer[] = [];
  private isRecording: boolean = false;
  private readonly sampleRate = 16000;
  private readonly channels = 1;
  private readonly bitsPerSample = 16;
  
  // Enhanced system audio recording properties
  private systemAudioStream: any = null;
  private systemAudioChunks: Buffer[] = [];
  private microphoneAudioChunks: Buffer[] = [];
  
  // Configuration options
  private enableSystemAudioRecording = true; // Can be toggled to avoid echo
  private enableEchoCancellation = true; // Enable echo cancellation when mixing
  private echoCancellationSensitivity: 'low' | 'medium' | 'high' = 'medium'; // Sensitivity level
  private audioScenario: 'auto' | 'earphones' | 'speakers' = 'auto'; // Manual scenario override
  private voiceRecordingMode: 'headphones' | 'speakers' | 'auto' = 'auto'; // Voice recording scenario

  // --------------------------------------------------------------------------
  // PUBLIC METHODS
  // --------------------------------------------------------------------------

  // Configuration methods
  setSystemAudioRecording(enabled: boolean): void {
    this.enableSystemAudioRecording = enabled;
    console.log(`🔧 System audio recording ${enabled ? 'enabled' : 'disabled'}`);
  }

  setEchoCancellation(enabled: boolean): void {
    this.enableEchoCancellation = enabled;
    console.log(`🔧 Echo cancellation ${enabled ? 'enabled' : 'disabled'}`);
  }

  setEchoCancellationSensitivity(sensitivity: 'low' | 'medium' | 'high'): void {
    this.echoCancellationSensitivity = sensitivity;
    console.log(`🔧 Echo cancellation sensitivity set to: ${sensitivity}`);
  }

  setAudioScenario(scenario: 'auto' | 'earphones' | 'speakers'): void {
    this.audioScenario = scenario;
    console.log(`🔧 Audio scenario set to: ${scenario}`);
  }

  setVoiceRecordingMode(mode: 'headphones' | 'speakers' | 'auto'): void {
    this.voiceRecordingMode = mode;
    console.log(`🔧 Voice recording mode set to: ${mode}`);
  }

  getConfiguration(): { systemAudioEnabled: boolean; echoCancellationEnabled: boolean; echoCancellationSensitivity: string; audioScenario: string; voiceRecordingMode: string } {
    return {
      systemAudioEnabled: this.enableSystemAudioRecording,
      echoCancellationEnabled: this.enableEchoCancellation,
      echoCancellationSensitivity: this.echoCancellationSensitivity,
      audioScenario: this.audioScenario,
      voiceRecordingMode: this.voiceRecordingMode
    };
  }

  async startRecording(): Promise<void> {
    if (this.isRecording) {
      console.log('Already recording, stopping current recording');
      await this.stopRecording();
    }

    this.audioChunks = [];
    this.microphoneAudioChunks = [];
    this.systemAudioChunks = [];
    this.isRecording = true;

    try {
      console.log('Starting combined audio recording (microphone + system audio)...');
      console.log(`🔧 Configuration: system audio=${this.enableSystemAudioRecording}, echo cancellation=${this.enableEchoCancellation}`);
      
      // Start microphone recording
      await this.startMicrophoneRecording();
      
      // Start system audio recording only if enabled
      if (this.enableSystemAudioRecording) {
        await this.startSystemAudioRecording();
      } else {
        console.log('⚠️ System audio recording disabled - will only record microphone');
      }

      console.log('Combined audio recording started successfully');
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.isRecording = false;
      throw error;
    }
  }

  async stopRecording(): Promise<Buffer | null> {
    if (!this.isRecording) {
      console.log('No active recording to stop');
      return null;
    }

    try {
      console.log('Stopping combined audio recording...');
      
      // Stop microphone recording
      const microphoneBuffer = await this.stopMicrophoneRecording();
      
      // Stop system audio recording
      const systemAudioBuffer = await this.stopSystemAudioRecording();
      
      this.isRecording = false;

      if (!microphoneBuffer && !systemAudioBuffer) {
        console.log('No audio data recorded');
        return null;
      }

      // Combine microphone and system audio
      const combinedBuffer = await this.combineAudioBuffers(microphoneBuffer, systemAudioBuffer);
      
      if (!combinedBuffer || combinedBuffer.length === 0) {
        console.log('No combined audio data available');
        return null;
      }

      // Check minimum recording duration (at least 0.5 seconds)
      const minBytes = this.sampleRate * this.channels * this.bitsPerSample / 8 * 0.5;
      if (combinedBuffer.length < minBytes) {
        console.log(`Recording too short: ${combinedBuffer.length} bytes (minimum: ${minBytes} bytes)`);
        return null;
      }

      console.log('Combined audio recording stopped, buffer size:', combinedBuffer.length);
      return combinedBuffer;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      this.isRecording = false;
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS - MICROPHONE RECORDING
  // --------------------------------------------------------------------------

  private async startMicrophoneRecording(): Promise<void> {
    try {
      console.log('🎤 Starting microphone recording...');
      console.log('📊 Audio config:', {
        sampleRate: this.sampleRate,
        channels: this.channels,
        bitsPerSample: this.bitsPerSample
      });

      // Check if sox is available
      await this.checkSoxAvailability();

      // Create a new recording instance with better configuration
      this.recordingInstance = recordModule.record({
        sampleRateHertz: this.sampleRate,
        threshold: 0,
        verbose: true, // Enable verbose logging for debugging
        recordProgram: 'sox',
        silence: '1.0',
      });

      // Listen to the stream for audio data
      this.recordingInstance._stream.on('data', (chunk: Buffer) => {
        if (this.isRecording) {
          this.microphoneAudioChunks.push(chunk);
          console.log(`🎤 Microphone chunk received: ${chunk.length} bytes`);
        }
      });

      this.recordingInstance._stream.on('error', (error: Error) => {
        console.error('❌ Microphone recording error:', error);
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      });

      this.recordingInstance._stream.on('end', () => {
        console.log('🔚 Microphone recording stream ended');
      });

      // Start the recording
      this.recordingInstance.start();
      console.log('✅ Microphone recording started successfully');
    } catch (error) {
      console.error('❌ Failed to start microphone recording:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Provide specific error messages for common issues
      if (error instanceof Error) {
        if (error.message.includes('sox')) {
          throw new Error('Sox audio tool not found. Please install sox: brew install sox (macOS) or apt-get install sox (Linux)');
        } else if (error.message.includes('permission') || error.message.includes('denied')) {
          throw new Error('Microphone permission denied. Please check System Preferences > Privacy & Security > Microphone');
        } else if (error.message.includes('device') || error.message.includes('not found')) {
          throw new Error('No microphone device found. Please check your microphone connection and settings');
        }
      }
      
      throw error;
    }
  }

  private async checkSoxAvailability(): Promise<void> {
    return new Promise((resolve, reject) => {
      const { spawn } = require('child_process');
      const soxTest = spawn('sox', ['--version']);
      
      soxTest.on('error', (error: Error) => {
        console.error('❌ Sox not available:', error.message);
        reject(new Error('Sox audio tool not found. Please install sox: brew install sox (macOS) or apt-get install sox (Linux)'));
      });
      
      soxTest.on('close', (code: number) => {
        if (code === 0) {
          console.log('✅ Sox is available');
          resolve();
        } else {
          console.error('❌ Sox test failed with code:', code);
          reject(new Error('Sox audio tool test failed. Please check your sox installation'));
        }
      });
    });
  }

  private async stopMicrophoneRecording(): Promise<Buffer | null> {
    if (!this.recordingInstance) {
      return null;
    }

    try {
      // Stop the recording
      this.recordingInstance.stop();
      this.recordingInstance = null;

      // Combine all microphone audio chunks
      const rawMicrophoneBuffer = Buffer.concat(this.microphoneAudioChunks);
      this.microphoneAudioChunks = [];

      if (rawMicrophoneBuffer.length === 0) {
        console.log('No microphone audio data recorded');
        return null;
      }

      // Convert raw PCM to WAV format using sox
      const wavBuffer = await this.convertPcmToWavWithSox(rawMicrophoneBuffer);
      console.log('Microphone recording stopped, buffer size:', wavBuffer.length);
      return wavBuffer;
    } catch (error) {
      console.error('Failed to stop microphone recording:', error);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS - SYSTEM AUDIO RECORDING
  // --------------------------------------------------------------------------

  private async startSystemAudioRecording(): Promise<void> {
    try {
      console.log('🔊 Starting system audio capture...');
      
      // Check if electron-audio-loopback is available
      await this.checkAudioLoopbackAvailability();
      
      // For now, system audio capture is handled in the renderer process
      // The main process just tracks that we want system audio
      this.systemAudioStream = { isRendererHandled: true };
      
      console.log('ℹ️ System audio capture will be handled in renderer process');
    } catch (error) {
      console.error('❌ Failed to start system audio recording:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Don't throw error - system audio is optional
      console.log('⚠️ Continuing without system audio capture');
    }
  }

  private async checkAudioLoopbackAvailability(): Promise<void> {
    try {
      const audioLoopback = require('electron-audio-loopback');
      console.log('✅ electron-audio-loopback is available');
    } catch (error) {
      console.error('❌ electron-audio-loopback not available:', error);
      throw new Error('electron-audio-loopback not installed. Please run: npm install electron-audio-loopback');
    }
  }

  private async stopSystemAudioRecording(): Promise<Buffer | null> {
    try {
      if (!this.systemAudioStream) {
        return null;
      }

      // For now, system audio is handled in renderer process
      // The main process doesn't have the actual audio data
      console.log('ℹ️ System audio recording stopped (handled in renderer)');
      
      // Clear the stream reference
      this.systemAudioStream = null;
      this.systemAudioChunks = [];

      // Return null since we don't have the audio data in main process
      return null;
    } catch (error) {
      console.error('Failed to stop system audio recording:', error);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS - AUDIO MIXING
  // --------------------------------------------------------------------------

  private async combineAudioBuffers(microphoneBuffer: Buffer | null, systemAudioBuffer: Buffer | null): Promise<Buffer | null> {
    try {
      if (!microphoneBuffer && !systemAudioBuffer) {
        return null;
      }

      if (!microphoneBuffer) {
        return systemAudioBuffer;
      }

      if (!systemAudioBuffer) {
        return microphoneBuffer;
      }

      // Both buffers exist - apply voice echo cancellation first, then system audio mixing
      console.log('🎵 Processing audio with voice echo cancellation and system audio mixing...');
      console.log(`🔧 Voice recording mode: ${this.voiceRecordingMode}, System audio scenario: ${this.audioScenario}`);
      
      // Extract PCM data from WAV buffers
      const micPcm = this.extractPcmFromWav(microphoneBuffer);
      const sysPcm = this.extractPcmFromWav(systemAudioBuffer);
      
      // Step 1: Apply voice echo cancellation
      const voiceProcessedPcm = this.applyVoiceEchoCancellation(micPcm, sysPcm);
      
      // Step 2: Apply system audio echo cancellation (keeping the working solution)
      const finalPcm = this.enableEchoCancellation 
        ? this.mixAudioBuffersWithEchoCancellation(voiceProcessedPcm, sysPcm)
        : this.mixAudioBuffers(voiceProcessedPcm, sysPcm);
      
      // Convert back to WAV
      const finalWav = this.convertPcmToWav(finalPcm);
      
      console.log('✅ Audio processing completed with voice and system echo cancellation');
      return finalWav;
    } catch (error) {
      console.error('Failed to combine audio buffers:', error);
      // Fallback to microphone only if mixing fails
      console.log('⚠️ Falling back to microphone-only audio');
      return microphoneBuffer;
    }
  }

  private extractPcmFromWav(wavBuffer: Buffer): Buffer {
    // Skip WAV header (44 bytes) and return PCM data
    return wavBuffer.slice(44);
  }

  private mixAudioBuffersWithEchoCancellation(micPcm: Buffer, sysPcm: Buffer): Buffer {
    // Convert to Int16 arrays for easier manipulation
    const micArray = new Int16Array(micPcm.buffer, micPcm.byteOffset, micPcm.length / 2);
    const sysArray = new Int16Array(sysPcm.buffer, sysPcm.byteOffset, sysPcm.length / 2);
    
    // Use the longer buffer as the base
    const maxLength = Math.max(micArray.length, sysArray.length);
    const mixedArray = new Int16Array(maxLength);
    
    // Echo cancellation parameters based on sensitivity
    let echoThreshold: number;
    let echoReduction: number;
    let micAmplitudeThreshold: number;
    
    switch (this.echoCancellationSensitivity) {
      case 'low':
        echoThreshold = 0.12; // Slightly more sensitive than before
        echoReduction = 0.35; // Moderate reduction
        micAmplitudeThreshold = 0.7; // Allow normal voices
        break;
      case 'high':
        echoThreshold = 0.18; // More sensitive to catch more echo
        echoReduction = 0.65; // More aggressive reduction
        micAmplitudeThreshold = 0.85; // Allow louder voices
        break;
      case 'medium':
      default:
        echoThreshold = 0.15; // Balanced sensitivity
        echoReduction = 0.5; // Moderate reduction
        micAmplitudeThreshold = 0.75; // Allow normal voices
        break;
    }
    
    console.log(`🔍 Applying echo cancellation (${this.echoCancellationSensitivity}): threshold=${echoThreshold}, reduction=${echoReduction}, micThreshold=${micAmplitudeThreshold}`);
    
    let echoCount = 0;
    let totalEchoSamples = 0;
    let consecutiveEchoSamples = 0;
    const minConsecutiveEcho = 50; // Minimum consecutive samples to consider it echo
    
    // Auto-detect earphones vs speakers scenario
    let earphonesDetected = false;
    let speakerEchoDetected = false;
    
    // Use manual setting if provided, otherwise auto-detect
    if (this.audioScenario === 'earphones') {
      earphonesDetected = true;
      console.log('🎧 Manual earphones mode selected');
    } else if (this.audioScenario === 'speakers') {
      speakerEchoDetected = true;
      console.log('🔊 Manual speakers mode selected');
    } else {
      // Auto-detect scenario based on patterns
      // Analyze first 1000 samples to detect the scenario
      const analysisSamples = Math.min(1000, maxLength);
      let highSimilarityCount = 0;
      let systemAudioPresent = 0;
      
      for (let i = 0; i < analysisSamples; i++) {
        const micSample = i < micArray.length ? micArray[i] : 0;
        const sysSample = i < sysArray.length ? sysArray[i] : 0;
        
        const micNormalized = micSample / 32767;
        const sysNormalized = sysSample / 32767;
        
        const similarity = Math.abs(micNormalized - sysNormalized);
        const sysAmplitude = Math.abs(sysNormalized);
        
        if (similarity < 0.1) {
          highSimilarityCount++;
        }
        if (sysAmplitude > 0.05) {
          systemAudioPresent++;
        }
      }
      
      const similarityRatio = highSimilarityCount / analysisSamples;
      const systemAudioRatio = systemAudioPresent / analysisSamples;
      
      // Detect scenario based on patterns
      if (similarityRatio < 0.1 && systemAudioRatio > 0.3) {
        // Low similarity + system audio present = likely earphones (no echo)
        earphonesDetected = true;
        console.log('🎧 Earphones detected - minimal echo cancellation needed');
      } else if (similarityRatio > 0.3 && systemAudioRatio > 0.2) {
        // High similarity + system audio = likely speakers (echo present)
        speakerEchoDetected = true;
        console.log('🔊 Speakers detected - aggressive echo cancellation needed');
      } else {
        // Default to balanced approach
        console.log('🤔 Unknown scenario - using balanced echo cancellation');
      }
    }
    
    // Adjust parameters based on detected scenario
    if (earphonesDetected) {
      // With earphones: minimal echo cancellation, preserve voice
      echoThreshold = 0.08; // Very high threshold (only obvious echo)
      echoReduction = 0.2; // Minimal reduction
      micAmplitudeThreshold = 0.9; // Allow all voices
      console.log('🎧 Earphones mode: minimal echo cancellation');
    } else if (speakerEchoDetected) {
      // With speakers: more aggressive echo cancellation
      echoThreshold = 0.2; // Lower threshold (catch more echo)
      echoReduction = Math.min(echoReduction + 0.2, 0.8); // More aggressive
      micAmplitudeThreshold = Math.max(micAmplitudeThreshold - 0.1, 0.6); // Slightly more restrictive
      console.log('🔊 Speakers mode: aggressive echo cancellation');
    }
    
    for (let i = 0; i < maxLength; i++) {
      const micSample = i < micArray.length ? micArray[i] : 0;
      const sysSample = i < sysArray.length ? sysArray[i] : 0;
      
      // Normalize samples to -1 to 1 range for processing
      const micNormalized = micSample / 32767;
      const sysNormalized = sysSample / 32767;
      
      // More sophisticated echo detection
      const similarity = Math.abs(micNormalized - sysNormalized);
      const micAmplitude = Math.abs(micNormalized);
      const sysAmplitude = Math.abs(sysNormalized);
      
      // Echo detection criteria:
      // 1. Samples are very similar (low similarity)
      // 2. System audio has significant amplitude (not silence)
      // 3. Microphone amplitude is not too high (not loud voice)
      // 4. System audio amplitude is higher than microphone (echo pattern)
      const potentialEcho = similarity < echoThreshold && 
                            sysAmplitude > 0.03 && 
                            micAmplitude < micAmplitudeThreshold && 
                            micAmplitude > 0.01 &&
                            sysAmplitude > micAmplitude * 0.8; // System audio should be comparable or louder
      
      let processedMicSample = micNormalized;
      
      if (potentialEcho) {
        consecutiveEchoSamples++;
        
        // Only apply echo reduction if we have enough consecutive echo samples
        if (consecutiveEchoSamples >= minConsecutiveEcho) {
          // Gradual echo reduction based on similarity
          const reductionFactor = (echoThreshold - similarity) / echoThreshold;
          const actualReduction = echoReduction * reductionFactor;
          processedMicSample = micNormalized * (1 - actualReduction);
          
          echoCount++;
          totalEchoSamples++;
          
          // Log echo detection less frequently to avoid spam
          if (echoCount % 1000 === 0) {
            console.log(`🎵 Echo detected at sample ${i}, similarity: ${similarity.toFixed(3)}, reduction: ${actualReduction.toFixed(3)}`);
          }
        }
      } else {
        // Reset consecutive echo count when no echo is detected
        consecutiveEchoSamples = 0;
      }
      
      // Mix the processed microphone audio with system audio
      // Give more weight to system audio since it's cleaner
      const mixedSample = (processedMicSample * 0.4) + (sysNormalized * 0.6);
      
      // Convert back to Int16 and apply clipping protection
      const finalSample = Math.round(mixedSample * 32767);
      mixedArray[i] = Math.max(-32768, Math.min(32767, finalSample));
    }
    
    // Log echo statistics
    const echoPercentage = (totalEchoSamples / maxLength) * 100;
    console.log(`📊 Echo cancellation stats: ${totalEchoSamples} samples processed (${echoPercentage.toFixed(1)}% of total)`);
    
    return Buffer.from(mixedArray.buffer);
  }

  // Legacy method for backward compatibility
  private mixAudioBuffers(micPcm: Buffer, sysPcm: Buffer): Buffer {
    // Convert to Int16 arrays for easier manipulation
    const micArray = new Int16Array(micPcm.buffer, micPcm.byteOffset, micPcm.length / 2);
    const sysArray = new Int16Array(sysPcm.buffer, sysPcm.byteOffset, sysPcm.length / 2);
    
    // Use the longer buffer as the base
    const maxLength = Math.max(micArray.length, sysArray.length);
    const mixedArray = new Int16Array(maxLength);
    
    for (let i = 0; i < maxLength; i++) {
      const micSample = i < micArray.length ? micArray[i] : 0;
      const sysSample = i < sysArray.length ? sysArray[i] : 0;
      
      // Mix samples with normalization to prevent clipping
      const mixedSample = Math.round((micSample + sysSample) / 2);
      mixedArray[i] = Math.max(-32768, Math.min(32767, mixedSample));
    }
    
    return Buffer.from(mixedArray.buffer);
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS - VOICE ECHO CANCELLATION
  // --------------------------------------------------------------------------

  private applyVoiceEchoCancellation(micPcm: Buffer, sysPcm: Buffer): Buffer {
    // Convert to Int16 arrays for easier manipulation
    const micArray = new Int16Array(micPcm.buffer, micPcm.byteOffset, micPcm.length / 2);
    const sysArray = new Int16Array(sysPcm.buffer, sysPcm.byteOffset, sysPcm.length / 2);
    
    // Use the longer buffer as the base
    const maxLength = Math.max(micArray.length, sysArray.length);
    const processedArray = new Int16Array(maxLength);
    
    // Determine voice recording scenario
    let voiceScenario: 'headphones' | 'speakers' = 'headphones';
    
    if (this.voiceRecordingMode === 'auto') {
      // Auto-detect voice recording scenario
      const analysisSamples = Math.min(2000, maxLength);
      let voiceEchoCount = 0;
      let voicePresent = 0;
      
      for (let i = 0; i < analysisSamples; i++) {
        const micSample = i < micArray.length ? micArray[i] : 0;
        const sysSample = i < sysArray.length ? sysArray[i] : 0;
        
        const micNormalized = micSample / 32767;
        const sysNormalized = sysSample / 32767;
        
        const micAmplitude = Math.abs(micNormalized);
        const sysAmplitude = Math.abs(sysNormalized);
        const similarity = Math.abs(micNormalized - sysNormalized);
        
        // Detect voice echo patterns
        if (micAmplitude > 0.1 && sysAmplitude > 0.05 && similarity < 0.15) {
          voiceEchoCount++;
        }
        if (micAmplitude > 0.15) {
          voicePresent++;
        }
      }
      
      const voiceEchoRatio = voiceEchoCount / analysisSamples;
      const voiceRatio = voicePresent / analysisSamples;
      
      if (voiceEchoRatio > 0.1 && voiceRatio > 0.2) {
        voiceScenario = 'speakers';
        console.log('🎤 Voice echo detected - using speakers mode for voice');
      } else {
        voiceScenario = 'headphones';
        console.log('🎧 No voice echo detected - using headphones mode for voice');
      }
    } else {
      voiceScenario = this.voiceRecordingMode;
      console.log(`🎤 Manual voice recording mode: ${voiceScenario}`);
    }
    
    // Apply different strategies based on voice scenario
    if (voiceScenario === 'headphones') {
      // Headphones: No voice echo, preserve voice quality
      console.log('🎧 Headphones voice mode: preserving voice quality');
      
      for (let i = 0; i < maxLength; i++) {
        const micSample = i < micArray.length ? micArray[i] : 0;
        const sysSample = i < sysArray.length ? sysArray[i] : 0;
        
        // With headphones, microphone audio is clean voice
        // Only apply minimal processing to remove any system audio bleed
        const micNormalized = micSample / 32767;
        const sysNormalized = sysSample / 32767;
        
        // Very conservative echo detection for voice
        const similarity = Math.abs(micNormalized - sysNormalized);
        const micAmplitude = Math.abs(micNormalized);
        const sysAmplitude = Math.abs(sysNormalized);
        
        // Only remove obvious system audio bleed, not voice
        const isSystemBleed = similarity < 0.05 && sysAmplitude > 0.1 && micAmplitude < 0.3;
        
        let processedMicSample = micNormalized;
        if (isSystemBleed) {
          // Minimal reduction for system audio bleed
          processedMicSample = micNormalized * 0.8;
        }
        
        // Mix with higher voice priority
        const mixedSample = (processedMicSample * 0.7) + (sysNormalized * 0.3);
        const finalSample = Math.round(mixedSample * 32767);
        processedArray[i] = Math.max(-32768, Math.min(32767, finalSample));
      }
    } else {
      // Speakers: Voice echo present, need aggressive voice echo cancellation
      console.log('🔊 Speakers voice mode: aggressive voice echo cancellation');
      
      for (let i = 0; i < maxLength; i++) {
        const micSample = i < micArray.length ? micArray[i] : 0;
        const sysSample = i < sysArray.length ? sysArray[i] : 0;
        
        const micNormalized = micSample / 32767;
        const sysNormalized = sysSample / 32767;
        
        const similarity = Math.abs(micNormalized - sysNormalized);
        const micAmplitude = Math.abs(micNormalized);
        const sysAmplitude = Math.abs(sysNormalized);
        
        // Voice echo detection: voice that sounds similar to system audio
        const isVoiceEcho = similarity < 0.2 && 
                           sysAmplitude > 0.05 && 
                           micAmplitude > 0.1 && 
                           micAmplitude < 0.8;
        
        let processedMicSample = micNormalized;
        if (isVoiceEcho) {
          // Aggressive voice echo reduction
          const reductionFactor = (0.2 - similarity) / 0.2;
          const voiceEchoReduction = 0.6 * reductionFactor;
          processedMicSample = micNormalized * (1 - voiceEchoReduction);
        }
        
        // Mix with balanced priority
        const mixedSample = (processedMicSample * 0.5) + (sysNormalized * 0.5);
        const finalSample = Math.round(mixedSample * 32767);
        processedArray[i] = Math.max(-32768, Math.min(32767, finalSample));
      }
    }
    
    return Buffer.from(processedArray.buffer);
  }

  // --------------------------------------------------------------------------
  // EXISTING METHODS (keeping for compatibility)
  // --------------------------------------------------------------------------

  async recordAndUploadAudio(window: BrowserWindow, token: string, conversationId: string): Promise<AudioResult | null> {
    try {
      // Start recording
      await this.startRecording();
      
      // Wait for user to stop recording (this will be controlled by the UI)
      // For now, we'll return null and let the UI handle the stop
      return null;
    } catch (error) {
      console.error('Audio recording process failed:', error);
      return null;
    }
  }

  async uploadAudioBuffer(buffer: Buffer, token: string, conversationId: string): Promise<AudioResult | null> {
    try {
      if (!buffer || buffer.length === 0) {
        console.error('No audio buffer to upload');
        return null;
      }

      // Validate that the buffer is a proper WAV file
      if (!this.isValidWavBuffer(buffer)) {
        console.error('Invalid WAV buffer - missing or corrupted WAV header');
        return null;
      }

      const uploadResult = await this.uploadToS3Directly(buffer, token, conversationId);
      if (!uploadResult) return null;

      return { 
        buffer, 
        messageId: uploadResult.messageId,
        audioUrl: uploadResult.audioUrl
      };
    } catch (error) {
      console.error('Audio upload process failed:', error);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // UTILITY METHODS
  // --------------------------------------------------------------------------

  private async convertPcmToWavWithSox(pcmBuffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`Converting PCM to WAV using sox: ${pcmBuffer.length} bytes, ${this.sampleRate}Hz, ${this.channels} channel(s), ${this.bitsPerSample} bits`);
        
        // Create temporary files
        const tempDir = os.tmpdir();
        const timestamp = Date.now();
        const pcmFile = path.join(tempDir, `pcm-${timestamp}.raw`);
        const wavFile = path.join(tempDir, `wav-${timestamp}.wav`);
        
        // Write PCM data to temporary file
        fs.writeFileSync(pcmFile, pcmBuffer);
        
        // Use sox to convert PCM to WAV
        const sox = spawn('sox', [
          '-r', this.sampleRate.toString(),
          '-c', this.channels.toString(),
          '-b', this.bitsPerSample.toString(),
          '-e', 'signed',
          '-t', 'raw',
          pcmFile,
          '-t', 'wav',
          wavFile
        ]);
        
        let stderr = '';
        sox.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        sox.on('close', (code) => {
          try {
            // Clean up temporary PCM file
            fs.unlinkSync(pcmFile);
            
            if (code === 0) {
              // Read the WAV file
              const wavBuffer = fs.readFileSync(wavFile);
              
              // Clean up temporary WAV file
              fs.unlinkSync(wavFile);
              
              console.log(`Successfully converted PCM to WAV: ${pcmBuffer.length} bytes -> ${wavBuffer.length} bytes`);
              resolve(wavBuffer);
            } else {
              console.error(`Sox conversion failed with code ${code}:`, stderr);
              reject(new Error(`Sox conversion failed: ${stderr}`));
            }
          } catch (error) {
            console.error('Error during sox conversion cleanup:', error);
            reject(error);
          }
        });
        
        sox.on('error', (error) => {
          console.error('Sox process error:', error);
          reject(error);
        });
      } catch (error) {
        console.error('Error setting up sox conversion:', error);
        reject(error);
      }
    });
  }

  private convertPcmToWav(pcmBuffer: Buffer): Buffer {
    // WAV file header structure
    const headerSize = 44;
    const dataSize = pcmBuffer.length;
    const fileSize = headerSize + dataSize - 8;
    
    const buffer = Buffer.alloc(headerSize + dataSize);
    
    // RIFF header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(fileSize, 4);
    buffer.write('WAVE', 8);
    
    // fmt chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // fmt chunk size
    buffer.writeUInt16LE(1, 20); // audio format (PCM)
    buffer.writeUInt16LE(this.channels, 22); // number of channels
    buffer.writeUInt32LE(this.sampleRate, 24); // sample rate
    buffer.writeUInt32LE(this.sampleRate * this.channels * this.bitsPerSample / 8, 28); // byte rate
    buffer.writeUInt16LE(this.channels * this.bitsPerSample / 8, 32); // block align
    buffer.writeUInt16LE(this.bitsPerSample, 34); // bits per sample
    
    // data chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    
    // Copy PCM data
    pcmBuffer.copy(buffer, headerSize);
    
    return buffer;
  }

  isValidWavBuffer(buffer: Buffer): boolean {
    if (buffer.length < 44) {
      return false;
    }
    
    // Check for WAV header
    const riff = buffer.toString('ascii', 0, 4);
    const wave = buffer.toString('ascii', 8, 12);
    
    return riff === 'RIFF' && wave === 'WAVE';
  }

  private async uploadToS3Directly(buffer: Buffer, token: string, conversationId: string): Promise<{ messageId: string; audioUrl: string } | null> {
    try {
      // Step 1: Get pre-signed URL from API
      console.log('Getting pre-signed URL for audio...');
      const presignedResponse = await fetch(`${this.baseUrl}/conversations/${conversationId}/messages/get_audio_upload_url`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!presignedResponse.ok) {
        console.error('Failed to get pre-signed URL for audio:', presignedResponse.statusText);
        return null;
      }

      const presignedData = await presignedResponse.json();
      const { upload_url, filename } = presignedData;

      // Step 2: Upload directly to S3 using pre-signed URL
      console.log('Uploading audio to S3...');
      const s3Response = await fetch(upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'audio/wav',
          'Content-Length': buffer.length.toString(),
        },
        body: buffer,
      });

      if (!s3Response.ok) {
        console.error('Failed to upload audio to S3:', s3Response.statusText);
        return null;
      }

      // Step 3: Create message with S3 URL
      console.log('Creating message with S3 audio URL...');
      const s3Url = `https://${process.env.AWS_S3_BUCKET || 'contextor-api'}.s3.amazonaws.com/${filename}`;
      
      const messageResponse = await fetch(`${this.baseUrl}/conversations/${conversationId}/messages/create_audio_from_s3`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          audio_url: s3Url
        }),
      });

      if (!messageResponse.ok) {
        console.error('Failed to create audio message:', messageResponse.statusText);
        return null;
      }

      const messageData = await messageResponse.json();
      const messageId = messageData.data.id;
      
      console.log('Audio uploaded successfully, message ID:', messageId);
      console.log('Audio URL:', s3Url);
      
      return { messageId, audioUrl: s3Url };
    } catch (error) {
      console.error('Failed to upload audio to S3:', error);
      return null;
    }
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  getRecordingStatus(): { isRecording: boolean; bufferSize: number } {
    return {
      isRecording: this.isRecording,
      bufferSize: this.audioChunks.length
    };
  }
} 