const { AudioService } = require('./dist/helpers/audioService');

async function testAudioRecording() {
  console.log('🎤 Testing Audio Recording...');
  
  const audioService = new AudioService();
  
  try {
    // Test 1: Start recording
    console.log('\n1. Starting recording...');
    await audioService.startRecording();
    
    // Test 2: Check recording status
    console.log('\n2. Recording status:', audioService.getRecordingStatus());
    
    // Test 3: Wait for 3 seconds
    console.log('\n3. Recording for 3 seconds... (speak now)');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test 4: Stop recording
    console.log('\n4. Stopping recording...');
    const audioBuffer = await audioService.stopRecording();
    
    if (audioBuffer) {
      console.log('\n5. ✅ Recording successful!');
      console.log(`   Buffer size: ${audioBuffer.length} bytes`);
      console.log(`   Is valid WAV: ${audioService.isValidWavBuffer ? 'Yes' : 'No'}`);
      
      // Test 5: Save to file for manual testing
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      
      const testDir = path.join(os.tmpdir(), 'contextor-audio-test');
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `test-audio-${timestamp}.wav`;
      const filepath = path.join(testDir, filename);
      
      fs.writeFileSync(filepath, audioBuffer);
      console.log(`   Test file saved: ${filepath}`);
      console.log('\n🎉 Audio test completed successfully!');
      console.log(`   You can play the file at: ${filepath}`);
    } else {
      console.log('\n❌ Recording failed - no audio buffer returned');
    }
    
  } catch (error) {
    console.error('\n❌ Audio test failed:', error);
  }
}

// Run the test
testAudioRecording(); 