# Audio Integration Guide

This guide explains how to integrate the enhanced dual audio recording system into your existing Contextor application.

## 🎯 Quick Start

### 1. Test the Current Implementation
```bash
# Run the audio mixing test
npm run test:audio

# Start the development server
npm run dev
```

### 2. Try the Demo Component
To test the full audio recorder experience, temporarily replace your main App content:

```tsx
// In src/renderer/App.tsx
import { AudioRecorderDemo } from './components/AudioRecorderDemo';

// Replace the main return statement with:
return <AudioRecorderDemo />;
```

## 🔧 Integration Options

### Option 1: Use the AudioRecorder Component (Recommended)

The `AudioRecorder` component provides a complete, polished recording experience:

```tsx
import { AudioRecorder } from './components/AudioRecorder';

function MyComponent() {
  const handleRecordingComplete = async (buffer: Buffer) => {
    // Handle the recorded audio buffer
    console.log('Recording completed:', buffer.length, 'bytes');
    
    // Upload to your server, process with AI, etc.
  };

  const handleRecordingError = (error: string) => {
    console.error('Recording failed:', error);
  };

  return (
    <AudioRecorder
      onRecordingComplete={handleRecordingComplete}
      onError={handleRecordingError}
      disabled={false}
    />
  );
}
```

### Option 2: Use the useDualAudioRecorder Hook

For more control, use the hook directly:

```tsx
import { useDualAudioRecorder } from './hooks/useDualAudioRecorder';

function MyComponent() {
  const { state, startRecording, stopRecording, resetError } = useDualAudioRecorder();

  const handleStart = async () => {
    try {
      await startRecording();
      console.log('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const handleStop = async () => {
    try {
      const buffer = await stopRecording();
      if (buffer) {
        console.log('Recording completed:', buffer.length, 'bytes');
        // Process the buffer
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  };

  return (
    <div>
      <button onClick={handleStart} disabled={state.isRecording}>
        Start Recording
      </button>
      <button onClick={handleStop} disabled={!state.isRecording}>
        Stop Recording
      </button>
      {state.isRecording && (
        <div>Recording... {Math.floor(state.recordingDuration / 1000)}s</div>
      )}
    </div>
  );
}
```

### Option 3: Direct IPC Calls

For maximum control, use the IPC methods directly:

```tsx
const handleRecording = async () => {
  try {
    // Start recording
    const startResult = await window.api.startCombinedAudioRecording();
    if (!startResult.success) {
      throw new Error(startResult.error);
    }

    // ... wait for user to stop ...

    // Stop recording
    const stopResult = await window.api.stopCombinedAudioRecording();
    if (!stopResult.success) {
      throw new Error(stopResult.error);
    }

    if (stopResult.buffer) {
      // Process the audio buffer
      console.log('Audio recorded:', stopResult.buffer.length, 'bytes');
    }
  } catch (error) {
    console.error('Recording failed:', error);
  }
};
```

## 🎨 Customization

### Styling the AudioRecorder Component

The component uses the design system styles. You can customize it by:

1. **Modifying the design system** (`src/renderer/design-system/styles.ts`):
```tsx
// Add custom styles
recordButton: {
  // Your custom styles
  background: 'your-gradient',
  borderRadius: 'your-radius',
  // ... other properties
} as CSSProperties,
```

2. **Using CSS classes** (`src/renderer/app-drag.css`):
```css
.audio-recorder {
  /* Your custom styles */
}

.record-button {
  /* Your custom button styles */
}
```

3. **Inline styles**:
```tsx
<AudioRecorder
  className="my-custom-audio-recorder"
  style={{ /* your styles */ }}
/>
```

### Customizing the Hook

The `useDualAudioRecorder` hook is fully customizable:

```tsx
// You can modify the state structure
interface CustomAudioState {
  isRecording: boolean;
  recordingDuration: number;
  error: string | null;
  // Add your custom properties
  customProperty: string;
}

// Or extend the hook functionality
const useCustomAudioRecorder = () => {
  const baseHook = useDualAudioRecorder();
  
  // Add your custom logic
  const customStartRecording = async () => {
    // Your custom pre-recording logic
    await baseHook.startRecording();
    // Your custom post-recording logic
  };

  return {
    ...baseHook,
    customStartRecording,
  };
};
```

## 🔄 Integration with Existing Features

### With Chat System

