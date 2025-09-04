# Audio Recording Debug Guide

## Issues Fixed

The audio recording issues have been addressed with the following improvements:

### 1. **Proper WAV Header Generation**
- Raw PCM audio data is now properly converted to WAV format with correct headers
- Audio files are now playable in standard media players

### 2. **Better Error Handling**
- Minimum recording duration check (0.5 seconds)
- Validation of WAV file integrity
- More specific error messages for different failure scenarios

### 3. **Enhanced Debugging**
- Debug audio files are saved locally in development mode
- Detailed logging of audio conversion process
- Buffer size validation and reporting

## Testing Audio Recording

### Option 1: Use the Test Script

1. **Build the project:**
   ```bash
   npm run build:main
   ```

2. **Run the audio test:**
   ```bash
   node test-audio.js
   ```

3. **Check the output:**
   - The script will record for 3 seconds
   - It will save a test file to your temp directory
   - You can play the saved file to verify audio quality

### Option 2: Test in the App

1. **Start the app in development mode:**
   ```bash
   npm run dev
   ```

2. **Record audio:**
   - Click the microphone button
   - Speak for at least 0.5 seconds
   - Click again to stop recording

3. **Check debug files:**
   - Debug audio files are saved to: `~/tmp/contextor-audio-debug/`
   - Test files are saved to: `~/tmp/contextor-audio-test/`

## Common Issues and Solutions

### Issue: "No audio recorded or recording was too short"
**Solution:** Speak for at least 0.5 seconds when recording

### Issue: "No audio data captured"
**Solution:** 
1. Check microphone permissions in system settings
2. Ensure microphone is not muted
3. Try a different microphone if available

### Issue: "Invalid WAV buffer - missing or corrupted WAV header"
**Solution:** This should be fixed with the new WAV header generation. If it persists:
1. Check console logs for detailed error information
2. Verify the audio service is properly initialized

### Issue: Audio plays but sounds distorted
**Solution:**
1. Check microphone input levels
2. Ensure no audio processing is applied to the input
3. Try recording in a quieter environment

## Debug Information

### Console Logs to Look For

When recording audio, you should see logs like:
```
Starting audio recording...
Audio recording started successfully
Stopping audio recording...
Converting PCM to WAV: 32000 bytes, 16000Hz, 1 channel(s), 16 bits
WAV conversion complete: 32044 bytes total
Audio recording stopped, raw buffer size: 32000, WAV buffer size: 32044
```

### File Locations

- **Debug files:** `~/tmp/contextor-audio-debug/audio-YYYY-MM-DDTHH-mm-ss-sssZ.wav`
- **Test files:** `~/tmp/contextor-audio-test/test-audio-YYYY-MM-DDTHH-mm-ss-sssZ.wav`

### Audio Specifications

- **Sample Rate:** 16,000 Hz
- **Channels:** 1 (mono)
- **Bit Depth:** 16 bits
- **Format:** WAV (PCM)
- **Minimum Duration:** 0.5 seconds

## Troubleshooting Steps

1. **Check microphone permissions:**
   - macOS: System Preferences > Security & Privacy > Microphone
   - Windows: Settings > Privacy > Microphone
   - Linux: Check pulseaudio/alsa settings

2. **Test with system recording:**
   - Use system audio recording tools to verify microphone works

3. **Check audio levels:**
   - Ensure microphone is not muted
   - Check input volume levels

4. **Verify dependencies:**
   - Ensure `node-record-lpcm16` is properly installed
   - Check that `rec` command is available (for macOS/Linux)

5. **Review logs:**
   - Check console output for detailed error messages
   - Look for any network or API errors

## Performance Tips

1. **Close other audio applications** that might interfere with recording
2. **Use a quiet environment** to reduce background noise
3. **Speak clearly and at normal volume**
4. **Record for at least 1-2 seconds** for best results

## Support

If issues persist after trying these solutions:

1. Check the console logs for specific error messages
2. Test with the provided test script
3. Verify audio files are being generated correctly
4. Check network connectivity for upload issues 