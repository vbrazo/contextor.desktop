import React, { useEffect, useState, useRef, MouseEvent } from 'react';
import './app-drag.css';

import { styles, hoverEffects } from './design-system/styles';

import { InsightsPanel } from './components/InsightsPanel';
import { PlayerBar } from './components/PlayerBar';
import { apiService, ConversationResponse } from './services/api';

// Add JSX namespace declaration
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
      onPlayStateChanged: (callback: (state: boolean) => void) => void;
      onTranscriptionText: (callback: (text: string) => void) => void;
      onScreenshotAnalysis: (callback: (analysis: string) => void) => void;
      onScreenshotWithImage: (callback: (data: { analysis: string, imageUrl: string }) => void) => void;
      onChatResponse: (callback: (response: string) => void) => void;
      onAuthCallback: (callback: (authData: { token: string, user: any, expires_at: string }) => void) => void;
      onPaymentCallback: (callback: (paymentData: { status: string, session_id: string }) => void) => void;
      onLogout: (callback: () => void) => void;
      onGetAuthToken: (callback: () => void) => void;
      sendAuthTokenResponse: (token: string | null) => void;
      onIdlePrompt: (callback: (data: { message: string, buttons: Array<{ id: string, text: string }> }) => void) => void;
      sendIdleResponse: (response: string) => void;
      onHideInsightsPanel: (callback: () => void) => void;
      openChatWindow: () => void;
      closeChatWindow: () => void;
      openExternal: (url: string) => void;
    };
    global: Window;
  }
}

type Message = {
  sender: 'transcription';
  text: string;
  speaker: string;
};

type IdleButton = {
  id: string;
  text: string;
};

const CHAT_HEIGHT = 500;
const PLAYER_BAR_HEIGHT = 420;

