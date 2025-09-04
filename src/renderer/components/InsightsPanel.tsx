import React, { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';

import { styles, hoverEffects } from '../design-system/styles';
import { LoadingDots } from './LoadingDots';
import { SendIcon } from './SendIcon';
import { CameraIcon, MicrophoneIcon } from './Icons';
import { apiService } from '../services/api';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  isLoading?: boolean;
  imageUrl?: string;
  audioUrl?: string;
  type?: 'text' | 'screenshot' | 'audio';
}

interface InsightsPanelProps {
  insights: string;
  isLoading: boolean;
  onSendMessage?: (message: string) => void;
  screenshotUrl?: string;
  audioUrl?: string;
  onScreenshotProcessed?: () => void;
  onAudioProcessed?: () => void;
  handleScreenshotClick?: () => void;
  isUserActionLoading?: boolean;
  handleMicClick?: () => void;
  isMicActive?: boolean;
  conversationId?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const InsightsPanel: React.FC<InsightsPanelProps> = ({ 
  insights, 
  isLoading, 
  onSendMessage, 
  screenshotUrl,
  audioUrl,
  onScreenshotProcessed,
  onAudioProcessed,
  handleScreenshotClick,
  isUserActionLoading,
  handleMicClick,
  isMicActive,
  conversationId
}) => {
  // --------------------------------------------------------------------------
  // STATE MANAGEMENT
  // --------------------------------------------------------------------------
  
  // UI State
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [isInputHovered, setIsInputHovered] = useState(false);
  const [isSendButtonHovered, setIsSendButtonHovered] = useState(false);
  const [isMicButtonHovered, setIsMicButtonHovered] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Messages State
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastProcessedInsight = useRef<string>('');

  // --------------------------------------------------------------------------
  // UTILITY FUNCTIONS
  // --------------------------------------------------------------------------

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const isDuplicateMessage = (insight: string, messages: Message[]): boolean => {
    // Check if any recent assistant message has the same content
    const recentAssistantMessages = messages
      .filter(msg => msg.sender === 'assistant' && !msg.isLoading)
      .slice(-3); // Check last 3 assistant messages
    
    return recentAssistantMessages.some(msg => msg.content === insight);
  };

  const hasPendingScreenshot = (screenshotUrl: string | undefined, messages: Message[]): boolean => {
    return !!(screenshotUrl && !messages.some(msg => 
      msg.type === 'screenshot' && msg.imageUrl === screenshotUrl
    ));
  };

  const createScreenshotMessage = (screenshotUrl: string): Message => ({
    id: `${Date.now()}-image`,
    content: '',
    sender: 'user' as const,
    timestamp: new Date(),
    imageUrl: screenshotUrl,
    type: 'screenshot' as const,
  });

  const createAudioMessage = (audioUrl: string): Message => ({
    id: `${Date.now()}-audio`,
    content: 'audio',
    sender: 'user' as const,
    timestamp: new Date(),
    audioUrl: audioUrl,
    type: 'audio' as const,
  });

  const createTextMessage = (content: string, sender: 'user' | 'assistant', type: 'text' | 'screenshot' | 'audio' = 'text'): Message => ({
    id: Date.now().toString(),
    content,
    sender,
    timestamp: new Date(),
    type,
  });

  const createLoadingMessage = (): Message => ({
    id: 'loading',
    content: 'Analyzing...',
    sender: 'assistant',
    timestamp: new Date(),
    isLoading: true,
  });

  // --------------------------------------------------------------------------
  // CONVERSATION HISTORY LOADING
  // --------------------------------------------------------------------------

  const loadConversationHistory = async () => {
    if (!conversationId) return;

    try {
      setIsLoadingHistory(true);
      const response = await apiService.getConversationMessages(conversationId);
      
      const historyMessages: Message[] = response.data.map(msg => {
        const message: Message = {
          id: msg.id,
          content: msg.attributes.text_content || '',
          sender: msg.attributes.sender_type === 'user' ? 'user' : 'assistant',
          timestamp: new Date(msg.attributes.created_at),
          type: msg.attributes.content_type as 'text' | 'screenshot' | 'audio',
        };

        // Add specific content based on type
        if (msg.attributes.content_type === 'screenshot' && msg.attributes.screenshot_url) {
          message.imageUrl = msg.attributes.screenshot_url;
        } else if (msg.attributes.content_type === 'audio' && msg.attributes.audio_url) {
          message.audioUrl = msg.attributes.audio_url;
        }

        return message;
      });

      setMessages(historyMessages);
      console.log('📚 Loaded conversation history:', historyMessages.length, 'messages');
    } catch (error) {
      console.error('Failed to load conversation history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // --------------------------------------------------------------------------
  // MESSAGE MANAGEMENT
  // --------------------------------------------------------------------------

  const updateMessagesWithInsights = (insight: string, screenshotUrl?: string, audioUrl?: string) => {
    console.log('🔄 Updating messages with insights:', {
      insight,
      screenshotUrl,
      audioUrl
    });
    setMessages(prev => {
      if (isDuplicateMessage(insight, prev)) {
        console.log('🎯 Duplicate message detected, skipping');
        return prev;
      }
      
      const filteredMessages = prev.filter(msg => !msg.isLoading);
      const newMessages = [];

      // Add screenshot first if pending
      if (hasPendingScreenshot(screenshotUrl, filteredMessages)) {
        newMessages.push(createScreenshotMessage(screenshotUrl!));
        onScreenshotProcessed?.();
      }

      // Add audio message if audioUrl is provided and not already in messages
      if (audioUrl && !filteredMessages.some(msg => 
        msg.type === 'audio' && msg.audioUrl === audioUrl
      )) {
        console.log('🎤 Adding audio message:', audioUrl);
        const audioMessage = createAudioMessage(audioUrl);
        console.log('🎤 Created audio message:', audioMessage);
        newMessages.push(audioMessage);
        onAudioProcessed?.();
      } else if (audioUrl) {
        console.log('🎤 Audio URL provided but message already exists or URL is empty:', audioUrl);
      } else {
        console.log('🎤 No audio URL provided');
      }
      
      // Add the text analysis message
      newMessages.push(createTextMessage(insight, 'assistant', 'text'));
      
      console.log('🔄 New messages to add:', newMessages);
      const updatedMessages = [...filteredMessages, ...newMessages];
      console.log('📝 All messages after update:', updatedMessages.map(m => ({ 
        id: m.id, 
        type: m.type, 
        imageUrl: m.imageUrl,
        audioUrl: m.audioUrl
      })));
      
      return updatedMessages;
    });
    setIsSending(false);
  };

  const addLoadingMessage = () => {
    setMessages(prev => [
      ...prev.filter(msg => !msg.isLoading),
      createLoadingMessage()
    ]);
  };

  const clearConversation = () => {
    setMessages([]);
    setInputValue('');
    lastProcessedInsight.current = '';
    onSendMessage?.('end-conversation');
  };

  // --------------------------------------------------------------------------
  // EVENT HANDLERS
  // --------------------------------------------------------------------------

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;

    const message = inputValue.trim();
    setInputValue('');
    setIsSending(true);
    addLoadingMessage();

    const userMessage = createTextMessage(message, 'user', 'text');
    setMessages(prev => [...prev, userMessage]);

    try {
      onSendMessage?.(message);
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMouseEnter = (messageId: string) => {
    setHoveredMessageId(messageId);
  };

  const handleMouseLeave = () => {
    setHoveredMessageId(null);
  };

  // --------------------------------------------------------------------------
  // EFFECTS
  // --------------------------------------------------------------------------

  // Load conversation history when conversationId changes
  useEffect(() => {
    if (conversationId) {
      loadConversationHistory();
    }
  }, [conversationId]);

  // Update messages when insights change
  useEffect(() => {
    if (insights && insights !== lastProcessedInsight.current) {
      lastProcessedInsight.current = insights;
      updateMessagesWithInsights(insights, screenshotUrl, audioUrl);
    }
  }, [insights, screenshotUrl, audioUrl]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --------------------------------------------------------------------------
  // RENDER FUNCTIONS
  // --------------------------------------------------------------------------

  const renderScreenshotMessage = (message: Message) => {
    console.log('🖼️ Rendering screenshot message:', message.id, message.imageUrl);
    
    if (!message.imageUrl) {
      console.error('❌ Screenshot message missing imageUrl:', message);
      return (
        <div
          key={message.id}
          style={{
            ...styles.messageUser,
            ...(hoveredMessageId === message.id && hoverEffects.messageHover)
          }}
          onMouseEnter={() => handleMouseEnter(message.id)}
          onMouseLeave={handleMouseLeave}
        >
          <div style={{ color: '#ff4444', padding: '10px' }}>
            Screenshot not available
          </div>
        </div>
      );
    }
    
    return (
      <div
        key={message.id}
        style={{
          ...styles.messageUser,
          ...(hoveredMessageId === message.id && hoverEffects.messageHover)
        }}
        onMouseEnter={() => handleMouseEnter(message.id)}
        onMouseLeave={handleMouseLeave}
      >
        <img
          src={message.imageUrl}
          alt="Screenshot"
          style={{
            maxWidth: '100%',
            maxHeight: '300px',
            borderRadius: '8px',
            objectFit: 'contain',
          }}
        />
      </div>
    );
  };

  const renderAudioMessage = (message: Message) => {
    console.log('🎤 Rendering audio message:', message.id, message.audioUrl);
    console.log('🎤 Message type:', message.type);
    console.log('🎤 Message sender:', message.sender);
    
    if (!message.audioUrl) {
      console.error('❌ Audio message missing audioUrl:', message);
      return (
        <div
          key={message.id}
          style={{
            ...styles.messageUser,
            ...(hoveredMessageId === message.id && hoverEffects.messageHover)
          }}
          onMouseEnter={() => handleMouseEnter(message.id)}
          onMouseLeave={handleMouseLeave}
        >
          <div style={{ color: '#ff4444', padding: '10px' }}>
            Audio file not available
          </div>
        </div>
      );
    }
    
    const handleDownloadAudio = () => {
      if (!message.audioUrl) return;
      
      const link = document.createElement('a');
      link.href = message.audioUrl;
      link.download = `audio-${message.id}.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    
    return (
      <div
        key={message.id}
        style={{
          ...styles.messageUser,
          ...(hoveredMessageId === message.id && hoverEffects.messageHover)
        }}
        onMouseEnter={() => handleMouseEnter(message.id)}
        onMouseLeave={handleMouseLeave}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: 'rgba(0, 0, 0, 0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(0, 0, 0, 0.1)',
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: '#007AFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>🎤</span>
          </div>
          <audio
            controls
            preload="metadata"
            style={{
              flex: 1,
              borderRadius: '8px',
              minHeight: '32px',
              maxHeight: '40px',
            }}
            onLoadStart={() => {
              console.log('🎵 Audio loading started:', message.audioUrl);
            }}
            onCanPlay={() => {
              console.log('✅ Audio can play:', message.audioUrl);
            }}
            onError={(e) => {
              console.error('❌ Failed to load audio:', message.audioUrl, e);
            }}
          >
            <source src={message.audioUrl} type="audio/wav" />
            <source src={message.audioUrl} type="audio/mpeg" />
            <source src={message.audioUrl} type="audio/mp4" />
            Your browser does not support the audio element.
          </audio>
          <button
            onClick={handleDownloadAudio}
            style={{
              background: 'transparent',
              border: '1px solid rgba(0, 0, 0, 0.2)',
              borderRadius: '6px',
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: '10px',
              color: '#666',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.2)';
            }}
            title="Download audio file"
          >
            📥
          </button>
        </div>
      </div>
    );
  };

  const renderAssistantMessage = (message: Message) => (
    <div
      key={message.id}
      style={styles.messageAssistant}
      onMouseEnter={() => handleMouseEnter(message.id)}
      onMouseLeave={handleMouseLeave}
    >
      {message.isLoading ? (
        <LoadingDots />
      ) : (
        <div 
          dangerouslySetInnerHTML={{ 
            __html: marked(message.content, {
              breaks: true,
              gfm: true
            })
          }} 
        />
      )}
    </div>
  );

  const renderUserMessage = (message: Message) => (
    <div
      key={message.id}
      style={styles.messageUser}
    >
      {message.isLoading ? (
        <LoadingDots />
      ) : (
        <div 
          dangerouslySetInnerHTML={{ 
            __html: message.content
          }} 
        />
      )}
    </div>
  );

  const renderMessage = (message: Message) => {
    console.log('🎯 Rendering message:', {
      id: message.id,
      type: message.type,
      sender: message.sender,
      hasImageUrl: !!message.imageUrl,
      hasAudioUrl: !!message.audioUrl
    });
    
    // Handle screenshot image messages
    if (message.type === 'screenshot' && message.imageUrl) {
      console.log('🖼️ Rendering screenshot message');
      return renderScreenshotMessage(message);
    }

    // Handle audio messages
    if (message.type === 'audio' && message.audioUrl) {
      console.log('🎤 Rendering audio message');
      return renderAudioMessage(message);
    }

    // Handle assistant text messages
    if (message.sender === 'assistant') {
      console.log('🤖 Rendering assistant message');
      return renderAssistantMessage(message);
    }

    // Handle user messages
    if (message.sender === 'user') {
      console.log('👤 Rendering user message');
      return renderUserMessage(message);
    }

    // Fallback for unhandled message types
    console.warn('🚨 Unhandled message type:', message);
    return null;
  };

  const renderHeader = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '5px 10px',
      borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
    }} className="no-drag">
      <div style={{
        fontSize: '12px',
        color: '#666',
        fontWeight: '500',
      }}>
        {isLoadingHistory ? 'Loading history...' : `${messages.length} messages`}
      </div>
      <button
        onClick={clearConversation}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#666',
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: '4px',
          transition: 'all 0.2s ease',
          fontFamily: 'Helvetica, "Helvetica Neue", Arial, sans-serif',
          fontSize: '12px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        End Conversation
      </button>
    </div>
  );

  const renderMessagesContainer = () => (
    <div 
      ref={messagesContainerRef}
      className="no-drag"
      style={{
        ...styles.messagesContainer,
        fontFamily: 'Helvetica, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      {messages.length === 0 ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100px',
          color: '#666',
          fontSize: '14px',
        }}>
          {isLoadingHistory ? 'Loading conversation history...' : 'No messages yet'}
        </div>
      ) : (
        messages.map(renderMessage)
      )}
      <div ref={messagesEndRef} />
    </div>
  );

  const renderInputArea = () => (
    <div style={{ ...styles.chatInputContainer, position: 'relative' }}>
      <button
        onClick={handleScreenshotClick}
        disabled={isUserActionLoading}
        style={{
          ...styles.cameraButton,
          ...(isInputHovered &&
            hoverEffects.buttonHover && {
              backgroundColor: '#000000',
              color: 'white',
              fontFamily: 'Helvetica, "Helvetica Neue", Arial, sans-serif',
            }),
        }}
        className="no-drag"
        onMouseEnter={() => setIsInputHovered(true)}
        onMouseLeave={() => setIsInputHovered(false)}
      >
        <CameraIcon />
      </button>

      <textarea
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Ask anything..."
        style={{
          ...styles.chatInput,
          ...(isInputHovered && {
            borderColor: '#000000',
            boxShadow: '0 0 0 1px rgba(0, 122, 255, 0.1)',
          }),
        }}
        className="no-drag"
        onMouseEnter={() => setIsInputHovered(true)}
        onMouseLeave={() => setIsInputHovered(false)}
        disabled={isUserActionLoading}
      />

      <button
        onClick={handleMicClick}
        disabled={isUserActionLoading}
        style={{
          ...styles.cameraButton,
          ...(isMicActive && {
            backgroundColor: '#ff4444',
            color: 'white',
          }),
          ...(isMicButtonHovered &&
            hoverEffects.buttonHover && {
              backgroundColor: isMicActive ? '#cc3333' : '#000000',
              color: 'white',
              fontFamily: 'Helvetica, "Helvetica Neue", Arial, sans-serif',
            }),
        }}
        className="no-drag"
        onMouseEnter={() => setIsMicButtonHovered(true)}
        onMouseLeave={() => setIsMicButtonHovered(false)}
      >
        <MicrophoneIcon />
      </button>

      <button
        onClick={handleSend}
        disabled={!inputValue.trim() || isSending || isUserActionLoading}
        style={{
          ...styles.sendButton(Boolean(!inputValue.trim() || isSending || isUserActionLoading)),
          ...(isSendButtonHovered &&
            hoverEffects.buttonHover && {
              backgroundColor: '#000000',
              color: 'white',
              fontFamily: 'Helvetica, "Helvetica Neue", Arial, sans-serif',
            }),
        }}
        className="no-drag"
        onMouseEnter={() => setIsSendButtonHovered(true)}
        onMouseLeave={() => setIsSendButtonHovered(false)}
      >
        <SendIcon />
      </button>
    </div>
  );

  // --------------------------------------------------------------------------
  // MAIN RENDER
  // --------------------------------------------------------------------------

  return (
    <div style={styles.insightsPanel}>
      {renderHeader()}
      {renderMessagesContainer()}
      {renderInputArea()}
    </div>
  );
};
