import React, { useState, useEffect } from 'react';

interface AudioPermissionCheckerProps {
  onPermissionGranted: () => void;
  onPermissionDenied: (errorMessage: string) => void;
}

interface AudioConfig {
  systemAudioEnabled: boolean;
  echoCancellationEnabled: boolean;
  echoCancellationSensitivity: 'low' | 'medium' | 'high';
  audioScenario: 'auto' | 'earphones' | 'speakers';
  voiceRecordingMode: 'headphones' | 'speakers' | 'auto';
}

export const AudioPermissionChecker: React.FC<AudioPermissionCheckerProps> = ({ onPermissionGranted }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [audioConfig, setAudioConfig] = useState<AudioConfig>({
    systemAudioEnabled: true,
    echoCancellationEnabled: true,
    echoCancellationSensitivity: 'medium',
    audioScenario: 'auto',
    voiceRecordingMode: 'auto'
  });

  useEffect(() => {
    checkPermissions();
    loadAudioConfiguration();
  }, []);

  const checkPermissions = async () => {
    try {
      setIsChecking(true);
      
      // Check microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      
      setHasPermission(true);
      onPermissionGranted();
    } catch (error) {
      console.error('Microphone permission denied:', error);
      setHasPermission(false);
    } finally {
      setIsChecking(false);
    }
  };

  const loadAudioConfiguration = async () => {
    try {
      const result = await (window as any).api.getAudioConfiguration();
      if (result.success) {
        setAudioConfig(result.config);
      }
    } catch (error) {
      console.error('Failed to load audio configuration:', error);
    }
  };

  const updateAudioConfiguration = async (updates: Partial<AudioConfig>) => {
    try {
      const newConfig = { ...audioConfig, ...updates };
      const result = await (window as any).api.setAudioConfiguration(newConfig);
      
      if (result.success) {
        setAudioConfig(newConfig);
        console.log('Audio configuration updated:', newConfig);
      } else {
        console.error('Failed to update audio configuration:', result.error);
      }
    } catch (error) {
      console.error('Failed to update audio configuration:', error);
    }
  };

  if (isChecking) {
    return (
      <div style={{
        padding: '20px',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #007AFF',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 12px auto'
          }}></div>
          <p style={{ margin: 0, color: '#666' }}>Checking microphone permissions...</p>
        </div>
      </div>
    );
  }

  if (hasPermission === false) {
    return (
      <div style={{
        padding: '20px',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#333',
          textAlign: 'center'
        }}>
          🎤 Microphone Permission Required
        </h3>
        <p style={{ marginBottom: '16px', color: '#666', lineHeight: '1.5' }}>
          Contextor needs microphone access to record audio. Please grant permission in your system settings.
        </p>
        <button
          onClick={checkPermissions}
          style={{
            background: 'linear-gradient(135deg, #007AFF 0%, #0055FF 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)',
            transition: 'all 0.2s ease'
          }}
        >
          🔄 Check Again
        </button>
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px',
      background: 'rgba(255, 255, 255, 0.95)',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
    }}>
      <h3 style={{
        margin: '0 0 16px 0',
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center'
      }}>
        🎤 Audio Settings
      </h3>
      
      <p style={{ marginBottom: '20px', color: '#666', lineHeight: '1.5' }}>
        Configure your audio recording preferences to reduce echo:
      </p>
      
      <div style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#333'
          }}>
            <input
              type="checkbox"
              checked={audioConfig.systemAudioEnabled}
              onChange={(e) => updateAudioConfiguration({ systemAudioEnabled: e.target.checked })}
              style={{ marginRight: '8px' }}
            />
            Record System Audio
          </label>
          <p style={{
            margin: '4px 0 0 24px',
            fontSize: '12px',
            color: '#666',
            lineHeight: '1.4'
          }}>
            Capture audio playing from your computer (may cause echo if using speakers)
          </p>
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            cursor: audioConfig.systemAudioEnabled ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: 'bold',
            color: audioConfig.systemAudioEnabled ? '#333' : '#999'
          }}>
            <input
              type="checkbox"
              checked={audioConfig.echoCancellationEnabled}
              onChange={(e) => updateAudioConfiguration({ echoCancellationEnabled: e.target.checked })}
              disabled={!audioConfig.systemAudioEnabled}
              style={{ marginRight: '8px' }}
            />
            Echo Cancellation
          </label>
          <p style={{
            margin: '4px 0 0 24px',
            fontSize: '12px',
            color: '#666',
            lineHeight: '1.4'
          }}>
            Automatically reduce echo when system audio is picked up by microphone
          </p>
        </div>
        
        {audioConfig.echoCancellationEnabled && audioConfig.systemAudioEnabled && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#333',
              marginBottom: '8px'
            }}>
              Voice Recording Setup:
            </label>
            <div style={{ marginLeft: '24px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                fontSize: '12px',
                marginBottom: '4px'
              }}>
                <input
                  type="radio"
                  name="voiceMode"
                  value="auto"
                  checked={audioConfig.voiceRecordingMode === 'auto'}
                  onChange={(e) => updateAudioConfiguration({ voiceRecordingMode: 'auto' })}
                  style={{ marginRight: '6px' }}
                />
                Auto-detect voice echo (recommended)
              </label>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                fontSize: '12px',
                marginBottom: '4px'
              }}>
                <input
                  type="radio"
                  name="voiceMode"
                  value="headphones"
                  checked={audioConfig.voiceRecordingMode === 'headphones'}
                  onChange={(e) => updateAudioConfiguration({ voiceRecordingMode: 'headphones' })}
                  style={{ marginRight: '6px' }}
                />
                Using headphones (no voice echo)
              </label>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                fontSize: '12px',
                marginBottom: '4px'
              }}>
                <input
                  type="radio"
                  name="voiceMode"
                  value="speakers"
                  checked={audioConfig.voiceRecordingMode === 'speakers'}
                  onChange={(e) => updateAudioConfiguration({ voiceRecordingMode: 'speakers' })}
                  style={{ marginRight: '6px' }}
                />
                Using speakers (voice echo possible)
              </label>
            </div>
          </div>
        )}
        
        {audioConfig.echoCancellationEnabled && audioConfig.systemAudioEnabled && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#333',
              marginBottom: '8px'
            }}>
              System Audio Setup:
            </label>
            <div style={{ marginLeft: '24px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                fontSize: '12px',
                marginBottom: '4px'
              }}>
                <input
                  type="radio"
                  name="scenario"
                  value="auto"
                  checked={audioConfig.audioScenario === 'auto'}
                  onChange={(e) => updateAudioConfiguration({ audioScenario: 'auto' })}
                  style={{ marginRight: '6px' }}
                />
                Auto-detect (recommended)
              </label>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                fontSize: '12px',
                marginBottom: '4px'
              }}>
                <input
                  type="radio"
                  name="scenario"
                  value="earphones"
                  checked={audioConfig.audioScenario === 'earphones'}
                  onChange={(e) => updateAudioConfiguration({ audioScenario: 'earphones' })}
                  style={{ marginRight: '6px' }}
                />
                Using earphones/headphones (no echo)
              </label>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                fontSize: '12px',
                marginBottom: '4px'
              }}>
                <input
                  type="radio"
                  name="scenario"
                  value="speakers"
                  checked={audioConfig.audioScenario === 'speakers'}
                  onChange={(e) => updateAudioConfiguration({ audioScenario: 'speakers' })}
                  style={{ marginRight: '6px' }}
                />
                Using speakers (echo possible)
              </label>
            </div>
          </div>
        )}
        
        {audioConfig.echoCancellationEnabled && audioConfig.systemAudioEnabled && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#333',
              marginBottom: '8px'
            }}>
              Echo Cancellation Sensitivity:
            </label>
            <div style={{ marginLeft: '24px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                fontSize: '12px',
                marginBottom: '4px'
              }}>
                <input
                  type="radio"
                  name="sensitivity"
                  value="low"
                  checked={audioConfig.echoCancellationSensitivity === 'low'}
                  onChange={(e) => updateAudioConfiguration({ echoCancellationSensitivity: 'low' })}
                  style={{ marginRight: '6px' }}
                />
                Low - Only remove obvious echo (may miss some echo)
              </label>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                fontSize: '12px',
                marginBottom: '4px'
              }}>
                <input
                  type="radio"
                  name="sensitivity"
                  value="medium"
                  checked={audioConfig.echoCancellationSensitivity === 'medium'}
                  onChange={(e) => updateAudioConfiguration({ echoCancellationSensitivity: 'medium' })}
                  style={{ marginRight: '6px' }}
                />
                Medium - Balanced echo removal (recommended)
              </label>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                fontSize: '12px',
                marginBottom: '4px'
              }}>
                <input
                  type="radio"
                  name="sensitivity"
                  value="high"
                  checked={audioConfig.echoCancellationSensitivity === 'high'}
                  onChange={(e) => updateAudioConfiguration({ echoCancellationSensitivity: 'high' })}
                  style={{ marginRight: '6px' }}
                />
                High - Aggressive echo removal (may affect voice)
              </label>
            </div>
          </div>
        )}
      </div>
      
      <div style={{
        padding: '12px',
        background: 'rgba(0, 122, 255, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(0, 122, 255, 0.2)'
      }}>
        <h4 style={{
          margin: '0 0 8px 0',
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#007AFF'
        }}>
          💡 Tips to Reduce Echo:
        </h4>
        <ul style={{
          margin: 0,
          paddingLeft: '20px',
          fontSize: '12px',
          color: '#666',
          lineHeight: '1.4'
        }}>
          <li>Use headphones instead of speakers</li>
          <li>Keep microphone away from speakers</li>
          <li>Lower system volume during recording</li>
          <li>Try "Low" sensitivity if your voice is being affected</li>
          <li>Try "High" sensitivity if echo persists</li>
          <li>Disable system audio recording if echo persists</li>
        </ul>
      </div>
    </div>
  );
}; 
