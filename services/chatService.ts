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
          message: messages[messages.length - 1].content,
          history: messages.slice(0, -1).map(m => m.content)
        })
      });

      if (!response.ok) {
        if (response.status === 422) {
          throw new Error('Schema error: Request format mismatch');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        role: 'assistant',
        content: data.reply,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('Chat service error:', error);
      
      // Only use fallback for network failures or 5xx errors, not 422 schema errors
      if (error instanceof Error && 
          (error.message.includes('fetch') || 
           error.message.includes('network') ||
           error.message.includes('HTTP error! status: 5'))) {
        return {
          role: 'assistant',
          content: 'I\'m having trouble connecting right now, but I\'m here to listen. Could you tell me more about what\'s on your mind?',
          timestamp: Date.now()
        };
      }
      
      // Re-throw schema errors and other issues
      throw error;
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
