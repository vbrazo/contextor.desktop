import React, { useEffect, useState, useRef } from 'react';
import './app-drag.css';

import { styles } from './design-system/styles';
import { InsightsPanel } from './components/InsightsPanel';
import { AuthenticationSection } from './components/AuthenticationSection';
import { PlayerBar } from './components/PlayerBar';
import { LoadingBar } from './components/LoadingBar';
import { apiService, ConversationResponse } from './services/api';
import { PaymentModal } from './components/PaymentModal';
import { SystemAudioService } from './services/systemAudioService';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

declare global {
  interface Window {
    api: {
      getMessage: () => Promise<string>;
      sendTextToMain: (text: string) => void;
      resizeWindow: (height: number) => void;
      setWindowSize: (width: number, height: number) => void;
      moveWindow: (x: number, y: number) => void;
      onScreenshotAnalysis: (callback: (analysis: string) => void) => void;
      onScreenshotWithImage: (callback: (data: { analysis: string, imageUrl: string }) => void) => void;
      onAudioRecordingStarted: (callback: () => void) => void;
      onAudioRecordingError: (callback: (error: string) => void) => void;
      onAudioAnalysis: (callback: (analysis: string) => void) => void;
      onAudioWithAnalysis: (callback: (data: { analysis: string, audioUrl: string }) => void) => void;
      onChatResponse: (callback: (response: string) => void) => void;
      onAuthCallback: (callback: (authData: { token: string, user: any, expires_at: string }) => void) => void;
      onPaymentCallback: (callback: (paymentData: { status: string, session_id: string }) => void) => void;
      onLogout: (callback: () => void) => void;
      onGetAuthToken: (callback: () => void) => void;
      sendAuthTokenResponse: (token: string | null) => void;
      onHideInsightsPanel: (callback: () => void) => void;
      onToggleInsightsPanel: (callback: (state: boolean) => void) => void;
      onLoadingUpdate: (callback: (message: string) => void) => void;
      openChatWindow: () => void;
      closeChatWindow: () => void;
      openExternal: (url: string) => void;
      sendAuthStateChanged: () => void;
      createMessage: (conversationId: string, data: { content_type: string, text_content?: string, screenshot_url?: string, sender_type?: string }) => Promise<any>;
      createScreenshotMessage: (conversationId: string, screenshotUrl: string) => Promise<any>;
      notifyInsightsPanelOpened: () => void;
      notifyInsightsPanelClosed: () => void;
      // System audio recording methods
      enableSystemAudioLoopback: () => Promise<void>;
      disableSystemAudioLoopback: () => Promise<void>;
      // System audio coordination
      notifySystemAudioStarted: () => void;
      notifySystemAudioStopped: (audioData: any) => void;
      
      // Enhanced audio mixing
      startCombinedAudioRecording: () => Promise<{ success: boolean; error?: string }>;
      stopCombinedAudioRecording: () => Promise<{ success: boolean; buffer?: Buffer; error?: string }>;
    };
    global: Window;
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CHAT_HEIGHT = 468;
const PLAYER_BAR_HEIGHT = 70;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const App: React.FC = () => {
  // --------------------------------------------------------------------------
  // STATE MANAGEMENT
  // --------------------------------------------------------------------------
  
  // UI State
  const [isInsightsVisible, setIsInsightsVisible] = useState<boolean>(false);
  const [insights, setInsights] = useState<string>("");
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const [isUserActionLoading, setIsUserActionLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [isMicActive, setIsMicActive] = useState(false);

  const handleMicClick = async () => {
    if (!isMicActive) {
      // Start combined audio recording (microphone + system audio)
      setIsMicActive(true);
      try {
        console.log('Starting combined audio recording...');
        const result = await window.api.startCombinedAudioRecording();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to start recording');
        }
        
        console.log('Combined audio recording started successfully');
      } catch (error) {
        console.error('Failed to start audio recording:', error);
        setIsMicActive(false);
        setInsights('Failed to start audio recording. Please check your microphone and system audio permissions.');
      }
    } else {
      // Stop recording
      setIsMicActive(false);
      try {
        console.log('Stopping combined audio recording...');
        const result = await window.api.stopCombinedAudioRecording();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to stop recording');
        }
        
        if (result.buffer) {
          console.log('Audio recording completed, buffer size:', result.buffer.length);
          
          // Process the combined audio buffer
          await processCombinedAudioBuffer(result.buffer);
        } else {
          console.log('No audio data recorded');
          setInsights('No audio recorded or recording was too short. Please try again and speak for at least 0.5 seconds.');
        }
      } catch (error) {
        console.error('Failed to stop audio recording:', error);
        setInsights('Failed to stop audio recording. Please try again.');
      }
    }
  };

  const processCombinedAudioBuffer = async (buffer: Buffer) => {
    try {
      // Convert Buffer to ArrayBuffer for processing
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      
      // For now, we'll use the existing audio processing flow
      // The main process will handle the upload and AI analysis
      console.log('🎤 Combined audio buffer ready for processing, size:', arrayBuffer.byteLength);
      
      // The main process will handle the rest of the audio processing
      // We'll wait for the response via the existing IPC handlers
      setLoadingMessage('');
        
      // The main process will send 'audio-with-analysis' message
      // which will be handled by the existing onAudioWithAnalysis handler
    } catch (error) {
      console.error('Failed to process combined audio buffer:', error);
      setInsights('Failed to process audio. Please try again.');
      setLoadingMessage('');
    }
  };

  // Authentication & Payment State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isPaid, setIsPaid] = useState<boolean>(false);

  // Screenshot & Conversation State
  const [currentScreenshotUrl, setCurrentScreenshotUrl] = useState<string>('');
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string>('');
  const [currentConversation, setCurrentConversation] = useState<ConversationResponse | null>(null);

  // Refs
  const playerBarRef = useRef<HTMLDivElement>(null);
  const floatingContainerRef = useRef<HTMLDivElement>(null);

  // System audio service
  const systemAudioService = useRef<SystemAudioService>(new SystemAudioService());

  // Add these state variables at the top of the component
  const [lastTokenCheck, setLastTokenCheck] = useState<number>(0);
  const TOKEN_CHECK_INTERVAL = 60000; // 1 minute

  // --------------------------------------------------------------------------
  // UTILITY FUNCTIONS
  // --------------------------------------------------------------------------

  const persistCurrentConversation = (conversation: ConversationResponse | null) => {
    setCurrentConversation(conversation);
    if (conversation) {
      localStorage.setItem('current_conversation', JSON.stringify(conversation));
    } else {
      localStorage.removeItem('current_conversation');
    }
  };

  const refreshAuthState = () => {
    const token = localStorage.getItem('auth_token');
    const isTokenValid = token !== null;
    
    if (!isTokenValid && isAuthenticated) {
      logout();
    } else {
      setIsAuthenticated(isTokenValid);
      // Hide insights panel if user is not authenticated
      if (!isTokenValid) {
        setIsInsightsVisible(false);
      }
      window.api.sendAuthStateChanged();
    }
  };

  const refreshPaymentState = () => {
    const paymentConfirmed = localStorage.getItem('payment_confirmed');
    setIsPaid(paymentConfirmed === 'true');
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('token_expires_at');
    setIsAuthenticated(false);
    setInsights('');
    persistCurrentConversation(null);
    setIsInsightsVisible(false);
    window.api.sendAuthStateChanged();
  };

  // --------------------------------------------------------------------------
  // CONVERSATION MANAGEMENT
  // --------------------------------------------------------------------------

  const ensureConversation = async (): Promise<string | null> => {
    if (!isAuthenticated) {
      console.log('User not authenticated, skipping conversation creation');
      return null;
    }

    if (currentConversation) {
      return currentConversation.data.id;
    }

    const stored = localStorage.getItem('current_conversation');
    if (stored) {
      setCurrentConversation(JSON.parse(stored));
      return JSON.parse(stored).data.id;
    }

    try {
      const conversation = await apiService.createConversation({
        title: `Conversation ${new Date().toLocaleString()}`
      });
      persistCurrentConversation(conversation);
      return conversation.data.id;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      return null;
    }
  };

  // const createScreenshotMessage = async (screenshotUrl: string): Promise<void> => {
  //   const conversationId = await ensureConversation();
  //   if (!conversationId) return;

  //   if (!screenshotUrl || screenshotUrl.trim() === '') {
  //     console.log('Skipping screenshot message creation: no URL provided');
  //     return;
  //   }

  //   try {
  //     await window.api.createScreenshotMessage(conversationId, screenshotUrl);
  //     console.log('Screenshot message created successfully');
  //   } catch (error) {
  //     console.error('Failed to create screenshot message:', error);
  //   }
  // };

  // --------------------------------------------------------------------------
  // EVENT HANDLERS
  // --------------------------------------------------------------------------

  const handleScreenshotClick = () => {
    if (!isInsightsVisible) {
      toggleInsights();
    }
    setIsUserActionLoading(true);
    setLoadingMessage("Taking screenshot...");
    setIsInsightsLoading(true);
    window.api.sendTextToMain('take-screenshot');
  };

  const handleChatClick = () => {
    toggleInsights();
  };

  const handlePayClick = () => {
    window.api.openExternal('https://www.contextor.app/en/pricing');
  };

  const handleSendMessage = async (message: string) => {
    if (!isPaid && messageCount > 5) {
      setShowPaymentModal(true);
      return;
    }

    if (message === 'end-conversation') {
      window.api.sendTextToMain('end-conversation');
      persistCurrentConversation(null);
      setIsInsightsVisible(false);
      setInsights("");
      setMessageCount(0);
      setTimeout(() => {
        window.api.resizeWindow(PLAYER_BAR_HEIGHT);
      }, 50);
      return;
    }

    // Show loading for user message
    setIsUserActionLoading(true);
    setLoadingMessage("Sending message...");
    setIsInsightsLoading(true);
    setMessageCount(prev => prev + 1);

    // Ensure insights panel is visible before sending message
    if (!isInsightsVisible) {
      setIsInsightsVisible(true);
      window.api.notifyInsightsPanelOpened();
      // Force resize to chat height after state updates
      setTimeout(() => {
        window.api.resizeWindow(CHAT_HEIGHT);
      }, 50);
    }

    if (message.startsWith('screenshot-url:')) {
      const url = message.slice('screenshot-url:'.length);
      setInsights("");
      setCurrentScreenshotUrl('');
      window.api.sendTextToMain(`screenshot-url:${url}`);
    } else {
      setCurrentScreenshotUrl('');
      window.api.sendTextToMain(`prompt-screenshot:${message}`);
    }
  };

  const handleLoginClick = () => {
    window.api.openExternal('https://www.contextor.app/en/sign-in-external?electron=true');
  };

  const handleRegisterClick = () => {
    window.api.openExternal('https://www.contextor.app/en/sign-up-external?electron=true');
  };

  const handleCrownClick = () => {
    window.api.openExternal('https://contextor.app/en/conversations');
  };

  const toggleInsights = () => {
    const newVisibility = !isInsightsVisible;
    setIsInsightsVisible(newVisibility);
    
    // Notify main process about insights panel state change
    if (newVisibility) {
      window.api.notifyInsightsPanelOpened();
    } else {
      window.api.notifyInsightsPanelClosed();
    }
    
    setTimeout(() => {
      if (playerBarRef.current) {
        window.api.resizeWindow(newVisibility ? CHAT_HEIGHT : PLAYER_BAR_HEIGHT);
      }
    }, 10);
  };

  // --------------------------------------------------------------------------
  // EFFECTS - INITIALIZATION
  // --------------------------------------------------------------------------

  // Restore conversation from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('current_conversation');
    if (stored) {
      setCurrentConversation(JSON.parse(stored));
    }
  }, []);

  // Check authentication and payment status
  useEffect(() => {
    const checkAuthAndPayment = () => {
      refreshAuthState();
      refreshPaymentState();
    };
    
    checkAuthAndPayment();
    const handleFocus = () => checkAuthAndPayment();
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Set initial window height
  useEffect(() => {
    window.api.resizeWindow(PLAYER_BAR_HEIGHT);
  }, []);

  // Initialize insights panel visibility based on authentication state
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const isTokenValid = token !== null;
    
    // Only show insights panel if user is authenticated
    if (!isTokenValid) {
      setIsInsightsVisible(false);
    }
  }, []);

  // --------------------------------------------------------------------------
  // EFFECTS - EVENT LISTENERS
  // --------------------------------------------------------------------------

  useEffect(() => {
    console.log('🎯 Renderer process started - setting up event listeners');
    
    const cleanup = () => {
      // Cleanup will be handled by the useEffect dependency array
    };

    cleanup();

    // Screenshot Events
    window.api.onScreenshotAnalysis(async (analysis: string) => {
      // Only handle error messages from screenshot-analysis
      if (analysis.trim() && (analysis.includes('Failed') || analysis.includes('Error'))) {
        setIsInsightsLoading(false);
        setIsUserActionLoading(false);
        setLoadingMessage("");
        setInsights(analysis);
        // Ensure insights panel is visible when receiving analysis
        if (!isInsightsVisible) {
          setIsInsightsVisible(true);
          window.api.notifyInsightsPanelOpened();
          // Force resize to chat height after state updates
          setTimeout(() => {
            window.api.resizeWindow(CHAT_HEIGHT);
          }, 50);
        }
      }
    });

    window.api.onScreenshotWithImage(async (data: { analysis: string, imageUrl: string }) => {
      console.log('📸 Screenshot with image received:', data);
      if (data.analysis.trim()) {
        setIsInsightsLoading(false);
        setIsUserActionLoading(false);
        setLoadingMessage("");
        setInsights(data.analysis);
        setCurrentScreenshotUrl(data.imageUrl);
        // Ensure insights panel is visible when receiving analysis with image
        if (!isInsightsVisible) {
          setIsInsightsVisible(true);
          window.api.notifyInsightsPanelOpened();
          // Force resize to chat height after state updates
          setTimeout(() => {
            window.api.resizeWindow(CHAT_HEIGHT);
          }, 50);
        }
      }
    });

    // Audio Events
    window.api.onAudioRecordingStarted(() => {
      console.log('🎤 Audio recording started');
      setIsMicActive(true);
    });

    // Test IPC communication
    console.log('🎯 Setting up audio-with-analysis listener');
    window.api.onAudioWithAnalysis(async (data: { analysis: string, audioUrl: string }) => {
      console.log('🎤 Audio with analysis received in renderer:', data);
      console.log('🎤 Audio URL:', data.audioUrl);
      console.log('🎤 Analysis:', data.analysis);
      if (data.analysis.trim()) {
        setIsInsightsLoading(false);
        setIsUserActionLoading(false);
        setLoadingMessage("");
        setInsights(data.analysis);
        setCurrentAudioUrl(data.audioUrl);
        console.log('🎤 Setting currentAudioUrl to:', data.audioUrl);
        setIsMicActive(false);
        // Ensure insights panel is visible when receiving analysis with audio
        if (!isInsightsVisible) {
          setIsInsightsVisible(true);
          window.api.notifyInsightsPanelOpened();
          // Force resize to chat height after state updates
          setTimeout(() => {
            window.api.resizeWindow(CHAT_HEIGHT);
          }, 50);
        }
      }
    });

    window.api.onAudioRecordingError((error: string) => {
      console.error('🎤 Audio recording error:', error);
      setIsMicActive(false);
      setInsights(error);
    });

    window.api.onAudioAnalysis(async (analysis: string) => {
      // Only handle error messages from audio-analysis
      if (analysis.trim() && (analysis.includes('Failed') || analysis.includes('Error'))) {
        setIsInsightsLoading(false);
        setIsUserActionLoading(false);
        setLoadingMessage("");
        setInsights(analysis);
        setIsMicActive(false);
        // Ensure insights panel is visible when receiving analysis
        if (!isInsightsVisible) {
          setIsInsightsVisible(true);
          window.api.notifyInsightsPanelOpened();
          // Force resize to chat height after state updates
          setTimeout(() => {
            window.api.resizeWindow(CHAT_HEIGHT);
          }, 50);
        }
      }
    });



    // Chat Events
    window.api.onChatResponse(async (response: string) => {
      console.log('📝 Chat response received:', response);
      if (response.trim()) {
        setIsInsightsLoading(false);
        setIsUserActionLoading(false);
        setLoadingMessage("");
        setInsights(response);

        if (response === 'Your daily message limit has been reached. Please upgrade to continue or come back tomorrow.') {
          setShowPaymentModal(true);
          // Ensure loading states are cleared when showing payment modal
          setIsInsightsLoading(false);
          setIsUserActionLoading(false);
          setLoadingMessage("");
        } else if (response === 'Failed to create conversation. Please try again.') {
          // Handle conversation creation error
          setIsInsightsLoading(false);
          setIsUserActionLoading(false);
          setLoadingMessage("");
          // Reset conversation state
          persistCurrentConversation(null);
          // Show error message
          setInsights("Failed to start conversation. Please try again.");
        } else {
          // Always ensure insights panel is visible and window is resized
          setIsInsightsVisible(true);
          window.api.notifyInsightsPanelOpened();
          // Force resize to chat height after state updates
          setTimeout(() => {
            window.api.resizeWindow(CHAT_HEIGHT);
          }, 50);
        }
      }
    });

    // Authentication Events
    window.api.onAuthCallback((authData: { token: string, user: any, expires_at: string }) => {
      localStorage.setItem('auth_token', authData.token);
      if (authData.user) {
        localStorage.setItem('user', JSON.stringify(authData.user));
      }
      if (authData.expires_at) {
        localStorage.setItem('token_expires_at', authData.expires_at);
      }
      setIsAuthenticated(true);
      window.api.sendAuthStateChanged();
    });

    window.api.onLogout(() => {
      logout();
    });

    window.api.onGetAuthToken(() => {
      const now = Date.now();
      if (now - lastTokenCheck < TOKEN_CHECK_INTERVAL) {
        // If we've checked recently, just return the current token
        const token = localStorage.getItem('auth_token');
        window.api.sendAuthTokenResponse(token);
        return;
      }

      // Update last check time and send token
      setLastTokenCheck(now);
      const token = localStorage.getItem('auth_token');
      window.api.sendAuthTokenResponse(token);
    });

    // Payment Events
    window.api.onPaymentCallback((paymentData: { status: string, session_id: string }) => {
      if (paymentData.status === 'success') {
        localStorage.setItem('payment_confirmed', 'true');
        localStorage.setItem('payment_session_id', paymentData.session_id);
        setIsPaid(true);
      }
    });

    window.api.onToggleInsightsPanel((state: boolean) => {
      setIsInsightsVisible(state);
      // Notify main process about insights panel state change
      if (state) {
        window.api.notifyInsightsPanelOpened();
      } else {
        window.api.notifyInsightsPanelClosed();
      }
    });

    window.api.onHideInsightsPanel(() => {
      setIsInsightsVisible(false);
      window.api.notifyInsightsPanelClosed();
      persistCurrentConversation(null);
      setInsights("");
      setMessageCount(0);
      setTimeout(() => {
        window.api.resizeWindow(PLAYER_BAR_HEIGHT);
      }, 50);
    });

    // Loading Updates
    window.api.onLoadingUpdate((message: string) => {
      setLoadingMessage(message);
    });

    return cleanup;
  }, [isInsightsVisible]);

  // --------------------------------------------------------------------------
  // EFFECTS - WINDOW RESIZING
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (floatingContainerRef.current) {
      const height = floatingContainerRef.current.offsetHeight;
      
      // If insights panel is not visible and no insights, show only player bar
      if (!isInsightsVisible && !insights.trim()) {
        window.api.resizeWindow(PLAYER_BAR_HEIGHT);
      } else if (insights.trim()) {
        // If there are insights, resize to content height
        window.api.resizeWindow(height);
      } else {
        // Default chat height when insights panel is visible but no content yet
        window.api.resizeWindow(CHAT_HEIGHT);
      }
    }
  }, [insights, isInsightsVisible, isAuthenticated]);

  // --------------------------------------------------------------------------
  // RENDER FUNCTIONS
  // --------------------------------------------------------------------------

  // --------------------------------------------------------------------------
  // MAIN RENDER
  // --------------------------------------------------------------------------

  return (
    <div style={{...styles.container}} data-window-container>
      <div
        ref={floatingContainerRef}
        style={{
          ...styles.floatingContainer,
          ...(insights.trim()
            ? {
                overflow: 'hidden',
                maxWidth: '100%',
                wordWrap: 'break-word',
                height: '100%',
                maxHeight: '100vh',
              }
            : {
                background: 'black',
                boxShadow: 'none',
                minHeight: 0,
                height: 'auto',
              }),
        }}
        className="draggable-area"
      >
        <LoadingBar 
          isLoading={isUserActionLoading}
          message={loadingMessage}
        />
        {showPaymentModal && (
          <PaymentModal
            onClose={() => {
              toggleInsights();
              setShowPaymentModal(false);
              window.api.sendTextToMain('end-conversation');
              persistCurrentConversation(null);
              setIsInsightsVisible(false);
              setInsights("");
              setMessageCount(0);
            }}
            onUpgrade={handlePayClick}
          />
        )}

        {!isAuthenticated ? (
          <AuthenticationSection
            onLoginClick={handleLoginClick}
            onRegisterClick={handleRegisterClick}
          />
        ) : (
          <PlayerBar
            playerBarRef={playerBarRef}
            onCrownClick={handleCrownClick}
            onChatClick={handleChatClick}
            isUserActionLoading={isUserActionLoading}
          />
        )}

        {(currentConversation || insights.trim() || isInsightsVisible) && (
          <InsightsPanel 
            insights={insights}
            isLoading={isInsightsLoading}
            onSendMessage={handleSendMessage}
            screenshotUrl={currentScreenshotUrl}
            audioUrl={currentAudioUrl}
            onScreenshotProcessed={() => setCurrentScreenshotUrl('')}
            onAudioProcessed={() => setCurrentAudioUrl('')}
            handleScreenshotClick={handleScreenshotClick}
            isUserActionLoading={isUserActionLoading}
            handleMicClick={handleMicClick}
            isMicActive={isMicActive}
            conversationId={currentConversation?.data.id}
          />
        )}
      </div>
    </div>
  );
};

export default App;
