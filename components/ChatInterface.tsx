import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowUp, StopCircle, Feather, Menu } from 'lucide-react';
import { Message, MessageRole } from '../types';
import { chatService, ChatMessage } from '../services/chatService';
import { SUGGESTIONS } from '../constants';
import { SignedIn, SignedOut, SignInButton, useUser } from './AuthContext';
import ConversationSidebar from './ConversationSidebar';
import { chatHistoryStore } from '../services/chatHistoryStore';

const formatDate = (timestamp: number) => {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    hour: 'numeric',
    minute: 'numeric'
  }).format(new Date(timestamp));
};

const shouldShowTimestamp = (current: number, prev: number) => {
  return current - prev > 30 * 60 * 1000;
};

const AuthGate = () => (
  <div className="min-h-screen flex items-center justify-center bg-background px-6">
    <div className="max-w-md w-full text-center space-y-10">
      <div className="flex justify-center">
        <div className="w-12 h-12 rounded-full bg-surface border border-borderDim flex items-center justify-center text-textMain">
          <Feather size={20} strokeWidth={1.5} />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-4xl font-serif italic text-textMain">A quiet space for your mind.</h2>
        <p className="text-textSec font-light text-lg leading-relaxed">
          Sign in to begin your private journal. Your thoughts are encrypted and yours alone.
        </p>
      </div>

      <SignInButton mode="modal">
        <button className="w-full py-4 bg-textMain text-background rounded-xl font-medium tracking-wide hover:shadow-lg hover:-translate-y-0.5 transition-all duration-500">
          Enter Sanctuary
        </button>
      </SignInButton>
    </div>
  </div>
);

