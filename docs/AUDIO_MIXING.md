# Audio Mixing Feature

This document explains the enhanced audio mixing functionality in the Contextor desktop application.

## Overview

The audio mixing feature captures both microphone and system audio simultaneously, mixes them together, and processes the combined audio through AI analysis.

## How It Works

### 1. Audio Capture
- **Microphone**: Captured using `node-record-lpcm16` at 16kHz, mono, 16-bit
- **System Audio**: Captured using `electron-audio-loopback` at 48kHz, mono, 32-bit float
- **Synchronization**: Both streams are captured simultaneously and synchronized

### 2. Audio Processing
- **Format Conversion**: System audio is converted from Float32 to Int16
- **Resampling**: System audio is resampled from 48kHz to 16kHz (simple decimation)
- **Mixing**: Audio streams are mixed with normalization to prevent clipping
- **WAV Output**: Combined audio is converted to WAV format for upload

### 3. AI Processing
- **Upload**: Combined audio is uploaded to S3
- **Analysis**: AI processes the audio and provides transcription/analysis
- **Response**: Results are displayed in the conversation interface

## Technical Implementation

### Main Process (`src/helpers/audioService.ts`)

```typescript
// Start combined recording
async startRecording(): Promise<void> {
  await this.startMicrophoneRecording();
  await this.startSystemAudioRecording();
}

// Stop and mix audio
async stopRecording(): Promise<Buffer | null> {
  const microphoneBuffer = await this.stopMicrophoneRecording();
  const systemAudioBuffer = await this.stopSystemAudioRecording();
  return await this.combineAudioBuffers(microphoneBuffer, systemAudioBuffer);
}
```

### Audio Mixing Algorithm

```typescript
private mixAudioBuffers(micPcm: Buffer, sysPcm: Buffer): Buffer {
  const micArray = new Int16Array(micPcm.buffer, micPcm.byteOffset, micPcm.length / 2);
  const sysArray = new Int16Array(sysPcm.buffer, sysPcm.byteOffset, sysPcm.length / 2);
  
  const maxLength = Math.max(micArray.length, sysArray.length);
  const mixedArray = new Int16Array(maxLength);
  
  for (let i = 0; i < maxLength; i++) {
    const micSample = i < micArray.length ? micArray[i] : 0;
    const sysSample = i < sysArray.length ? sysArray[i] : 0;
    
    // Mix with normalization
    const mixedSample = Math.round((micSample + sysSample) / 2);
    mixedArray[i] = Math.max(-32768, Math.min(32767, mixedSample));
  }
  
  return Buffer.from(mixedArray.buffer);
}
```

### IPC Communication

```typescript
// Main process handlers
ipcMain.handle('start-combined-audio-recording', async () => {
  await this.audioService.startRecording();
  return { success: true };
});

ipcMain.handle('stop-combined-audio-recording', async () => {
  const buffer = await this.audioService.stopRecording();
  await this.processCombinedAudioBuffer(buffer);
  return { success: true, buffer };
});
```

## Usage

### 1. Start Recording
Click the microphone button in the app to start recording both microphone and system audio.

### 2. Speak and Play Audio
- Speak into your microphone
- Play any system audio (music, videos, etc.)
- Both will be captured and mixed together

### 3. Stop Recording
Click the microphone button again to stop recording and process the audio.

### 4. View Results
The AI will analyze the combined audio and provide:
- Transcription of speech
- Analysis of audio content
- Context-aware responses

## Requirements

### Dependencies
- `electron-audio-loopback`: System audio capture
- `node-record-lpcm16`: Microphone recording
- `sox`: Audio format conversion

### Permissions
- **Microphone**: Required for voice capture
- **System Audio**: Required for system audio capture
- **Accessibility** (macOS): May be required for system audio

### Installation
```bash
# Install sox (audio conversion tool)
brew install sox  # macOS
apt-get install sox  # Linux

# Install dependencies
npm install
```

## Testing

Run the audio mixing test:
```bash
npm run test:audio
```

This will check:
- Required dependencies are available
- Audio tools are properly installed
- Permissions are configured

## Troubleshooting

### Common Issues

1. **No System Audio Captured**
   - Check system audio permissions
   - Ensure audio is playing during recording
   - Verify `electron-audio-loopback` is working

2. **Microphone Not Working**
   - Check microphone permissions
   - Verify `node-record-lpcm16` is installed
   - Test with `sox` command line tools

3. **Audio Mixing Issues**
   - Check console logs for mixing errors
   - Verify audio format compatibility
   - Ensure proper buffer handling

### Debug Logs

Enable debug logging by checking the console for:
- `Starting combined audio recording...`
- `Microphone recording started`
- `System audio recording started successfully`
- `Mixing microphone and system audio...`
- `Audio mixing completed`

## Performance Considerations

- **Memory Usage**: Audio buffers are processed in chunks to minimize memory usage
- **CPU Usage**: Audio mixing is done efficiently with minimal CPU overhead
- **Latency**: Minimal latency between capture and processing
- **Quality**: High-quality audio mixing with proper normalization

## Future Enhancements

- **Stereo Support**: Add support for stereo audio mixing
- **Advanced Mixing**: Implement more sophisticated mixing algorithms
- **Real-time Processing**: Add real-time audio effects and processing
- **Multiple Sources**: Support for multiple audio input sources 