const App: React.FC = () => {
  const [message, setMessage] = useState<string>('');
  const [isChatVisible, setIsChatVisible] = useState<boolean>(false);
  const [isInsightsVisible, setIsInsightsVisible] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [chat, setChat] = useState<Message[]>([]);
  const [insights, setInsights] = useState<string>("");
  const [isInsightsLoading, setIsInsightsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isPaid, setIsPaid] = useState<boolean>(false);
    const [currentScreenshotUrl, setCurrentScreenshotUrl] = useState<string>('');
  const [idlePrompt, setIdlePrompt] = useState<{ message: string, buttons: Array<{ id: string, text: string }> } | null>(null);
  const [currentConversation, setCurrentConversation] = useState<ConversationResponse | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const playerBarRef = useRef<HTMLDivElement>(null);
  const floatingContainerRef = useRef<HTMLDivElement>(null);

  // Function to logout and clear all auth data
  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('token_expires_at');
    setIsAuthenticated(false);
    // Clear any other auth-related state if needed
    setInsights('');
    setChat([]);
    setCurrentConversation(null);
  };

  // Function to refresh authentication state
  const refreshAuthState = () => {
    const token = localStorage.getItem('auth_token');
    const isTokenValid = token !== null;
    
    if (!isTokenValid && isAuthenticated) {
      // If no token but user was previously authenticated, log them out
      logout();
    } else {
      setIsAuthenticated(isTokenValid);
    }
  };

  // Function to refresh payment state
  const refreshPaymentState = () => {
    const paymentConfirmed = localStorage.getItem('payment_confirmed');
    setIsPaid(paymentConfirmed === 'true');
  };

  // Function to create or get current conversation
  const ensureConversation = async (): Promise<string | null> => {
    if (!isAuthenticated) {
      console.log('User not authenticated, skipping conversation creation');
      return null;
    }

    if (currentConversation) {
      return currentConversation.data.id;
    }

    try {
      const conversation = await apiService.createConversation({
        title: `Screenshot Session ${new Date().toLocaleString()}`
      });
      setCurrentConversation(conversation);
      return conversation.data.id;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      return null;
    }
  };

  // Function to create a screenshot message
  const createScreenshotMessage = async (screenshotUrl: string): Promise<void> => {
    const conversationId = await ensureConversation();
    if (!conversationId) return;

    // Only create screenshot message if we have a valid URL
    if (!screenshotUrl || screenshotUrl.trim() === '') {
      console.log('Skipping screenshot message creation: no URL provided');
      return;
    }

    try {
      await apiService.createMessage(conversationId, {
        content_type: 'screenshot',
        screenshot_url: screenshotUrl
      });
      console.log('Screenshot message created successfully');
    } catch (error) {
      console.error('Failed to create screenshot message:', error);
    }
  };

  // Function to create a text message
  const createTextMessage = async (text: string): Promise<void> => {
    const conversationId = await ensureConversation();
    if (!conversationId) return;

    try {
      await apiService.createMessage(conversationId, {
        content_type: 'text',
        text_content: text
      });
      console.log('Text message created successfully');
    } catch (error) {
      console.error('Failed to create text message:', error);
    }
  };

  // Effects
  useEffect(() => {
    const fetchMessage = async () => {
      const response = await window.api.getMessage();
      setMessage(response);
    };
    fetchMessage();
  }, []);

  useEffect(() => {
    // Check if user is authenticated and payment status
    const checkAuthAndPayment = () => {
      refreshAuthState();
      refreshPaymentState();
    };
    
    checkAuthAndPayment();

    // Check authentication and payment state periodically and on window focus
    const interval = setInterval(checkAuthAndPayment, 1000); // Check every second
    
    const handleFocus = () => checkAuthAndPayment();
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  useEffect(() => {
    // Ensure window is correct height on initial mount
    window.api.resizeWindow(500);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  useEffect(() => {
    // Listen for play state changes from main process
    window.api.onPlayStateChanged((state: boolean) => {
      setIsPlaying(state);
      setIsTranscribing(state);
    });

    // Listen for transcription text
    window.api.onTranscriptionText((text: string) => {
      if (text.trim()) {
        const lines = text.split('\n');
        const messages: Message[] = lines.map(line => {
          const speakerMatch = line.match(/^(Speaker \d+):\s*(.*)/);
          if (speakerMatch) {
            return {
              sender: 'transcription',
              speaker: speakerMatch[1],
              text: speakerMatch[2]
            };
          }
          return {
            sender: 'transcription',
            speaker: 'You',
            text: line
          };
        });
        setChat((prevChat: Message[]) => [...prevChat, ...messages]);
      }
    });

    // Listen for screenshot analysis
    window.api.onScreenshotAnalysis(async (analysis: string) => {
      if (analysis.trim()) {
        setIsInsightsLoading(false);
        setInsights(analysis);
        
        // Create conversation when we get analysis
        // Note: We'll create the screenshot message when we get the image URL
        await ensureConversation();
      }
    });

    // Listen for screenshot with image
    window.api.onScreenshotWithImage(async (data: { analysis: string, imageUrl: string }) => {
      console.log('📸 Screenshot with image received:', data);
      if (data.analysis.trim()) {
        setIsInsightsLoading(false);
        setInsights(data.analysis);
        setCurrentScreenshotUrl(data.imageUrl);
        console.log('📸 Screenshot URL set to:', data.imageUrl);
        
        // Create conversation and screenshot message
        if (data.imageUrl) {
          await createScreenshotMessage(data.imageUrl);
        }
      }
    });

    // Listen for chat responses (from general text input)
    window.api.onChatResponse((response: string) => {
      if (response.trim()) {
        setIsInsightsLoading(false);
        setInsights(response);
      }
    });

    // Listen for authentication callback
    window.api.onAuthCallback((authData: { token: string, user: any, expires_at: string }) => {
      // Store auth data in localStorage
      localStorage.setItem('auth_token', authData.token);
      if (authData.user) {
        localStorage.setItem('user', JSON.stringify(authData.user));
      }
      if (authData.expires_at) {
        localStorage.setItem('token_expires_at', authData.expires_at);
      }
      
      // Update authentication state
      setIsAuthenticated(true);
    });

    // Listen for logout message from main process
    window.api.onLogout(() => {
      logout();
    });

    // Listen for auth token request from main process
    window.api.onGetAuthToken(() => {
      const token = localStorage.getItem('auth_token');
      window.api.sendAuthTokenResponse(token);
    });

    // Listen for payment callback
    window.api.onPaymentCallback((paymentData: { status: string, session_id: string }) => {
      if (paymentData.status === 'success') {
        // Store payment confirmation in localStorage
        localStorage.setItem('payment_confirmed', 'true');
        localStorage.setItem('payment_session_id', paymentData.session_id);
        
        // Update payment state
        setIsPaid(true);
      }
    });

    // Listen for idle prompt
    window.api.onIdlePrompt((data: { message: string, buttons: Array<{ id: string, text: string }> }) => {
      setIdlePrompt(data);
    });

    // Listen for hide insights panel
    window.api.onHideInsightsPanel(() => {
      setIsInsightsVisible(false);
      setInsights(""); // Clear insights when ending conversation
      setIdlePrompt(null); // Clear idle prompt when hiding insights
      setCurrentConversation(null); // Clear current conversation when ending
      if (playerBarRef.current) {
        window.api.resizeWindow(PLAYER_BAR_HEIGHT);
      }
    });
  }, [isChatVisible, isInsightsVisible]);

  // Adjust window height to fit content
  useEffect(() => {
    if (floatingContainerRef.current) {
      const height = floatingContainerRef.current.offsetHeight;
      window.api.resizeWindow(height);
    }
  }, [insights, isInsightsVisible, isAuthenticated, isPlaying, idlePrompt]);

  // Handlers

  const toggleInsights = () => {
    const newVisibility = !isInsightsVisible;
    setIsInsightsVisible(newVisibility);
    setIsChatVisible(false);
    setTimeout(() => {
      if (playerBarRef.current) {
        window.api.resizeWindow(newVisibility ? CHAT_HEIGHT : PLAYER_BAR_HEIGHT);
      }
    }, 10);
  };

  const takeScreenshot = () => {
    toggleInsights();
    setIsInsightsLoading(true);
    setInsights("");
    setCurrentScreenshotUrl(''); // Clear any existing screenshot URL
    window.api.sendTextToMain('take-screenshot');
  };

  const handlePlayClick = () => {
    window.api.sendTextToMain('play');
  };

  const handleScreenshotClick = () => {
    takeScreenshot();
  };

  const handleOptionsClick = () => {
    window.api.sendTextToMain('show-options');
  };

  const handleSendMessage = async (message: string) => {
    // Check if this is a screenshot URL request
    if (message.startsWith('screenshot-url:')) {
      const url = message.slice('screenshot-url:'.length);
      setIsInsightsLoading(true);
      setInsights("");
      setCurrentScreenshotUrl(''); // Clear existing screenshot URL
      window.api.sendTextToMain(`screenshot-url:${url}`);
      
      // Create a screenshot message with the provided URL
      await createScreenshotMessage(url);
    } else {
      // For prompt-screenshot commands, also clear the screenshot URL
      if (!isPlaying) {
        setCurrentScreenshotUrl(''); // Clear existing screenshot URL for new screenshot prompts
      }
      
      // Create a text message for the user's input
      await createTextMessage(message);
      
      window.api.sendTextToMain(
        isPlaying 
          ? `prompt-transcription:${message}` 
          : `prompt-screenshot:${message}`
      );
    }
  };

  const handleLoginClick = () => {
    window.api.openExternal('https://www.contextor.app/en/sign-in-external?electron=true');
  };

  const handlePayClick = () => {
    // Open Stripe payment flow
    window.api.sendTextToMain('initiate-payment');
  };

  const handleCrownClick = () => {
    // Open meetings page for pro members
    window.api.openExternal('https://contextor.app/en/screenshots');
  };

  const handleIdleResponse = (response: string) => {
    window.api.sendIdleResponse(response);
    setIdlePrompt(null); // Clear the prompt after responding
  };

  const messageStyle = {
    ...styles.messageUser,
    ...(isHovered && hoverEffects.messageHover)
  };

  return (
    <div style={styles.container} data-window-container>
      <div
        ref={floatingContainerRef}
        style={{
          ...styles.floatingContainer,
          ...(insights.trim()
            ? {} // default styles when insights are shown
            : {
                background: 'transparent',
                boxShadow: 'none',
                minHeight: 0,
                height: 'auto',
              }),
        }}
        className="draggable-area"
      >
          {insights.trim() && (
            <InsightsPanel 
              insights={insights}
              isLoading={isInsightsLoading}
              onSendMessage={handleSendMessage}
              screenshotUrl={currentScreenshotUrl}
              onScreenshotProcessed={() => {
                console.log('📸 Screenshot processed, clearing URL');
                setTimeout(() => setCurrentScreenshotUrl(''), 1000); // Delay clearing to ensure rendering
              }}
            />
          )}
          
          {/* Debug display */}
          {currentScreenshotUrl && (
            <div style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              background: 'yellow',
              padding: '5px',
              fontSize: '10px',
              maxWidth: '200px',
              wordBreak: 'break-all',
              zIndex: 1001,
            }}>
              Debug: {currentScreenshotUrl}
            </div>
          )}

          {/* Idle Prompt Dialog */}
          {idlePrompt && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              backdropFilter: 'blur(5px)',
            }}>
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '24px',
                maxWidth: '300px',
                textAlign: 'center',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              }}>
                <p style={{
                  margin: '0 0 20px 0',
                  fontSize: '16px',
                  color: '#333',
                  lineHeight: '1.4',
                }}>
                  {idlePrompt.message}
                </p>
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'center',
                }}>
                  {idlePrompt.buttons.map((button: IdleButton) => (
                    <button
                      key={button.id}
                      onClick={() => handleIdleResponse(button.id)}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: button.id === 'yes' ? '#FF3B30' : '#007AFF',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e: MouseEvent<HTMLButtonElement>) => {
                        e.currentTarget.style.opacity = '0.8';
                      }}
                      onMouseLeave={(e: MouseEvent<HTMLButtonElement>) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                    >
                      {button.text}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        {/* )} */}

        
        {!isAuthenticated ? (
          <div style={{
            background: 'rgba(0, 0, 0, 0.8)',
            borderRadius: '12px',
            padding: '16px',
            margin: '8px',
            textAlign: 'center',
            color: 'white',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <p style={{ 
              margin: '0 0 12px 0', 
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.8)'
            }}>
              Sign in to access all features
            </p>
            <button
              onClick={handleLoginClick}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                color: 'white',
                fontWeight: '500',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
              }}
            >
              Login
            </button>
          </div>
        ) : (
          <PlayerBar
            ref={playerBarRef}
            isHovered={isHovered}
            isPlaying={isPlaying}
            isPaid={isPaid}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onPlayClick={handlePlayClick}
            onScreenshotClick={handleScreenshotClick}
            onOptionsClick={handleOptionsClick}
            onPayClick={handlePayClick}
            onCrownClick={handleCrownClick}
          />
        )}
      </div>
    </div>
  );
};

export default App;
