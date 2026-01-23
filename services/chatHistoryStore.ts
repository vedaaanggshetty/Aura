// Chat History Store - Manages multiple conversations with localStorage persistence

import { Message, MessageRole } from '../types';

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: number;
}

export interface ChatHistoryStore {
  // Conversation management
  createConversation(welcomeMessage?: Message): string;
  getConversations(): Conversation[];
  getConversationById(id: string): Conversation | undefined;
  deleteConversation(id: string): void;
  setActiveConversation(id: string): void;
  getActiveConversation(): Conversation | undefined;
  
  // Message management
  addMessage(conversationId: string, message: Message): void;
  updateLastAssistantMessage(conversationId: string, content: string): void;
  finalizeLastAssistantMessage(conversationId: string): void;
  
  // Subscription
  subscribe(callback: () => void): () => void;
}

class ChatHistoryStoreImpl implements ChatHistoryStore {
  private readonly STORAGE_KEY = 'aura_chat_history';
  private subscribers: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  // Conversation management
  createConversation(welcomeMessage?: Message): string {
    const conversation: Conversation = {
      id: Date.now().toString(),
      title: welcomeMessage?.content.slice(0, 50) || 'New Conversation',
      messages: welcomeMessage ? [welcomeMessage] : [],
      lastUpdated: Date.now()
    };

    const conversations = this.getConversations();
    conversations.push(conversation);
    this.setActiveConversation(conversation.id);
    this.saveToStorage(conversations);
    
    return conversation.id;
  }

  getConversations(): Conversation[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return [];
    
    try {
      return JSON.parse(stored);
    } catch {
      console.error('Failed to parse chat history from localStorage', stored);
      return [];
    }
  }

  getConversationById(id: string): Conversation | undefined {
    const conversations = this.getConversations();
    return conversations.find(conv => conv.id === id);
  }

  deleteConversation(id: string): void {
    const conversations = this.getConversations();
    const updated = conversations.filter((conv) => conv.id !== id);
    this.saveToStorage(updated);

    const active = this.getActiveConversation();
    if (!active && updated.length > 0) {
      this.setActiveConversation(updated[0].id);
      return;
    }

    this.notifySubscribers();
  }

  setActiveConversation(id: string): void {
    const conversations = this.getConversations();
    const updatedConversations = conversations.map(conv => ({
      ...conv,
      lastUpdated: conv.id === id ? Date.now() : conv.lastUpdated
    }));
    
    this.saveToStorage(updatedConversations);
    this.notifySubscribers();
  }

  getActiveConversation(): Conversation | undefined {
    const conversations = this.getConversations();
    const activeConv = conversations.find(conv => conv.lastUpdated === Math.max(...conversations.map(c => c.lastUpdated)));
    return activeConv;
  }

  // Message management
  addMessage(conversationId: string, message: Message): void {
    const conversations = this.getConversations();
    const conversationIndex = conversations.findIndex(conv => conv.id === conversationId);
    
    if (conversationIndex === -1) {
      console.error('Conversation not found:', conversationId);
      return;
    }

    const conversation = conversations[conversationIndex];
    conversation.messages.push(message);
    conversation.lastUpdated = Date.now();
    
    // Auto-generate title from first user message if needed
    if (!conversation.title && message.role === MessageRole.USER && conversation.messages.length === 1) {
      conversation.title = message.content.slice(0, 50);
    }

    this.saveToStorage(conversations);
    this.notifySubscribers();
  }

  finalizeLastAssistantMessage(conversationId: string): void {
    const conversations = this.getConversations();
    const conversationIndex = conversations.findIndex(conv => conv.id === conversationId);

    if (conversationIndex === -1) {
      console.error('Conversation not found:', conversationId);
      return;
    }

    const conversation = conversations[conversationIndex];
    const lastMessage = conversation.messages[conversation.messages.length - 1];

    if (lastMessage && lastMessage.role === MessageRole.ASSISTANT) {
      lastMessage.isStreaming = false;
      conversation.lastUpdated = Date.now();
    }

    this.saveToStorage(conversations);
    this.notifySubscribers();
  }

 updateLastAssistantMessage(conversationId: string, content: string): void {
  const conversations = this.getConversations();
  const conversationIndex = conversations.findIndex(conv => conv.id === conversationId);

  if (conversationIndex === -1) return;

  const conversation = conversations[conversationIndex];
  const lastMessage = conversation.messages[conversation.messages.length - 1];

  if (lastMessage && lastMessage.role === MessageRole.ASSISTANT) {
    lastMessage.content = content;
    // DO NOT toggle isStreaming here
    conversation.lastUpdated = Date.now();
  }

  this.saveToStorage(conversations);
  this.notifySubscribers();
}


  // Storage persistence
  private saveToStorage(conversations: Conversation[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(conversations));
    } catch (error) {
      console.error('Failed to save chat history to localStorage', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const conversations = JSON.parse(stored);
        // Set active conversation if none exists
        if (conversations.length > 0 && !this.getActiveConversation()) {
          this.setActiveConversation(conversations[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load chat history from localStorage', error);
    }
  }

  // Subscription system
  subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback());
  }
}

export const chatHistoryStore = new ChatHistoryStoreImpl();
