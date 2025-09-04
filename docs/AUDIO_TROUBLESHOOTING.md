# Audio Recording Troubleshooting Guide

This guide helps you diagnose and fix common audio recording issues in the Contextor desktop application.

## 🚨 Quick Diagnosis

### 1. Run the Audio Test
```bash
npm run test:audio
```

This will check:
- ✅ Required dependencies (sox, electron-audio-loopback)
- ✅ System permissions
- ✅ Audio tools availability

### 2. Check Console Logs
Look for these specific log messages:

**Success Messages:**
- `✅ Sox is available`
- `✅ electron-audio-loopback is available`
- `✅ Microphone permission granted`
- `✅ System audio recording started successfully`

**Error Messages:**
- `❌ Sox not available`
- `❌ Microphone permission denied`
- `❌ System audio permission denied`

## 🔧 Common Issues & Solutions

### Issue 1: "Sox audio tool not found"

**Symptoms:**
- Error: "Sox audio tool not found"
- Audio recording fails immediately

**Solutions:**

**macOS:**
```bash
# Install sox using Homebrew
brew install sox

# Verify installation
sox --version
```

**Linux (Ubuntu/Debian):**
```bash
# Install sox
sudo apt-get update
sudo apt-get install sox

# Verify installation
sox --version
```

**Linux (Fedora/RHEL):**
```bash
# Install sox
sudo dnf install sox

# Verify installation
sox --version
```

**Windows:**
1. Download sox from http://sox.sourceforge.net/
2. Extract to a folder (e.g., `C:\sox`)
3. Add `C:\sox` to your PATH environment variable
4. Restart your terminal/IDE

### Issue 2: "Microphone permission denied"

**Symptoms:**
- Error: "Microphone permission denied"
- No audio captured from microphone

**Solutions:**

**macOS:**
1. Go to **System Preferences > Privacy & Security > Microphone**
2. Find your app (may be listed as "Electron", "node", or "Contextor")
3. Check the box to allow microphone access
4. **Restart the app completely**

**Linux:**
```bash
# Check if pulseaudio is running
pulseaudio --check

# If not running, start it
pulseaudio --start

# Check microphone devices
pactl list short sources
```

**Windows:**
1. Go to **Settings > Privacy & Security > Microphone**
2. Ensure "Microphone access" is turned On
3. Check that your app has permission

### Issue 3: "System audio permission denied"

**Symptoms:**
- Error: "System audio permission denied"
- Only microphone audio is captured

**Solutions:**

**macOS:**
1. Go to **System Preferences > Privacy & Security > Accessibility**
2. Find your app and check the box
3. **Restart the app completely**
4. If the app isn't listed, try running it once first

**Linux:**
```bash
# Check if pulseaudio loopback is available
pactl list modules | grep module-loopback

# If not available, load it
pactl load-module module-loopback
```

**Windows:**
- System audio capture typically works without additional permissions
- Ensure you have audio playing during recording

### Issue 4: "electron-audio-loopback not installed"

**Symptoms:**
- Error: "electron-audio-loopback not installed"
- System audio capture fails

**Solutions:**

```bash
# Install the package
npm install electron-audio-loopback

# Rebuild for your Electron version
npm run rebuild

# Or if using yarn
yarn add electron-audio-loopback
yarn electron-rebuild
```

### Issue 5: "No audio recorded or recording was too short"

**Symptoms:**
- Recording starts but no audio data is captured
- Buffer size is 0 or very small

**Solutions:**

1. **Check microphone input:**
   - Speak louder or move closer to microphone
   - Check microphone volume in system settings
   - Test with another application

2. **Check system audio:**
   - Ensure audio is actually playing during recording
   - Try playing music or a video
   - Check system volume

3. **Minimum recording duration:**
   - Record for at least 0.5 seconds
   - The system has a minimum duration requirement

### Issue 6: "High CPU usage during recording"

**Symptoms:**
- App becomes slow during recording
- High CPU usage in Activity Monitor/Task Manager

**Solutions:**

1. **Reduce audio quality:**
   - Modify sample rate in `audioService.ts`
   - Change from 48kHz to 16kHz for system audio

2. **Optimize buffer sizes:**
   - Increase buffer size to reduce processing frequency
   - Adjust chunk sizes in the audio service

3. **Close other audio applications:**
   - Other apps using audio may cause conflicts

## 🔍 Advanced Debugging

### Enable Verbose Logging

