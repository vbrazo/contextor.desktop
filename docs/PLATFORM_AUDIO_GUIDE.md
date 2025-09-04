# Platform Audio Capture System

This guide explains the new platform-specific audio capture system implemented in Contextor, inspired by the Glass architecture. This system provides robust audio capture across macOS, Windows, and Linux with proper permission handling and echo cancellation.

## 🎯 Overview

The platform audio capture system addresses the challenges of capturing both microphone and system audio across different operating systems while handling platform-specific permission requirements and audio capture limitations.

## 🏗️ Architecture

### Core Components

1. **PlatformAudioService** (`src/helpers/platformAudioService.ts`)
   - Main process service for platform-specific audio capture
   - Handles permission management and system-level audio capture
   - Manages screenshot capture with platform-specific methods

2. **PlatformAudioCapture** (`src/renderer/services/platformAudioCapture.ts`)
   - Renderer process service for real-time audio processing
   - Handles Web Audio API integration and echo cancellation
   - Manages audio chunk collection and processing

3. **PlatformPermissionChecker** (`src/renderer/components/PlatformPermissionChecker.tsx`)
   - Comprehensive permission management UI
   - Platform-specific permission guidance
   - Troubleshooting assistance

## 🖥️ Platform-Specific Implementation

### macOS (🍎)

**Audio Capture:**
- **System Audio**: Uses custom `SystemAudioDump` binary for native system audio capture
- **Microphone**: Standard Web Audio API with getUserMedia()
- **Echo Cancellation**: Custom SimpleAEC algorithm for acoustic echo cancellation

**Permissions:**
- Microphone: System Preferences → Security & Privacy → Privacy → Microphone
- Screen Recording: System Preferences → Security & Privacy → Privacy → Screen Recording

**Features:**
- Native system audio capture via binary executable
- Comprehensive permission management
- Automatic app registration in system preferences

### Windows (🪟)

**Audio Capture:**
- **System Audio**: Native Electron loopback audio via getDisplayMedia()
- **Microphone**: Standard Web Audio API with getUserMedia()
- **Echo Cancellation**: Real-time echo cancellation with system audio reference

**Permissions:**
- Standard browser permissions for media access
- Windows Settings → Privacy → Microphone
- Automatic permission dialogs

**Features:**
- Native loopback audio capture
- Real-time audio processing
- Automatic permission handling

### Linux (🐧)

**Audio Capture:**
- **System Audio**: Limited support (primarily microphone only)
- **Microphone**: Standard Web Audio API with getUserMedia()
- **Echo Cancellation**: Basic echo cancellation (limited by system audio support)

**Permissions:**
- Standard browser permissions
- System-level audio permissions may vary by distribution

**Features:**
- Microphone capture with noise suppression
- Limited system audio support
- Basic echo cancellation

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

The system requires the following dependencies:
- `sharp` - Image processing for screenshots
- `electron-audio-loopback` - System audio capture (Windows)
- Platform-specific binaries (macOS)

### 2. Platform Setup

#### macOS Setup

1. **Install SystemAudioDump Binary**
   ```bash
   # Copy the SystemAudioDump binary to the assets folder
   cp path/to/SystemAudioDump src/assets/
   chmod +x src/assets/SystemAudioDump
   ```

2. **Grant Permissions**
   - Run the app and follow the permission prompts
   - Grant microphone and screen recording permissions in System Preferences

#### Windows Setup

1. **No additional setup required**
   - Permissions are handled automatically
   - Native loopback audio is supported out of the box

#### Linux Setup

1. **Install Audio Dependencies**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install sox pulseaudio-utils
   
   # Fedora
   sudo dnf install sox pulseaudio-utils
   ```

### 3. Usage

#### Basic Usage

```typescript
import { PlatformAudioCapture } from './services/platformAudioCapture';

const audioCapture = new PlatformAudioCapture();

// Start recording with 5-second screenshot intervals
const result = await audioCapture.startCapture(5, 'medium');

if (result.success) {
  console.log('Recording started successfully');
  
  // Stop recording after some time
  const stopResult = await audioCapture.stopCapture();
  
  if (stopResult.success && stopResult.audioChunks) {
    console.log(`Captured ${stopResult.audioChunks.length} audio chunks`);
  }
}
```

#### Manual Screenshot Capture

```typescript
// Capture a manual screenshot
const screenshotResult = await audioCapture.captureManualScreenshot('high');

if (screenshotResult.success) {
  console.log('Screenshot captured:', screenshotResult.base64);
}
```

#### Permission Management

```typescript
import { PlatformPermissionChecker } from './components/PlatformPermissionChecker';

