import React, { useState, useRef, useEffect } from 'react';
import { styles, hoverEffects } from '../design-system/styles';
import { INTERVIEW_ASSISTANT_PROMPT } from '../../prompts';
import { marked } from 'marked';
import { LoadingDots } from './LoadingDots';
import { SendIcon } from './SendIcon';

interface CodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  isLoading?: boolean;
  imageUrl?: string;
  type?: 'text' | 'screenshot';
}

interface InsightsPanelProps {
  insights: string;
  isLoading: boolean;
  onSendMessage?: (message: string) => void;
  screenshotUrl?: string;
  onScreenshotProcessed?: () => void;
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({ 
  insights, 
  isLoading, 
  onSendMessage, 
  screenshotUrl,
  onScreenshotProcessed
}) => {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [isInputHovered, setIsInputHovered] = useState(false);
  const [isSendButtonHovered, setIsSendButtonHovered] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle insights updates and convert them to assistant messages
  useEffect(() => {
    console.log('🎯 InsightsPanel useEffect triggered:', { insights: insights?.slice(0, 50) + '...', screenshotUrl });
    if (insights && insights.trim()) {
      setMessages(prev => {
        // Check if this insight is already in messages
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.sender === 'assistant' && lastMessage.content === insights) {
          console.log('🎯 Duplicate message detected, skipping');
          return prev;
        }
        
        // Remove any loading message and add the actual response
        const filteredMessages = prev.filter(msg => !msg.isLoading);
        
        // Check if there's a screenshot URL to include
        const hasScreenshot = screenshotUrl !== null && screenshotUrl !== '';
        console.log('🎯 Screenshot check:', { hasScreenshot, screenshotUrl });
        
        const newMessages = [];
        
        // Add screenshot image message first if available
        if (hasScreenshot) {
          console.log('🖼️ Adding screenshot message with URL:', screenshotUrl);
          newMessages.push({
            id: `${Date.now()}-image`,
            content: '',
            sender: 'assistant' as const,
            timestamp: new Date(),
            imageUrl: screenshotUrl,
            type: 'screenshot' as const,
          });
          // Notify parent that screenshot has been processed
          onScreenshotProcessed?.();
        }
        
        // Add the text analysis message
        newMessages.push({
          id: Date.now().toString(),
          content: insights,
          sender: 'assistant' as const,
          timestamp: new Date(),
          type: 'text' as const,
        });
        
        console.log('🔄 New messages to add:', newMessages);
        const updatedMessages = [...filteredMessages, ...newMessages];
        console.log('📝 All messages after update:', updatedMessages);
        return updatedMessages;
      });
      setIsSending(false);
    }
  }, [insights, screenshotUrl]);

  // Handle loading state
  useEffect(() => {
    if (isLoading && isSending) {
      setMessages(prev => [
        ...prev.filter(msg => !msg.isLoading),
        {
          id: 'loading',
          content: 'Analyzing...',
          sender: 'assistant',
          timestamp: new Date(),
          isLoading: true,
        }
      ]);
    }
  }, [isLoading, isSending]);

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const messageContent = inputValue.trim();
    setInputValue('');
    setIsSending(true);

    // Check if the message contains a URL for screenshot creation
    if (isValidUrl(messageContent)) {
      try {
        // Create a screenshot request - this would be your HTTP call
        // For now, we'll use the existing onSendMessage callback
        if (onSendMessage) {
          onSendMessage(`screenshot-url:${messageContent}`);
        }
      } catch (error) {
        console.error('Failed to create screenshot:', error);
        setMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            content: 'Failed to create screenshot. Please try again.',
            sender: 'assistant',
            timestamp: new Date(),
          }
        ]);
        setIsSending(false);
      }
    } else {
      // Regular message
      if (onSendMessage) {
        onSendMessage(messageContent);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMessage = (message: Message) => {
    const isUser = message.sender === 'user';
    const baseStyle = isUser ? styles.messageUser : styles.messageAssistant;
    const isHovered = hoveredMessageId === message.id;
    
    // Handle screenshot image messages
    if (message.type === 'screenshot' && message.imageUrl) {
      return (
        <div
          key={message.id}
          style={{
            ...styles.messageScreenshot,
            ...(isHovered && hoverEffects.messageHover)
          }}
          className="no-drag"
          onMouseEnter={() => setHoveredMessageId(message.id)}
          onMouseLeave={() => setHoveredMessageId(null)}
        >
          <img
            src={message.imageUrl}
            alt="Screenshot"
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: '300px',
              objectFit: 'contain',
              display: 'block',
            }}
            onLoad={() => {
              console.log('✅ Screenshot image loaded successfully:', message.imageUrl);
            }}
            onError={(e) => {
              console.error('❌ Failed to load screenshot image:', message.imageUrl);
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      );
    }
    
    return (
      <div
        key={message.id}
        style={{
          ...baseStyle,
          ...(isHovered && hoverEffects.messageHover)
        }}
        className="no-drag"
        onMouseEnter={() => setHoveredMessageId(message.id)}
        onMouseLeave={() => setHoveredMessageId(null)}
      >
        {message.isLoading ? <LoadingDots /> : (
          <div 
            style={{ whiteSpace: 'pre-wrap' }}
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
  };

  return (
    <div style={{...styles.insightsPanel}}>
      <style>
        {`
          @keyframes pulse {
            0%, 80%, 100% {
              opacity: 0.3;
            }
            40% {
              opacity: 1;
            }
          }
        `}
      </style>
      
      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        style={styles.messagesContainer}
        className="no-drag insights-scroll"
      >
        {messages.length === 0 ? (
          <div style={{ 
            ...styles.messageAssistant, 
            alignSelf: 'stretch',
            maxWidth: 'none',
            opacity: 0.8 
          }}>
            <div style={{ whiteSpace: 'pre-line' }}>
              {INTERVIEW_ASSISTANT_PROMPT}
            </div>
          </div>
        ) : (
          messages.map(renderMessage)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={styles.chatInputContainer} className="no-drag">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask a question about the screenshots"
          style={{
            ...styles.chatInput,
            ...(isInputHovered && {
              borderColor: '#007AFF',
              boxShadow: '0 0 0 2px rgba(0, 122, 255, 0.1)',
            })
          }}
          onMouseEnter={() => setIsInputHovered(true)}
          onMouseLeave={() => setIsInputHovered(false)}
          rows={1}
          disabled={isSending}
        />
        <button
          onClick={handleSend}
          disabled={!inputValue.trim() || isSending}
          style={{
            ...styles.sendButton(!inputValue.trim() || isSending),
            ...(isSendButtonHovered && !(!inputValue.trim() || isSending) && hoverEffects.buttonHover)
          }}
          onMouseEnter={() => setIsSendButtonHovered(true)}
          onMouseLeave={() => setIsSendButtonHovered(false)}
        >
          {isSending ? <LoadingDots /> : <SendIcon />}
        </button>
      </div>
    </div>
  );
}; 