import { useState, useRef, useCallback } from 'react';

// ============================================================================
// DUAL AUDIO RECORDER HOOK
// ============================================================================

interface AudioRecorderState {
  isRecording: boolean;
  isMicActive: boolean;
  isSystemAudioActive: boolean;
  recordingDuration: number;
  error: string | null;
}

interface AudioRecorderResult {
  state: AudioRecorderState;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Buffer | null>;
  resetError: () => void;
}

export function useDualAudioRecorder(): AudioRecorderResult {
  // State management
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isMicActive: false,
    isSystemAudioActive: false,
    recordingDuration: 0,
    error: null
  });

  // Refs for tracking
  const recordingStartTime = useRef<number>(0);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  // Update state helper
  const updateState = useCallback((updates: Partial<AudioRecorderState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Reset error
  const resetError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      console.log('🎤 Renderer: Starting dual audio recording...');
      
      updateState({ 
        isRecording: true, 
        isMicActive: true, 
        isSystemAudioActive: true, 
        error: null 
      });

      recordingStartTime.current = Date.now();

      // Start combined audio recording via main process
      const result = await window.api.startCombinedAudioRecording();
      
      if (!result.success) {
        console.error('❌ Main process returned error:', result.error);
        throw new Error(result.error || 'Failed to start recording');
      }

      // Start duration tracking
      durationInterval.current = setInterval(() => {
        const duration = Date.now() - recordingStartTime.current;
        updateState({ recordingDuration: duration });
      }, 100);

      console.log('✅ Renderer: Dual audio recording started successfully');
    } catch (error) {
      console.error('❌ Renderer: Failed to start dual audio recording:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      updateState({ 
        isRecording: false, 
        isMicActive: false, 
        isSystemAudioActive: false, 
        error: error instanceof Error ? error.message : 'Failed to start recording' 
      });
      throw error;
    }
  }, [updateState]);

  // Stop recording
  const stopRecording = useCallback(async (): Promise<Buffer | null> => {
    try {
      // Clear duration interval
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      updateState({ 
        isRecording: false, 
        isMicActive: false, 
        isSystemAudioActive: false 
      });

      // Stop combined audio recording via main process
      const result = await window.api.stopCombinedAudioRecording();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to stop recording');
      }

      console.log('🎤 Dual audio recording stopped successfully');
      return result.buffer || null;
    } catch (error) {
      console.error('Failed to stop dual audio recording:', error);
      updateState({ 
        error: error instanceof Error ? error.message : 'Failed to stop recording' 
      });
      throw error;
    }
  }, [updateState]);

  return {
    state,
    startRecording,
    stopRecording,
    resetError
  };
}