// Use the permission checker component
<PlatformPermissionChecker
  onPermissionsReady={() => console.log('Permissions ready')}
  onPermissionsError={(error) => console.error('Permission error:', error)}
/>
```

## 🔧 Configuration

### Audio Configuration

```typescript
// Default audio configuration
const config = {
  sampleRate: 24000,        // Audio sample rate
  channels: 1,              // Mono audio
  bitsPerSample: 16,        // 16-bit audio
  chunkDuration: 0.1,       // 100ms audio chunks
  enableEchoCancellation: true,
  echoCancellationSensitivity: 'medium'
};
```

### Screenshot Configuration

```typescript
// Screenshot quality options
type ScreenshotQuality = 'low' | 'medium' | 'high';

// Quality mapping
const qualityMap = {
  low: { jpegQuality: 60, height: 384 },
  medium: { jpegQuality: 80, height: 384 },
  high: { jpegQuality: 90, height: 384 }
};
```

## 🎵 Audio Processing Pipeline

### 1. Audio Capture
- Platform-specific audio capture initiation
- Permission verification
- Stream setup and configuration

### 2. Real-time Processing
- Audio chunking (100ms intervals)
- Format conversion (Float32 → Int16)
- Base64 encoding for transmission

### 3. Echo Cancellation
- System audio reference collection
- Voice activity detection
- Adaptive echo cancellation algorithm

### 4. Data Collection
- Audio chunk storage with metadata
- Timestamp tracking
- Source identification (microphone/system)

## 🛠️ Troubleshooting

### Common Issues

#### macOS Issues

**"SystemAudioDump not found"**
```bash
# Ensure the binary is in the correct location
ls -la src/assets/SystemAudioDump
chmod +x src/assets/SystemAudioDump
```

**Permission Denied**
- Go to System Preferences → Security & Privacy → Privacy
- Add Contextor to Microphone and Screen Recording lists
- Restart the app

#### Windows Issues

**No Audio in Loopback**
- Ensure system audio is playing
- Check Windows audio settings
- Verify microphone permissions

**Permission Errors**
- Check Windows Settings → Privacy → Microphone
- Allow app access when prompted

#### Linux Issues

**Sox Not Found**
```bash
# Install sox
sudo apt-get install sox  # Ubuntu/Debian
sudo dnf install sox      # Fedora
```

**Audio Device Issues**
```bash
# Check audio devices
pactl list short sources
pactl list short sinks
```

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
DEBUG=platform-audio npm start
```

## 📊 Performance Considerations

### Audio Quality vs Performance

- **Sample Rate**: 24kHz provides good quality with reasonable performance
- **Chunk Size**: 100ms chunks balance latency and processing overhead
- **Echo Cancellation**: Adaptive algorithm reduces CPU usage during silence

### Memory Management

- Audio chunks are collected in memory during recording
- Automatic cleanup on recording stop
- Configurable buffer sizes for system audio reference

### Platform Differences

- **macOS**: Most efficient with native binary
- **Windows**: Good performance with native loopback
- **Linux**: Limited by system audio support

## 🔮 Future Enhancements

### Planned Features

1. **Advanced Echo Cancellation**
   - Machine learning-based echo cancellation
   - Multi-channel audio support

2. **Audio Compression**
   - Real-time audio compression
   - Adaptive bitrate adjustment

3. **Cross-platform System Audio**
   - Improved Linux system audio support
   - Universal audio capture methods

4. **AI Integration**
   - Real-time speech recognition
   - Audio content analysis

## 📝 API Reference

### PlatformAudioCapture

#### Methods

- `startCapture(interval: number, quality: string): Promise<Result>`
- `stopCapture(): Promise<Result>`
- `captureManualScreenshot(quality: string): Promise<Result>`
- `getState(): AudioCaptureState`

#### Events

- `onAudioChunk(chunk: AudioChunk)`
- `onError(error: string)`
- `onStateChange(state: AudioCaptureState)`

### PlatformAudioService

#### Methods

- `checkSystemPermissions(): Promise<PermissionStatus>`
- `requestMicrophonePermission(): Promise<Result>`
- `openSystemPreferences(section: string): Promise<Result>`
- `startAudioCapture(): Promise<Result>`
- `stopAudioCapture(): Promise<Result>`

## 🤝 Contributing

When contributing to the platform audio capture system:

1. **Test on all platforms** (macOS, Windows, Linux)
2. **Follow platform-specific best practices**
3. **Update documentation** for any new features
4. **Add comprehensive error handling**
5. **Include performance benchmarks**

## 📄 License

This platform audio capture system is part of the Contextor project and follows the same licensing terms. 