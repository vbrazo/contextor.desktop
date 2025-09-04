import React, { useState, useEffect } from 'react';

// ============================================================================
// PLATFORM PERMISSION CHECKER COMPONENT
// ============================================================================

interface PermissionStatus {
  microphone: 'granted' | 'denied' | 'not-determined' | 'restricted' | 'unknown';
  screen: 'granted' | 'denied' | 'not-determined' | 'restricted' | 'unknown';
  needsSetup: boolean;
  error?: string;
}

interface PlatformPermissionCheckerProps {
  onPermissionsReady: () => void;
  onPermissionsError: (error: string) => void;
}

export const PlatformPermissionChecker: React.FC<PlatformPermissionCheckerProps> = ({ 
  onPermissionsReady, 
  onPermissionsError 
}) => {
  const [permissions, setPermissions] = useState<PermissionStatus | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [platform, setPlatform] = useState<'macos' | 'windows' | 'linux'>('windows');

  useEffect(() => {
    detectPlatform();
    checkPermissions();
  }, []);

  const detectPlatform = () => {
    if (process.platform === 'darwin') {
      setPlatform('macos');
    } else if (process.platform === 'linux') {
      setPlatform('linux');
    } else {
      setPlatform('windows');
    }
  };

  const checkPermissions = async () => {
    try {
      setIsChecking(true);
      
      const result = await (window as any).api.checkSystemPermissions();
      setPermissions(result);
      
      if (!result.needsSetup) {
        onPermissionsReady();
      }
    } catch (error) {
      console.error('❌ Error checking permissions:', error);
      onPermissionsError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsChecking(false);
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      setIsRequesting(true);
      
      const result = await (window as any).api.requestMicrophonePermission();
      
      if (result.success) {
        console.log('✅ Microphone permission granted');
        await checkPermissions(); // Re-check all permissions
      } else {
        console.error('❌ Microphone permission denied');
        onPermissionsError('Microphone permission was denied. Please grant permission in system settings.');
      }
    } catch (error) {
      console.error('❌ Error requesting microphone permission:', error);
      onPermissionsError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsRequesting(false);
    }
  };

  const openSystemPreferences = async (section: 'screen-recording' | 'microphone') => {
    try {
      const result = await (window as any).api.openSystemPreferences(section);
      
      if (result.success) {
        console.log('✅ System preferences opened');
        // Wait a bit for user to make changes, then re-check
        setTimeout(() => {
          checkPermissions();
        }, 2000);
      } else {
        console.error('❌ Failed to open system preferences:', result.error);
        onPermissionsError(result.error || 'Failed to open system preferences');
      }
    } catch (error) {
      console.error('❌ Error opening system preferences:', error);
      onPermissionsError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const getPermissionStatusText = (status: string): string => {
    switch (status) {
      case 'granted': return '✅ Granted';
      case 'denied': return '❌ Denied';
      case 'not-determined': return '❓ Not Determined';
      case 'restricted': return '🚫 Restricted';
      case 'unknown': return '❓ Unknown';
      default: return '❓ Unknown';
    }
  };

  const getPermissionStatusColor = (status: string): string => {
    switch (status) {
      case 'granted': return '#4CAF50';
      case 'denied': return '#f44336';
      case 'not-determined': return '#ff9800';
      case 'restricted': return '#9c27b0';
      case 'unknown': return '#607d8b';
      default: return '#607d8b';
    }
  };

  if (isChecking) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner}></div>
          <h3 style={styles.loadingTitle}>Checking System Permissions...</h3>
          <p style={styles.loadingText}>
            Verifying microphone and screen recording access for {platform}
          </p>
        </div>
      </div>
    );
  }

  if (!permissions) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <h3 style={styles.errorTitle}>❌ Permission Check Failed</h3>
          <p style={styles.errorText}>
            Unable to check system permissions. Please try again.
          </p>
          <button
            onClick={checkPermissions}
            style={styles.retryButton}
          >
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  const micStatus = permissions.microphone;
  const screenStatus = permissions.screen;
  const needsSetup = permissions.needsSetup;

  return (
    <div style={styles.container}>
      <div style={styles.permissionContainer}>
        <h3 style={styles.title}>
          🔐 System Permissions Required
        </h3>
        
        <p style={styles.description}>
          Contextor needs access to your microphone and screen to provide AI assistance. 
          Please grant the following permissions:
        </p>

        {/* Platform-specific instructions */}
        {platform === 'macos' && (
          <div style={styles.platformInfo}>
            <h4 style={styles.platformTitle}>🍎 macOS Instructions</h4>
            <p style={styles.platformText}>
              On macOS, you'll need to grant permissions in System Preferences. 
              The app will guide you through this process.
            </p>
          </div>
        )}

        {platform === 'windows' && (
          <div style={styles.platformInfo}>
            <h4 style={styles.platformTitle}>🪟 Windows Instructions</h4>
            <p style={styles.platformText}>
              On Windows, permissions are typically granted through browser dialogs. 
              Allow access when prompted.
            </p>
          </div>
        )}

        {platform === 'linux' && (
          <div style={styles.platformInfo}>
            <h4 style={styles.platformTitle}>🐧 Linux Instructions</h4>
            <p style={styles.platformText}>
              On Linux, permissions are typically granted through browser dialogs. 
              Note: System audio capture has limited support on Linux.
            </p>
          </div>
        )}

        {/* Permission Status */}
        <div style={styles.permissionGrid}>
          <div style={styles.permissionItem}>
            <div style={styles.permissionHeader}>
              <span style={styles.permissionIcon}>🎤</span>
              <span style={styles.permissionLabel}>Microphone</span>
            </div>
            <div style={styles.permissionStatus}>
              <span style={{
                ...styles.statusText,
                color: getPermissionStatusColor(micStatus)
              }}>
                {getPermissionStatusText(micStatus)}
              </span>
            </div>
            {micStatus !== 'granted' && platform === 'macos' && (
              <button
                onClick={() => requestMicrophonePermission()}
                disabled={isRequesting}
                style={styles.actionButton}
              >
                {isRequesting ? 'Requesting...' : 'Request Permission'}
              </button>
            )}
          </div>

          <div style={styles.permissionItem}>
            <div style={styles.permissionHeader}>
              <span style={styles.permissionIcon}>🖥️</span>
              <span style={styles.permissionLabel}>Screen Recording</span>
            </div>
            <div style={styles.permissionStatus}>
              <span style={{
                ...styles.statusText,
                color: getPermissionStatusColor(screenStatus)
              }}>
                {getPermissionStatusText(screenStatus)}
              </span>
            </div>
            {screenStatus !== 'granted' && platform === 'macos' && (
              <button
                onClick={() => openSystemPreferences('screen-recording')}
                style={styles.actionButton}
              >
                Open System Preferences
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.actionContainer}>
          {needsSetup ? (
            <div style={styles.setupRequired}>
              <p style={styles.setupText}>
                ⚠️ Some permissions need to be configured. Please grant the required permissions above.
              </p>
              <button
                onClick={checkPermissions}
                style={styles.checkButton}
              >
                🔄 Check Again
              </button>
            </div>
          ) : (
            <div style={styles.allGranted}>
              <p style={styles.grantedText}>
                ✅ All required permissions are granted!
              </p>
              <button
                onClick={onPermissionsReady}
                style={styles.continueButton}
              >
                🚀 Continue
              </button>
            </div>
          )}
        </div>

        {/* Troubleshooting */}
        {needsSetup && (
          <div style={styles.troubleshooting}>
            <h4 style={styles.troubleshootingTitle}>🔧 Troubleshooting</h4>
            <ul style={styles.troubleshootingList}>
              {platform === 'macos' && (
                <>
                  <li>Go to System Preferences → Security & Privacy → Privacy</li>
                  <li>Select "Microphone" and ensure Contextor is checked</li>
                  <li>Select "Screen Recording" and ensure Contextor is checked</li>
                  <li>Restart the app after granting permissions</li>
                </>
              )}
              {platform === 'windows' && (
                <>
                  <li>Check Windows Settings → Privacy → Microphone</li>
                  <li>Ensure "Allow apps to access your microphone" is enabled</li>
                  <li>Check if Contextor is listed in allowed apps</li>
                </>
              )}
              {platform === 'linux' && (
                <>
                  <li>Check your browser's permission settings</li>
                  <li>Ensure microphone access is allowed</li>
                  <li>Some Linux distributions may require additional setup</li>
                </>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  container: {
    padding: '20px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  
  loadingContainer: {
    textAlign: 'center' as const,
    padding: '40px 20px',
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  },
  
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #007AFF',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px auto',
  },
  
  loadingTitle: {
    margin: '0 0 12px 0',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
  },
  
  loadingText: {
    margin: 0,
    color: '#666',
    fontSize: '14px',
  },
  
  errorContainer: {
    textAlign: 'center' as const,
    padding: '40px 20px',
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  },
  
  errorTitle: {
    margin: '0 0 16px 0',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#f44336',
  },
  
  errorText: {
    margin: '0 0 20px 0',
    color: '#666',
    fontSize: '14px',
  },
  
  retryButton: {
    background: 'linear-gradient(135deg, #007AFF 0%, #0055FF 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)',
    transition: 'all 0.2s ease',
  },
  
  permissionContainer: {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  },
  
  title: {
    margin: '0 0 16px 0',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center' as const,
  },
  
  description: {
    margin: '0 0 24px 0',
    color: '#666',
    fontSize: '14px',
    lineHeight: '1.5',
    textAlign: 'center' as const,
  },
  
  platformInfo: {
    background: 'rgba(0, 122, 255, 0.1)',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
  },
  
  platformTitle: {
    margin: '0 0 8px 0',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#007AFF',
  },
  
  platformText: {
    margin: 0,
    fontSize: '14px',
    color: '#666',
    lineHeight: '1.4',
  },
  
  permissionGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '24px',
  },
  
  permissionItem: {
    background: 'rgba(248, 249, 250, 0.8)',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
  },
  
  permissionHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '12px',
  },
  
  permissionIcon: {
    fontSize: '20px',
    marginRight: '8px',
  },
  
  permissionLabel: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#333',
  },
  
  permissionStatus: {
    marginBottom: '12px',
  },
  
  statusText: {
    fontSize: '12px',
    fontWeight: 'bold',
  },
  
  actionButton: {
    background: 'linear-gradient(135deg, #007AFF 0%, #0055FF 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0, 122, 255, 0.3)',
    transition: 'all 0.2s ease',
    width: '100%',
  },
  
  actionContainer: {
    marginBottom: '24px',
  },
  
  setupRequired: {
    textAlign: 'center' as const,
  },
  
  setupText: {
    margin: '0 0 16px 0',
    color: '#ff9800',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  
  checkButton: {
    background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)',
    transition: 'all 0.2s ease',
  },
  
  allGranted: {
    textAlign: 'center' as const,
  },
  
  grantedText: {
    margin: '0 0 16px 0',
    color: '#4CAF50',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  
  continueButton: {
    background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
    transition: 'all 0.2s ease',
  },
  
  troubleshooting: {
    background: 'rgba(248, 249, 250, 0.8)',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid rgba(0, 0, 0, 0.1)',
  },
  
  troubleshootingTitle: {
    margin: '0 0 12px 0',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
  },
  
  troubleshootingList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '12px',
    color: '#666',
    lineHeight: '1.4',
  },
}; 