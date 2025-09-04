# Audio Echo Cancellation Guide

## Problem
When recording system audio on macOS, you may experience echo because:
1. System audio plays through speakers/headphones
2. Microphone picks up that audio from speakers
3. System audio recording captures the same audio directly
4. Result: Original audio + microphone-picked-up audio = echo

## Solution
Contextor now includes automatic echo cancellation to reduce this effect.

## Features

### 1. Echo Cancellation Algorithm
- **Detection**: Identifies when microphone and system audio are very similar
- **Reduction**: Automatically reduces microphone input when echo is detected
- **Mixing**: Intelligently combines microphone and system audio with proper weighting

### 2. Audio Configuration Options
You can control audio recording behavior through the Audio Settings panel:

#### Record System Audio
- **Enabled**: Records both microphone and system audio
- **Disabled**: Records only microphone audio (no echo possible)

#### Echo Cancellation
- **Enabled**: Automatically reduces echo when detected
- **Disabled**: No echo reduction (may cause echo if using speakers)

## How to Use

### Option 1: Use Echo Cancellation (Recommended)
1. Keep "Record System Audio" enabled
2. Keep "Echo Cancellation" enabled
3. The app will automatically detect and reduce echo

### Option 2: Disable System Audio Recording
1. Disable "Record System Audio" 
2. Only microphone audio will be recorded
3. No echo possible, but you won't capture system audio

### Option 3: Manual Echo Control
1. Keep "Record System Audio" enabled
2. Disable "Echo Cancellation"
3. Use manual methods to reduce echo (see tips below)

## Tips to Reduce Echo

### Hardware Solutions
- **Use headphones** instead of speakers
- **Keep microphone away** from speakers
- **Lower system volume** during recording
- **Use directional microphone** if available

### Software Solutions
- **Enable echo cancellation** in audio settings
- **Disable system audio recording** if echo persists
- **Use noise reduction** in your audio settings
- **Record in a quiet environment**

## Technical Details

### Echo Detection Algorithm
```typescript
// Normalize samples to -1 to 1 range
const micNormalized = micSample / 32767;
const sysNormalized = sysSample / 32767;

// Calculate similarity between microphone and system audio
const similarity = Math.abs(micNormalized - sysNormalized);
const isEcho = similarity < echoThreshold && Math.abs(micNormalized) > 0.1;

// Reduce microphone sample if echo is detected
if (isEcho) {
  processedMicSample = micNormalized * (1 - echoReduction);
}
```

### Audio Mixing
- **System Audio Weight**: 70% (cleaner source)
- **Microphone Weight**: 30% (processed to reduce echo)
- **Clipping Protection**: Prevents audio distortion

### Configuration Parameters
- **Echo Threshold**: 0.3 (sensitivity for echo detection)
- **Echo Reduction**: 0.7 (how much to reduce echo)
- **Correlation Window**: 1000 samples (analysis window)

## Troubleshooting

### Echo Still Present
1. Try disabling system audio recording
2. Use headphones instead of speakers
3. Lower system volume
4. Move microphone further from speakers

### No Audio Recorded
1. Check microphone permissions
2. Ensure microphone is not muted
3. Try a different microphone
4. Check system audio settings

### Poor Audio Quality
1. Enable echo cancellation
2. Use higher quality microphone
3. Record in quieter environment
4. Check audio input levels

## Performance Notes

- Echo cancellation adds minimal processing overhead
- Audio mixing is done in real-time
- Fallback to microphone-only if mixing fails
- Debug logging available in development mode

## Future Improvements

- Adaptive echo cancellation based on environment
- Machine learning-based echo detection
- Real-time echo cancellation preview
- Custom echo reduction levels
- Support for multiple microphone arrays 