```tsx
const handleRecordingComplete = async (buffer: Buffer) => {
  try {
    // Get authentication token
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setInsights('Please log in to use AI features.');
      return;
    }

    // Ensure conversation exists
    const conversationId = await ensureConversation();
    if (!conversationId) {
      setInsights('Failed to create conversation.');
      return;
    }

    // Upload and process audio
    setLoadingMessage('Processing audio...');
    const audioResult = await uploadAudioBuffer(buffer, token, conversationId);
    
    if (audioResult) {
      setLoadingMessage('Analyzing with AI...');
      const aiAnalysis = await getAudioAnalysis(audioResult.audioUrl, conversationId, audioResult.messageId);
      setInsights(aiAnalysis);
    }
  } catch (error) {
    console.error('Failed to process audio:', error);
    setInsights('Failed to process audio. Please try again.');
  }
};
```

### With Screenshot System

```tsx
// Combine audio with screenshots
const handleCombinedCapture = async () => {
  // Take screenshot
  const screenshotResult = await takeScreenshot();
  
  // Start audio recording
  await startRecording();
  
  // ... user speaks while viewing screenshot ...
  
  // Stop recording
  const audioBuffer = await stopRecording();
  
  // Process both together
  await processCombinedContent(screenshotResult, audioBuffer);
};
```

## 🐛 Troubleshooting

### Common Issues

1. **"electron-audio-loopback is not available"**
   ```bash
   npm install electron-audio-loopback
   ```

2. **"sox is not available"**
   ```bash
   # macOS
   brew install sox
   
   # Linux
   sudo apt-get install sox
   
   # Windows
   # Download from http://sox.sourceforge.net/
   ```

3. **Permission Denied**
   - Check microphone permissions in system settings
   - On macOS, check Accessibility permissions for system audio

4. **No System Audio Captured**
   - Ensure audio is playing during recording
   - Check system audio permissions
   - Verify `electron-audio-loopback` is working

### Debug Mode

Enable debug logging by checking the console for:
- `Starting combined audio recording...`
- `Microphone recording started`
- `System audio recording started successfully`
- `Mixing microphone and system audio...`
- `Audio mixing completed`

### Performance Issues

- **High CPU Usage**: Reduce audio quality or buffer size
- **Memory Issues**: Process audio in smaller chunks
- **Latency**: Adjust buffer sizes in the audio service

## 🚀 Advanced Features

### Real-time Audio Processing

```tsx
// Add real-time audio effects
const useAudioEffects = () => {
  const [effects, setEffects] = useState({
    noiseReduction: true,
    echo: false,
    compression: true,
  });

  const applyEffects = (audioBuffer: Buffer) => {
    // Apply audio effects
    return processedBuffer;
  };

  return { effects, setEffects, applyEffects };
};
```

### Multiple Audio Sources

```tsx
// Support for multiple microphones
const useMultiSourceAudio = () => {
  const [sources, setSources] = useState({
    microphone1: true,
    microphone2: false,
    systemAudio: true,
  });

  // Handle multiple audio streams
};
```

### Audio Visualization

```tsx
// Add audio waveform visualization
const AudioVisualizer = ({ audioBuffer }: { audioBuffer: Buffer }) => {
  // Create canvas-based waveform visualization
  return <canvas ref={canvasRef} />;
};
```

## 📚 API Reference

### AudioRecorder Props

| Prop | Type | Description |
|------|------|-------------|
| `onRecordingComplete` | `(buffer: Buffer) => void` | Called when recording completes |
| `onError` | `(error: string) => void` | Called when an error occurs |
| `disabled` | `boolean` | Disables the recorder |
| `className` | `string` | Additional CSS class |

### useDualAudioRecorder Return

| Property | Type | Description |
|----------|------|-------------|
| `state.isRecording` | `boolean` | Whether currently recording |
| `state.isMicActive` | `boolean` | Microphone status |
| `state.isSystemAudioActive` | `boolean` | System audio status |
| `state.recordingDuration` | `number` | Recording duration in ms |
| `state.error` | `string \| null` | Current error message |
| `startRecording` | `() => Promise<void>` | Start recording |
| `stopRecording` | `() => Promise<Buffer \| null>` | Stop recording |
| `resetError` | `() => void` | Clear error state |

### IPC Methods

| Method | Description |
|--------|-------------|
| `startCombinedAudioRecording()` | Start dual audio recording |
| `stopCombinedAudioRecording()` | Stop and return audio buffer |

## 🎉 Next Steps

1. **Test the demo** to see the full functionality
2. **Integrate into your app** using one of the options above
3. **Customize the styling** to match your design
4. **Add advanced features** like real-time processing
5. **Optimize performance** for your use case

The enhanced audio recording system is now ready to provide a rich, contextual AI experience that captures both user speech and system audio for better understanding and analysis! 