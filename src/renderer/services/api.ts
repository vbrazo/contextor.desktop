// API service for making authenticated requests to the backend
const API_BASE_URL = 'https://contextor-api-c1cb32489441.herokuapp.com';

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
}

interface MessageResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      content_type: string;
      text_content?: string;
      screenshot_url?: string;
      audio_url?: string;
      conversation_id: number;
      created_at: string;
      updated_at: string;
      content: string;
    };
  };
}

class ApiService {
  private getAuthHeaders(): { [key: string]: string } {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  async createConversation(data: ConversationCreateRequest = {}): Promise<ConversationResponse> {
    const response = await fetch(`${API_BASE_URL}/conversations`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ conversation: data }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create conversation: ${response.statusText}`);
    }

    return response.json();
  }

  async createMessage(conversationId: string, data: MessageCreateRequest): Promise<MessageResponse> {
    const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ message: data }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create message: ${response.statusText}`);
    }

    return response.json();
  }
}

export const apiService = new ApiService();
export type { ConversationResponse, MessageResponse, MessageCreateRequest, ConversationCreateRequest }; 