The audio service now includes detailed logging. Check the console for:

```
🎤 Starting microphone recording...
📊 Audio config: { sampleRate: 16000, channels: 1, bitsPerSample: 16 }
✅ Sox is available
🎤 Microphone chunk received: 1024 bytes
🔊 System audio chunk received: 2048 bytes
```

### Check Audio Devices

**macOS:**
```bash
# List audio devices
system_profiler SPAudioDataType

# Check audio permissions
tccutil query Microphone
```

**Linux:**
```bash
# List audio devices
pactl list short sources
pactl list short sinks

# Check audio status
pactl info
```

**Windows:**
```powershell
# List audio devices
Get-WmiObject -Class Win32_SoundDevice
```

### Test Individual Components

1. **Test Microphone Only:**
   ```javascript
   // In browser console
   navigator.mediaDevices.getUserMedia({ audio: true })
     .then(stream => {
       console.log('Microphone access granted');
       stream.getTracks().forEach(track => track.stop());
     })
     .catch(error => {
       console.error('Microphone access failed:', error);
     });
   ```

2. **Test Sox:**
   ```bash
   # Test sox recording
   sox -d test.wav trim 0 5
   # This records 5 seconds of audio to test.wav
   ```

3. **Test System Audio:**
   ```bash
   # On macOS, test system audio capture
   sox -t coreaudio "default" test.wav trim 0 5
   ```

## 🛠️ Manual Permission Fixes

### macOS Permission Reset

If permissions are stuck, reset them:

```bash
# Reset microphone permissions
sudo tccutil reset Microphone

# Reset accessibility permissions
sudo tccutil reset Accessibility

# Restart the app
```

### Linux Audio Setup

```bash
# Install pulseaudio if not present
sudo apt-get install pulseaudio

# Start pulseaudio
pulseaudio --start

# Load loopback module
pactl load-module module-loopback

# Check audio devices
pactl list short sources
```

### Windows Audio Troubleshooting

1. **Update audio drivers**
2. **Check Windows audio settings**
3. **Run audio troubleshooter:**
   - Settings > Update & Security > Troubleshoot > Playing Audio

## 📱 Platform-Specific Issues

### macOS Catalina+ (10.15+)

- **Hardened Runtime**: May require additional entitlements
- **Notarization**: Packaged apps need to be notarized
- **Privacy**: Stricter permission requirements

### macOS Big Sur+ (11.0+)

- **Privacy**: Additional permission prompts
- **Security**: Enhanced security features may block audio access

### Linux (Various Distributions)

- **PulseAudio vs ALSA**: Different audio systems
- **Permissions**: May need to add user to audio group
- **Real-time scheduling**: May need `rtprio` limits

### Windows 10/11

- **Privacy settings**: Enhanced privacy controls
- **Audio drivers**: Ensure up-to-date drivers
- **Antivirus**: May block audio access

## 🚀 Performance Optimization

### Reduce Latency

1. **Smaller buffer sizes** (but may increase CPU usage)
2. **Lower sample rates** (16kHz instead of 48kHz)
3. **Disable audio processing** during recording

### Reduce CPU Usage

1. **Larger buffer sizes**
2. **Higher sample rates** (less processing)
3. **Disable verbose logging** in production

### Memory Optimization

1. **Process audio in chunks**
2. **Release audio buffers** after processing
3. **Limit recording duration**

## 📞 Getting Help

If you're still experiencing issues:

1. **Collect debug information:**
   ```bash
   # Run the test script
   npm run test:audio
   
   # Check console logs
   # Look for error messages with ❌ emoji
   ```

2. **System information:**
   - Operating system and version
   - Electron version
   - Node.js version
   - Audio hardware details

3. **Error logs:**
   - Copy all console output
   - Include any error messages
   - Note the exact steps to reproduce

4. **Contact support** with:
   - Debug output
   - System information
   - Steps to reproduce
   - Expected vs actual behavior

## 🎯 Quick Fix Checklist

- [ ] Install sox: `brew install sox` (macOS) or `apt-get install sox` (Linux)
- [ ] Grant microphone permission in system settings
- [ ] Grant accessibility permission (macOS)
- [ ] Install electron-audio-loopback: `npm install electron-audio-loopback`
- [ ] Restart the app completely
- [ ] Ensure audio is playing during recording
- [ ] Check console for specific error messages
- [ ] Run `npm run test:audio` for system check

Most audio recording issues can be resolved by following this checklist! 