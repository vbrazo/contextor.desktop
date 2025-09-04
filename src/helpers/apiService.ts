import axios, { AxiosResponse } from 'axios';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ConversationCreateRequest {
  title?: string;
}

interface ConversationResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      title: string;
      user_id: number;
      message_count: number;
      created_at: string;
      updated_at: string;
    };
  };
}

interface MessageCreateRequest {
  content_type: 'text' | 'screenshot' | 'audio';
  text_content?: string;
  screenshot_url?: string;
  audio_url?: string;
  sender_type?: 'user' | 'ai';
}

interface MessageResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      content_type: string;
      text_content?: string;
      screenshot_url?: string;
      screenshot_image_url?: string;
      audio_url?: string;
      conversation_id: number;
      created_at: string;
      updated_at: string;
      content: string;
    };
  };
}

interface AIProcessResponse {
  user_message: MessageResponse;
  ai_response: MessageResponse;
}

interface UserResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      email: string;
      membership_status: string;
      membership_updated_at: string;
      message_count: number;
      messages_sent_today: number;
      current_membership_type: string;
    };
  };
}

// ============================================================================
// API SERVICE
// ============================================================================

export class APIService {
  private readonly baseUrl = 'https://contextor-api-c1cb32489441.herokuapp.com';

  // --------------------------------------------------------------------------
  // PRIVATE METHODS
  // --------------------------------------------------------------------------

  private getAuthHeaders(token?: string): { [key: string]: string } {
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  // --------------------------------------------------------------------------
  // PUBLIC METHODS
  // --------------------------------------------------------------------------

  async createConversation(token: string, data: ConversationCreateRequest = {}): Promise<ConversationResponse> {
    try {
      const response: AxiosResponse<ConversationResponse> = await axios.post(
        `${this.baseUrl}/conversations`,
        { conversation: data },
        { headers: this.getAuthHeaders(token) }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw new Error(`Failed to create conversation: ${error}`);
    }
  }

  async createMessage(token: string, conversationId: string, data: MessageCreateRequest): Promise<MessageResponse> {
    try {
      const response: AxiosResponse<MessageResponse> = await axios.post(
        `${this.baseUrl}/conversations/${conversationId}/messages`,
        { message: data },
        { headers: this.getAuthHeaders(token) }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to create message:', error);
      throw new Error(`Failed to create message: ${error}`);
    }
  }

  async processMessageWithAI(token: string, conversationId: string, data: MessageCreateRequest): Promise<AIProcessResponse> {
    try {
      const response: AxiosResponse<AIProcessResponse> = await axios.post(
        `${this.baseUrl}/conversations/${conversationId}/messages/process_with_ai`,
        { message: data },
        { headers: this.getAuthHeaders(token) }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to process message with AI:', error);
      throw new Error(`Failed to process message with AI: ${error}`);
    }
  }

  async processExistingMessageWithAI(token: string, conversationId: string, messageId: string): Promise<AIProcessResponse> {
    try {
      const response: AxiosResponse<AIProcessResponse> = await axios.post(
        `${this.baseUrl}/conversations/${conversationId}/messages/process_with_ai`,
        { message_id: messageId },
        { headers: this.getAuthHeaders(token) }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to process existing message with AI:', error);
      throw new Error(`Failed to process existing message with AI: ${error}`);
    }
  }

  async returnCurrentUser(token: string): Promise<UserResponse> {
    try {
      const response: AxiosResponse<UserResponse> = await axios.get(
        `${this.baseUrl}/me`,
        { headers: this.getAuthHeaders(token) }
      );
      return response.data;
    } catch (error) {
      console.error('Failed to get current user:', error);
      throw new Error(`Failed to get current user: ${error}`);
    }
  }
}

export type { ConversationResponse, MessageResponse, MessageCreateRequest, ConversationCreateRequest, AIProcessResponse }; 