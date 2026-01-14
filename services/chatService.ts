// Chat Service - NGROK Backend Connection
// Backend URL: https://fred-athetoid-setsuko.ngrok-free.dev

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface ChatResponse {
  role: 'assistant';
  content: string;
  timestamp: number;
}

export class ChatService {
  private readonly API_URL = 'https://fred-athetoid-setsuko.ngrok-free.dev/api/chat';

  async sendMessage(messages: ChatMessage[]): Promise<ChatResponse> {
    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        role: 'assistant',
        content: data.content || data.message || 'I understand. How can I help you further?',
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('Chat service error:', error);
      
      // Graceful fallback for network errors or backend down
      return {
        role: 'assistant',
        content: 'I\'m having trouble connecting right now, but I\'m here to listen. Could you tell me more about what\'s on your mind?',
        timestamp: Date.now()
      };
    }
  }

  async sendMessageStream(
    messages: ChatMessage[], 
    onToken: (token: string) => void
  ): Promise<ChatResponse> {
    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      let fullContent = '';
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                const token = parsed.content || parsed.choices?.[0]?.delta?.content || '';
                if (token) {
                  fullContent += token;
                  onToken(token);
                }
              } catch (e) {
                // Ignore malformed JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return {
        role: 'assistant',
        content: fullContent || 'I understand. How can I help you further?',
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('Chat streaming error:', error);
      
      // Graceful fallback for streaming errors
      const fallbackResponse = await this.sendMessage(messages);
      onToken(fallbackResponse.content);
      return fallbackResponse;
    }
  }
}

export const chatService = new ChatService();
