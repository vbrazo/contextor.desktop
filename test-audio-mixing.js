#!/usr/bin/env node

// ============================================================================
// AUDIO MIXING TEST SCRIPT
// ============================================================================

const fs = require('fs');
const path = require('path');

console.log('🎵 Testing Audio Mixing Functionality');
console.log('=====================================');

// Test 1: Check if electron-audio-loopback is available
try {
  const audioLoopback = require('electron-audio-loopback');
  console.log('✅ electron-audio-loopback is available');
} catch (error) {
  console.log('❌ electron-audio-loopback is not available:', error.message);
}

// Test 2: Check if node-record-lpcm16 is available
try {
  const recordModule = require('node-record-lpcm16');
  console.log('✅ node-record-lpcm16 is available');
} catch (error) {
  console.log('❌ node-record-lpcm16 is not available:', error.message);
}

// Test 3: Check if sox is available (for audio conversion)
const { spawn } = require('child_process');
const soxTest = spawn('sox', ['--version']);

soxTest.on('error', (error) => {
  console.log('❌ sox is not available:', error.message);
  console.log('   Please install sox: brew install sox (macOS) or apt-get install sox (Linux)');
});

soxTest.on('close', (code) => {
  if (code === 0) {
    console.log('✅ sox is available');
  } else {
    console.log('❌ sox is not working properly');
  }
});

// Test 4: Check audio permissions (macOS)
if (process.platform === 'darwin') {
  console.log('ℹ️  On macOS, you may need to grant microphone and system audio permissions');
  console.log('   Go to System Preferences > Security & Privacy > Privacy > Microphone');
  console.log('   Also check System Preferences > Security & Privacy > Privacy > Accessibility');
}

console.log('\n🎤 Audio Mixing Features:');
console.log('   - Microphone recording (16kHz, mono, 16-bit)');
console.log('   - System audio capture (48kHz, mono, 32-bit float)');
console.log('   - Audio mixing with normalization');
console.log('   - WAV format output');
console.log('   - S3 upload and AI analysis');

console.log('\n🚀 To test the full functionality:');
console.log('   1. Run: npm run dev');
console.log('   2. Click the microphone button in the app');
console.log('   3. Speak while playing system audio');
console.log('   4. Click the microphone button again to stop');
console.log('   5. Check the console for mixing logs');
console.log('\n🎯 For the enhanced audio recorder demo:');
console.log('   1. Import AudioRecorderDemo in your App.tsx');
console.log('   2. Replace the main content with <AudioRecorderDemo />');
console.log('   3. Test the full recording experience'); 