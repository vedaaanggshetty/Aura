import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowUp, StopCircle, Feather, Mic, MicOff, Volume2, VolumeX, Settings } from 'lucide-react';
import { Message, MessageRole } from '../types';
import { chatService, ChatMessage } from '../services/chatService';
import { voiceService, VoiceRecordingState } from '../services/voiceService';
import { textToSpeechService } from '../services/textToSpeechService';
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
        <div className="hidden md:flex md:flex-col w-72 h-full bg-surface/20 border-r border-borderDim/30 s-center justify-center text-textMain">
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
        <button className="w-full py-2 px-4 bg-surface/25 text-textMain rounded-lg font-medium hover:bg-surface/40 transition-colors">
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
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [voiceRecording, setVoiceRecording] = useState<VoiceRecordingState>({
    isRecording: false,
    isProcessing: false,
    duration: 0
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSpeakingId, setCurrentSpeakingId] = useState<string | null>(null);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [voiceSettings, setVoiceSettings] = useState({
    rate: 0.85,
    pitch: 0.95,
    volume: 0.7,
    voiceIndex: undefined as number | undefined
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recordingTimer = useRef<NodeJS.Timeout | null>(null);

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

  const handleVoiceRecording = async () => {
    if (voiceRecording.isRecording) {
      setVoiceRecording(prev => ({ ...prev, isRecording: false, isProcessing: true }));
      
      try {
        const audioBlob = await voiceService.stopRecording();
        const analysisResult = await voiceService.analyzeVoice(audioBlob);
        
        const conversationId = activeConversationId ?? chatHistoryStore.getActiveConversation()?.id;
        if (conversationId && user?.id) {
          const voiceMsg: Message = {
            id: Date.now().toString(),
            role: MessageRole.USER,
            content: "Voice message recorded",
            timestamp: Date.now(),
            voiceEmotion: analysisResult.analysis
          };
          
          chatHistoryStore.addMessage(conversationId, voiceMsg);
          handleSend("I just recorded a voice message. Can you help me reflect on how I'm feeling?");
        }
      } catch (error) {
        console.error('Voice recording failed:', error);
      } finally {
        setVoiceRecording({ isRecording: false, isProcessing: false, duration: 0 });
        if (recordingTimer.current) {
          clearInterval(recordingTimer.current);
          recordingTimer.current = null;
        }
      }
    } else {
      try {
        await voiceService.startRecording();
        setVoiceRecording({ isRecording: true, isProcessing: false, duration: 0 });
        
        recordingTimer.current = setInterval(() => {
          setVoiceRecording(prev => ({ ...prev, duration: prev.duration + 1 }));
        }, 1000);
      } catch (error) {
        console.error('Failed to start recording:', error);
      }
    }
  };

  const handleTextToSpeech = async (text: string, messageId: string) => {
    console.log('TTS button clicked for message:', messageId);
    
    // If currently speaking this message, stop
    if (isSpeaking && currentSpeakingId === messageId) {
      console.log('Stopping speech');
      textToSpeechService.stop();
      setIsSpeaking(false);
      setCurrentSpeakingId(null);
      return;
    }

    // Stop any other speech
    if (isSpeaking) {
      console.log('Stopping other speech');
      textToSpeechService.stop();
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    try {
      console.log('Starting TTS with settings:', voiceSettings);
      setIsSpeaking(true);
      setCurrentSpeakingId(messageId);
      
      await textToSpeechService.speak(text, voiceSettings);
      
      console.log('TTS completed successfully');
    } catch (error) {
      console.error('Text-to-speech failed:', error);
      alert(`Unable to play audio: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your browser settings.`);
    } finally {
      setIsSpeaking(false);
      setCurrentSpeakingId(null);
    }
  };

  useEffect(() => {
    return () => {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
      textToSpeechService.stop();
    };
  }, []);

  const voiceOptions = textToSpeechService.getVoiceOptions();

  return (
    <div className="flex h-[calc(100vh-5rem)] bg-background relative overflow-hidden">
      <ConversationSidebar
        onConversationSelect={handleConversationSelect}
        activeConversationId={activeConversationId}
      />

      <div className="flex-1 flex flex-col bg-surface/20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-surface/20 blur-[100px] rounded-full opacity-30" />
        </div>

        {/* Voice Settings Panel */}
        {showVoiceSettings && (
          <div className="absolute top-4 right-4 z-30 bg-surface/95 backdrop-blur-md rounded-2xl border border-borderDim/40 shadow-lg p-6 w-80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-textMain">Aura's Voice</h3>
              <button
                onClick={() => setShowVoiceSettings(false)}
                className="text-textMuted hover:text-textMain transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-textSec mb-2 block">Voice</label>
                <select
                  value={voiceSettings.voiceIndex ?? ''}
                  onChange={(e) => setVoiceSettings(prev => ({
                    ...prev,
                    voiceIndex: e.target.value ? parseInt(e.target.value) : undefined
                  }))}
                  className="w-full bg-surface/60 border border-borderDim/40 rounded-lg px-3 py-2 text-sm text-textMain focus:outline-none focus:border-borderDim/60"
                >
                  <option value="">Auto (Recommended)</option>
                  {voiceOptions.map(voice => (
                    <option key={voice.index} value={voice.index}>
                      {voice.name} {voice.isRecommended ? '⭐' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-textSec mb-2 block flex justify-between">
                  <span>Speed</span>
                  <span className="text-textMuted">{voiceSettings.rate.toFixed(2)}x</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={voiceSettings.rate}
                  onChange={(e) => setVoiceSettings(prev => ({ ...prev, rate: parseFloat(e.target.value) }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs text-textSec mb-2 block flex justify-between">
                  <span>Pitch</span>
                  <span className="text-textMuted">{voiceSettings.pitch.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={voiceSettings.pitch}
                  onChange={(e) => setVoiceSettings(prev => ({ ...prev, pitch: parseFloat(e.target.value) }))}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs text-textSec mb-2 block flex justify-between">
                  <span>Volume</span>
                  <span className="text-textMuted">{Math.round(voiceSettings.volume * 100)}%</span>
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={voiceSettings.volume}
                  onChange={(e) => setVoiceSettings(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
                  className="w-full"
                />
              </div>

              <button
                onClick={() => setVoiceSettings({ rate: 0.85, pitch: 0.95, volume: 0.7, voiceIndex: undefined })}
                className="w-full py-2 px-4 bg-surface/60 text-textSec rounded-lg text-xs hover:bg-surface/80 transition-colors"
              >
                Reset to Defaults
              </button>

              <button
                onClick={async () => {
                  try {
                    await textToSpeechService.speak("Hello, I'm Aura. This is a test of my voice.", voiceSettings);
                  } catch (error) {
                    alert(`Voice test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
                  }
                }}
                className="w-full py-2 px-4 bg-textMain/20 text-textMain rounded-lg text-xs hover:bg-textMain/30 transition-colors"
              >
                Test Voice
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 scrollbar-hide z-10 min-w-0">
          <div className="max-w-3xl mx-auto">
            {messages.map((msg, idx) => {
              const prevMsg = messages[idx - 1];
              const showTime = !prevMsg || shouldShowTimestamp(msg.timestamp, prevMsg.timestamp);

              return (
                <React.Fragment key={msg.id}>
                  {showTime && (
                    <div className="flex justify-center my-2 opacity-60 animate-fade-in">
                      <span className="text-[10px] font-serif italic text-textMuted/60 tracking-widest border-b border-borderDim/30 pb-0.5 px-3">
                        {formatDate(msg.timestamp)}
                      </span>
                    </div>
                  )}

                  <div
                    className={`
                      mb-3
                      ${msg.role === MessageRole.USER ? 'flex justify-end' : 'flex justify-start'}
                    `}
                  >
                    <div className="max-w-[80%]">
                      <span
                        className={`
                          text-[9px] uppercase tracking-wider text-textMuted/50 mb-1 block
                          ${msg.role === MessageRole.USER ? 'text-right' : 'text-left'}
                        `}
                      >
                        {msg.role === MessageRole.USER ? 'You' : 'Aura'}
                      </span>

                      <div
                        className={`
                          rounded-2xl
                          ${msg.role === MessageRole.USER
                            ? 'bg-surface/70 px-4 py-3 text-textMain text-base font-light leading-relaxed border border-borderDim/40 shadow-sm'
                            : 'px-4 py-3 text-textMain text-base font-light leading-relaxed'}
                        `}
                      >
                        {msg.role === MessageRole.ASSISTANT ? (
                          <div className="prose prose-base prose-neutral dark:prose-invert max-w-none font-light leading-7">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap leading-7">{msg.content}</p>
                        )}
                      </div>

                      {msg.role === MessageRole.ASSISTANT && msg.content && !msg.isStreaming && (
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => handleTextToSpeech(msg.content, msg.id)}
                            className={`p-2.5 rounded-full transition-all duration-300 border
                              ${isSpeaking && currentSpeakingId === msg.id
                                ? 'bg-textMain/20 text-textMain border-textMain/40 animate-pulse shadow-lg'
                                : 'bg-surface/60 text-textMain/80 border-borderDim/40 hover:text-textMain hover:bg-surface/80 hover:border-borderDim/60 hover:shadow-md'}`}
                            title={isSpeaking && currentSpeakingId === msg.id ? 'Stop speaking' : 'Listen to this message'}
                          >
                            {isSpeaking && currentSpeakingId === msg.id ? <VolumeX size={16} /> : <Volume2 size={16} />}
                          </button>

                          {!isSpeaking && (
                            <button
                              onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                              className="p-2.5 rounded-full bg-surface/40 text-textMuted/70 border border-borderDim/40 hover:text-textMain hover:bg-surface/60 hover:border-borderDim/60 transition-all duration-300"
                              title="Voice settings"
                            >
                              <Settings size={16} />
                            </button>
                          )}
                        </div>
                      )}

                      {msg.isStreaming && msg.role === MessageRole.ASSISTANT && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="w-1.5 h-1.5 bg-textMuted/30 rounded-full animate-pulse" />
                        </div>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}

            {isTyping && (
              <div className="flex justify-start mb-3">
                <div className="max-w-[80%]">
                  <span className="text-[10px] text-textMuted/50 italic font-serif mb-1 block">Aura is thinking</span>
                  <div className="flex gap-1">
                    <span className="w-1 h-1 bg-textMuted/30 rounded-full animate-[breathe_1.5s_infinite]" />
                    <span className="w-1 h-1 bg-textMuted/30 rounded-full animate-[breathe_1.5s_infinite_0.3s]" />
                    <span className="w-1 h-1 bg-textMuted/30 rounded-full animate-[breathe_1.5s_infinite_0.6s]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        <div className="flex-shrink-0 z-20 pb-4 pt-2 px-4 bg-gradient-to-t from-background via-background/95 to-transparent">
          <div className="max-w-3xl mx-auto flex flex-col gap-2">
            <div className="flex flex-wrap gap-2 justify-center opacity-80 hover:opacity-100 transition-opacity">
              {voiceRecording.isRecording && (
                <div className="flex items-center gap-2 text-xs text-red-400 animate-pulse">
                  <MicOff size={12} />
                  <span>Recording {voiceRecording.duration}s</span>
                </div>
              )}
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
                relative group rounded-2xl
                bg-surface/40 backdrop-blur-sm
                shadow-sm
                border border-borderDim/40
                transition-all duration-300
                focus-within:shadow-md focus-within:border-borderDim/60 focus-within:bg-surface/60
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
                  rounded-2xl
                  px-6 py-4
                  text-base font-light leading-relaxed
                  placeholder-textMuted/40
                  focus:ring-0 resize-none
                  min-h-[80px] max-h-[240px]
                "
                rows={1}
              />

              <div className="absolute right-4 bottom-4 flex items-center gap-3">
                <button
                  onClick={handleVoiceRecording}
                  disabled={voiceRecording.isProcessing || isTyping}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500
                    ${voiceRecording.isRecording
                      ? 'bg-red-500 text-white animate-pulse hover:bg-red-600'
                      : voiceRecording.isProcessing
                      ? 'bg-surface/60 border border-borderDim/40 text-textMuted/50 cursor-not-allowed'
                      : 'bg-surface/60 border border-borderDim/40 text-textMuted/70 hover:text-textMain hover:bg-surface/80'}`}
                >
                  {voiceRecording.isRecording ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                
                <span className="text-[9px] text-textMuted/25 font-medium tracking-widest uppercase pointer-events-none hidden sm:block mr-2">
                  Return to send
                </span>
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500
                    ${input.trim()
                      ? 'bg-textMain text-background hover:scale-105 shadow-sm'
                      : 'bg-surface/60 border border-borderDim/40 text-textMuted/50 cursor-not-allowed'}`}
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