const ChatSession: React.FC = () => {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    try {
      return localStorage.getItem('aura_sidebar_open') === 'true';
    } catch {
      return false;
    }
  });
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('aura_sidebar_open', String(isSidebarOpen));
    } catch {
      // ignore
    }
  }, [isSidebarOpen]);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('aura_sidebar_open', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  useEffect(() => {
    if (!user?.id) return;

    const active = chatHistoryStore.getActiveConversation();
    if (!active) {
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        role: MessageRole.ASSISTANT,
        content: `Hello, ${user.firstName || 'friend'}. I'm listening.`,
        timestamp: Date.now()
      };

      const newId = chatHistoryStore.createConversation(welcomeMessage);
      setActiveConversationId(newId);
      setMessages(chatHistoryStore.getConversationById(newId)?.messages ?? []);
      return;
    }

    setActiveConversationId(active.id);
    setMessages(active.messages);
  }, [user?.id, user?.firstName]);

  useEffect(() => {
    const unsubscribe = chatHistoryStore.subscribe(() => {
      const id = activeConversationId ?? chatHistoryStore.getActiveConversation()?.id ?? null;
      if (!id) return;
      const conv = chatHistoryStore.getConversationById(id);
      if (!conv) return;
      setMessages(conv.messages);
    });

    return unsubscribe;
  }, [activeConversationId]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
  }, [input]);

  useEffect(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [messages, isTyping]);

  const handleConversationSelect = (id: string) => {
    chatHistoryStore.setActiveConversation(id);
    setActiveConversationId(id);
    const conv = chatHistoryStore.getConversationById(id);
    setMessages(conv?.messages ?? []);
  };

  const handleSend = async (text: string = input) => {
    if (!text.trim() || isTyping || !user?.id) return;
    const conversationId = activeConversationId ?? chatHistoryStore.getActiveConversation()?.id;
    if (!conversationId) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: MessageRole.USER,
      content: text,
      timestamp: Date.now()
    };
    chatHistoryStore.addMessage(conversationId, userMsg);

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsTyping(true);

    const assistantMsgId = (Date.now() + 1).toString();
    chatHistoryStore.addMessage(conversationId, {
      id: assistantMsgId,
      role: MessageRole.ASSISTANT,
      content: '',
      timestamp: Date.now(),
      isStreaming: true
    });

    try {
      const conv = chatHistoryStore.getConversationById(conversationId);
      const chatMessages: ChatMessage[] = (conv?.messages ?? [])
        .filter((m) => m.id !== assistantMsgId)
        .map((msg) => ({
          role: msg.role === MessageRole.USER ? 'user' : 'assistant',
          content: msg.content
        }));

      let accum = '';
      await chatService.sendMessageStream(chatMessages, (token) => {
        accum += token;
        chatHistoryStore.updateLastAssistantMessage(conversationId, accum);
      });
    } catch (error) {
      console.error('Failed to send message', error);
    } finally {
      setIsTyping(false);
      chatHistoryStore.finalizeLastAssistantMessage(conversationId);
      chatHistoryStore.setActiveConversation(conversationId);
    }
  };

  return (
    <div className="flex h-screen bg-background relative overflow-hidden">
      <ConversationSidebar
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
        onConversationSelect={handleConversationSelect}
        activeConversationId={activeConversationId}
      />

      <div className="flex-1 flex flex-col">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-surface/50 blur-[100px] rounded-full opacity-60" />
        </div>

        <div className="h-24 flex-shrink-0 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-surface/80 transition-colors"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 scrollbar-hide z-10">
          <div className="max-w-3xl mx-auto flex flex-col pb-8">
            {messages.map((msg, idx) => {
              const prevMsg = messages[idx - 1];
              const showTime = !prevMsg || shouldShowTimestamp(msg.timestamp, prevMsg.timestamp);

              return (
                <React.Fragment key={msg.id}>
                  {showTime && (
                    <div className="flex justify-center my-12 opacity-0 animate-fade-in">
                      <span className="text-xs font-serif italic text-textMuted tracking-widest border-b border-borderDim pb-1 px-4">
                        {formatDate(msg.timestamp)}
                      </span>
                    </div>
                  )}

                  <div
                    className={`
                      flex flex-col w-full mb-8
                      ${msg.role === MessageRole.USER ? 'items-end' : 'items-start'}
                    `}
                  >
                    <span
                      className={`
                        text-[10px] uppercase tracking-widest text-textMuted mb-2 px-1
                        ${msg.role === MessageRole.USER ? 'text-right' : 'text-left'}
                      `}
                    >
                      {msg.role === MessageRole.USER ? 'You' : 'Aura'}
                    </span>

                    <div
                      className={`
                        relative max-w-[95%] md:max-w-[85%] rounded-2xl
                        ${msg.role === MessageRole.USER
                          ? 'bg-surface/60 px-8 py-6 text-textMain text-lg font-light leading-relaxed border border-borderDim/30 shadow-sm'
                          : 'px-1 py-2 text-textMain text-lg font-light leading-relaxed'}
                      `}
                    >
                      {msg.role === MessageRole.ASSISTANT ? (
                        <div className="prose prose-lg prose-neutral dark:prose-invert max-w-none font-light leading-8">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap leading-8">{msg.content}</p>
                      )}
                    </div>

                    {msg.isStreaming && msg.role === MessageRole.ASSISTANT && (
                      <div className="flex items-center gap-2 mt-4 ml-2">
                        <span className="w-1.5 h-1.5 bg-textMuted/40 rounded-full animate-pulse" />
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-2 pl-2 py-4 mb-4">
                <span className="text-xs text-textMuted italic font-serif pr-2">Aura is thinking</span>
                <div className="flex gap-1">
                  <span className="w-1 h-1 bg-textMuted/30 rounded-full animate-[breathe_1.5s_infinite]" />
                  <span className="w-1 h-1 bg-textMuted/30 rounded-full animate-[breathe_1.5s_infinite_0.3s]" />
                  <span className="w-1 h-1 bg-textMuted/30 rounded-full animate-[breathe_1.5s_infinite_0.6s]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-8" />
          </div>
        </div>

        <div className="flex-shrink-0 z-20 pb-10 pt-6 px-4 bg-gradient-to-t from-background via-background to-transparent">
          <div className="max-w-3xl mx-auto relative flex flex-col gap-4">
            <div className="flex flex-wrap gap-2 justify-center opacity-80 hover:opacity-100 transition-opacity">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(s)}
                  className="text-xs text-textSec hover:text-textMain px-3 py-1.5 rounded-full border border-transparent hover:border-borderDim transition-all duration-500 cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>

            <div
              className="
                relative group rounded-3xl
                bg-elevated dark:bg-surface
                shadow-soft
                border border-borderDim
                transition-all duration-500
                focus-within:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] focus-within:-translate-y-1
              "
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Write your thoughts..."
                className="
                  w-full bg-transparent border-none
                  rounded-3xl
                  px-8 py-6
                  text-lg font-light leading-relaxed
                  placeholder-textMuted/40
                  focus:ring-0 resize-none
                  min-h-[100px] max-h-[300px]
                "
                rows={1}
              />

              <div className="absolute right-4 bottom-4 flex items-center gap-3">
                <span className="text-[10px] text-textMuted/30 font-medium tracking-widest uppercase pointer-events-none hidden sm:block mr-2">
                  Return to send
                </span>
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping}
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500
                    ${input.trim()
                      ? 'bg-textMain text-background hover:scale-110 shadow-md'
                      : 'bg-surface border border-borderDim text-borderDim cursor-not-allowed'}
                  `}
                >
                  {isTyping ? <StopCircle size={18} /> : <ArrowUp size={20} strokeWidth={2} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChatInterface: React.FC = () => {
  return (
    <>
      <SignedIn>
        <ChatSession />
      </SignedIn>
      <SignedOut>
        <AuthGate />
      </SignedOut>
    </>
  );
};

export default ChatInterface;