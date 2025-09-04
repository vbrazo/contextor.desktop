// ============================================================================
// SYSTEM AUDIO SERVICE
// ============================================================================

export interface SystemAudioResult {
  buffer: ArrayBuffer;
  duration: number;
  sampleRate: number;
}

export class SystemAudioService {
  private systemAudioStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isRecording: boolean = false;
  private recordingStartTime: number = 0;

  // --------------------------------------------------------------------------
  // PUBLIC METHODS
  // --------------------------------------------------------------------------

  async startSystemAudioRecording(): Promise<void> {
    if (this.isRecording) {
      console.log('System audio already recording, stopping current recording');
      await this.stopSystemAudioRecording();
    }

    try {
      console.log('Starting system audio recording...');
      
      // Enable system audio loopback
      await (window as any).api.enableSystemAudioLoopback();
      
      // Get system audio stream using getDisplayMedia
      this.systemAudioStream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true,
        audio: true,
      });
      
      // Remove video tracks (we only want audio)
      const videoTracks = this.systemAudioStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.stop();
        this.systemAudioStream!.removeTrack(track);
      });

      // Create MediaRecorder for system audio
      this.mediaRecorder = new MediaRecorder(this.systemAudioStream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.audioChunks = [];
      this.isRecording = true;
      this.recordingStartTime = Date.now();

      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        console.log('System audio recording stopped');
        this.isRecording = false;
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('System audio recording error:', event);
        this.isRecording = false;
      };

      // Start recording
      this.mediaRecorder.start(1000); // Collect data every second
      console.log('System audio recording started successfully');
      
      // Notify main process
      (window as any).api.notifySystemAudioStarted();
    } catch (error) {
      console.error('Failed to start system audio recording:', error);
      this.isRecording = false;
      throw error;
    }
  }

  async stopSystemAudioRecording(): Promise<SystemAudioResult | null> {
    if (!this.isRecording || !this.mediaRecorder) {
      console.log('No active system audio recording to stop');
      return null;
    }

    try {
      console.log('Stopping system audio recording...');
      
      // Stop the MediaRecorder
      this.mediaRecorder.stop();
      
      // Wait for the ondataavailable events to complete
      await new Promise<void>((resolve) => {
        if (this.mediaRecorder) {
          this.mediaRecorder.onstop = () => {
            console.log('System audio MediaRecorder stopped');
            resolve();
          };
        } else {
          resolve();
        }
      });

      // Stop all tracks
      if (this.systemAudioStream) {
        this.systemAudioStream.getTracks().forEach(track => track.stop());
        this.systemAudioStream = null;
      }

      // Disable system audio loopback
      await (window as any).api.disableSystemAudioLoopback();

      this.isRecording = false;
      const recordingDuration = Date.now() - this.recordingStartTime;

      if (this.audioChunks.length === 0) {
        console.log('No system audio data recorded');
        return null;
      }

      // Combine all audio chunks
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      this.audioChunks = [];

      // Convert blob to ArrayBuffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      console.log(`System audio recording stopped, duration: ${recordingDuration}ms, size: ${arrayBuffer.byteLength} bytes`);
      
      // Notify main process
      (window as any).api.notifySystemAudioStopped({
        buffer: arrayBuffer,
        duration: recordingDuration,
        sampleRate: 48000
      });
      
      return {
        buffer: arrayBuffer,
        duration: recordingDuration,
        sampleRate: 48000 // WebM Opus typically uses 48kHz
      };
    } catch (error) {
      console.error('Failed to stop system audio recording:', error);
      this.isRecording = false;
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // UTILITY METHODS
  // --------------------------------------------------------------------------

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  getRecordingStatus(): { isRecording: boolean; chunksCount: number } {
    return {
      isRecording: this.isRecording,
      chunksCount: this.audioChunks.length
    };
  }

  // Convert WebM audio to WAV format (if needed)
  async convertWebmToWav(webmBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    try {
      // Create an AudioContext to process the audio
      const audioContext = new AudioContext();
      
      // Decode the WebM audio
      const audioBuffer = await audioContext.decodeAudioData(webmBuffer);
      
      // Get the audio data
      const channelData = audioBuffer.getChannelData(0); // Mono
      const sampleRate = audioBuffer.sampleRate;
      const length = channelData.length;
      
      // Create WAV file
      const wavBuffer = new ArrayBuffer(44 + length * 2); // 44 bytes header + 16-bit samples
      const view = new DataView(wavBuffer);
      
      // WAV header
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };
      
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + length * 2, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(36, 'data');
      view.setUint32(40, length * 2, true);
      
      // Convert float samples to 16-bit integers
      for (let i = 0; i < length; i++) {
        const sample = Math.max(-1, Math.min(1, channelData[i]));
        view.setInt16(44 + i * 2, sample * 0x7FFF, true);
      }
      
      return wavBuffer;
    } catch (error) {
      console.error('Failed to convert WebM to WAV:', error);
      throw error;
    }
  }
} 