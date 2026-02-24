import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowUp, StopCircle, Feather, BookOpen, ExternalLink } from 'lucide-react';
import { Message, MessageRole } from '../types';
import { chatService, ChatMessage } from '../services/chatService';
import { SUGGESTIONS } from '../constants';
import { SignedIn, SignedOut, SignInButton, useUser } from './AuthContext';
import ConversationSidebar from './ConversationSidebar';
import { chatHistoryStore } from '../services/chatHistoryStore';

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatDate = (timestamp: number) =>
  new Intl.DateTimeFormat('en-US', { weekday: 'long', hour: 'numeric', minute: 'numeric' }).format(new Date(timestamp));

const shouldShowTimestamp = (current: number, prev: number) => current - prev > 30 * 60 * 1000;

// ── Resource types ────────────────────────────────────────────────────────────
type Video = { title: string; videoId: string; channel: string };
type BlogLink = { title: string; url: string; source: string };
type ResourcePack = { emotion: string; videos: Video[]; blog: BlogLink };

// ── Curated resource library ──────────────────────────────────────────────────
const RESOURCE_MAP: Array<{ patterns: RegExp; pack: ResourcePack }> = [
  {
    patterns: /worthless|failure|not good enough|i('m| am) nothing|useless|i hate myself|can't do anything right|i'm a burden|nobody likes me/i,
    pack: {
      emotion: 'Self-Worth',
      videos: [
        { title: 'The Power of Vulnerability', videoId: 'iCvmsMzlF7o', channel: 'TED · Brené Brown' },
        { title: 'You Are Enough — Marisa Peer', videoId: 'DwfDL_jdlDQ', channel: 'TEDx' },
        { title: 'Why You Feel Lost in Life', videoId: 'R6UXBuvHHX0', channel: 'Jay Shetty' },
      ],
      blog: { title: 'How to Rebuild Your Self-Worth', url: 'https://psychcentral.com/blog/rebuilding-self-worth', source: 'PsychCentral' },
    },
  },
  {
    patterns: /anxious|anxiety|panic|overthinking|can't stop thinking|racing thoughts|worried all the time|i'm scared|heart is racing/i,
    pack: {
      emotion: 'Anxiety',
      videos: [
        { title: 'Physiological Sigh — Reduce Stress Fast', videoId: 'kSZKIupBUuc', channel: 'Andrew Huberman' },
        { title: 'How to Calm Anxiety Right Now', videoId: 'tEmt1Znux58', channel: 'Therapy in a Nutshell' },
        { title: '5-4-3-2-1 Grounding Technique', videoId: '30VMIEmA114', channel: 'Calm' },
      ],
      blog: { title: '11 Ways to Calm an Anxious Mind', url: 'https://www.verywellmind.com/how-to-calm-anxiety-4584366', source: 'Verywell Mind' },
    },
  },
  {
    patterns: /lonely|so alone|isolated|no one cares|nobody cares|no friends|no one understands|i feel invisible/i,
    pack: {
      emotion: 'Loneliness',
      videos: [
        { title: 'Loneliness — The Disease of Our Era', videoId: 'n3Xv_g3g-mA', channel: 'Kurzgesagt' },
        { title: 'What Loneliness Does to the Body', videoId: 'yv7OJqKLFok', channel: 'SciShow Psych' },
        { title: 'The Antidote to Feeling Alone', videoId: 'c3UZXBC0-Tc', channel: 'The School of Life' },
      ],
      blog: { title: 'Coping with Loneliness — Strategies That Work', url: 'https://www.psychologytoday.com/us/basics/loneliness', source: 'Psychology Today' },
    },
  },
  {
    patterns: /angry|so angry|rage|furious|want to scream|frustrated|i hate|makes me mad|pissed off|i can't stand/i,
    pack: {
      emotion: 'Anger',
      videos: [
        { title: 'Working with Anger — Headspace', videoId: 'nESwCR3gLmQ', channel: 'Headspace' },
        { title: 'How to Process Anger (Not Just Vent It)', videoId: 'VjAXdmk4d2E', channel: 'Dr. Ramani' },
        { title: 'Why You Get So Angry — and What to Do', videoId: 'EWd-_7EEknE', channel: 'Improvement Pill' },
      ],
      blog: { title: 'Controlling Anger Before It Controls You', url: 'https://www.apa.org/topics/anger/control', source: 'APA' },
    },
  },
  {
    patterns: /overwhelmed|too much|can't cope|drowning in|burned out|burnt out|no energy|exhausted and stressed|breaking point/i,
    pack: {
      emotion: 'Overwhelm',
      videos: [
        { title: 'How to Stop Being Overwhelmed', videoId: 'LDU_Txk06tM', channel: 'Matt D\'Avella' },
        { title: 'The Science of Burnout', videoId: 'jqONINYF17M', channel: 'Ali Abdaal' },
        { title: 'Reset Your Nervous System in 5 min', videoId: 'nmFUDkj1Aq0', channel: 'Andrew Huberman' },
      ],
      blog: { title: 'How to Deal with Feeling Overwhelmed', url: 'https://www.mindful.org/how-to-deal-with-being-overwhelmed/', source: 'Mindful.org' },
    },
  },
  {
    patterns: /so sad|i'm sad|depressed|hopeless|empty inside|nothing matters|give up|can't go on|what's the point|feel like crying|heartbroken/i,
    pack: {
      emotion: 'Low Mood',
      videos: [
        { title: 'Listening to Shame — Brené Brown', videoId: 'psN1DORYYV0', channel: 'TED' },
        { title: 'How to Cope with Depression', videoId: 'inpok4MKVLM', channel: 'Therapy in a Nutshell' },
        { title: 'Habits That Will Change Your Life', videoId: 'ZSaXTRcevS4', channel: 'Better Ideas' },
      ],
      blog: { title: 'Understanding and Finding Help for Depression', url: 'https://www.nami.org/About-Mental-Illness/Mental-Health-Conditions/Depression', source: 'NAMI' },
    },
  },
  {
    patterns: /can't sleep|insomnia|lying awake|wide awake|sleep\b|exhausted|up all night|tired but can't rest|mind won't stop at night/i,
    pack: {
      emotion: 'Sleep',
      videos: [
        { title: 'Sleep is Your Superpower — Matthew Walker', videoId: '5MuIMqhT8DM', channel: 'TED' },
        { title: '10-Minute Wind Down for Deep Sleep', videoId: 'nmFUDkj1Aq0', channel: 'Andrew Huberman' },
        { title: 'Why We Sleep — and What Happens If We Don\'t', videoId: 'aXItOY0sLRY', channel: 'TEDx' },
      ],
      blog: { title: 'Sleep Hygiene: How to Get Better Sleep', url: 'https://www.sleepfoundation.org/sleep-hygiene', source: 'Sleep Foundation' },
    },
  },
  {
    patterns: /grief|grieving|lost someone|they died|miss them so much|i miss my|death of|passed away|gone forever|mourning/i,
    pack: {
      emotion: 'Grief',
      videos: [
        { title: 'You Don\'t Find Meaning After Loss — David Kessler', videoId: 'khkufdkBBKw', channel: 'TED' },
        { title: 'Grief Is Not Linear — Megan Devine', videoId: 'ebLpRd0XXUQ', channel: 'TEDx' },
        { title: 'How to Sit With Grief', videoId: 'SEfs5TJZ6Nk', channel: 'The School of Life' },
      ],
      blog: { title: 'Understanding the Stages of Grief', url: 'https://www.psychologytoday.com/us/basics/grief', source: 'Psychology Today' },
    },
  },
];

// ── Core detection function ───────────────────────────────────────────────────
function detectResourcesForMessage(text: string): ResourcePack | null {
  if (!text || text.trim().length < 5) return null;
  for (const { patterns, pack } of RESOURCE_MAP) {
    if (patterns.test(text)) return pack;
  }
  return null;
}

// ── Resource card component ───────────────────────────────────────────────────
const ResourceCards: React.FC<{ pack: ResourcePack }> = ({ pack }) => (
  <div className="mt-3 mb-1 animate-fade-in">
    {/* Label */}
    <div className="flex items-center gap-1.5 mb-2 ml-1">
      <span className="text-[9px] uppercase tracking-widest text-textMuted/50">✦ Feel better · {pack.emotion}</span>
    </div>

    {/* Video row */}
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
      {pack.videos.map((v) => (
        <a
          key={v.videoId}
          href={`https://www.youtube.com/watch?v=${v.videoId}`}
          target="_blank"
          rel="noreferrer"
          className="flex-shrink-0 w-44 rounded-xl overflow-hidden border border-borderDim/40 bg-surface/40 hover:bg-surface/70 hover:border-borderDim/70 transition-all duration-300 group"
        >
          <div className="relative">
            <img
              src={`https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`}
              alt={v.title}
              className="w-full h-24 object-cover"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            {/* Play overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[9px] border-l-black ml-0.5" />
              </div>
            </div>
          </div>
          <div className="p-2">
            <p className="text-[11px] font-medium text-textMain leading-snug line-clamp-2">{v.title}</p>
            <p className="text-[10px] text-textMuted mt-1 truncate">{v.channel}</p>
          </div>
        </a>
      ))}
    </div>

    {/* Blog chip */}
    <a
      href={pack.blog.url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-full border border-borderDim/40 bg-surface/30 hover:bg-surface/60 transition-all duration-300 group"
    >
      <BookOpen size={11} className="text-textMuted flex-shrink-0" />
      <span className="text-[11px] text-textSec group-hover:text-textMain transition-colors truncate max-w-xs">{pack.blog.title}</span>
      <span className="text-[10px] text-textMuted/60 flex-shrink-0">· {pack.blog.source}</span>
      <ExternalLink size={10} className="text-textMuted/50 flex-shrink-0" />
    </a>
  </div>
);

// ── Auth gate ─────────────────────────────────────────────────────────────────
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

// ── Chat session ──────────────────────────────────────────────────────────────
const ChatSession: React.FC = () => {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!user?.id) return;
    const active = chatHistoryStore.getActiveConversation();
    if (!active) {
      const newId = chatHistoryStore.createConversation();
      setActiveConversationId(newId);
      setMessages([]);
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
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
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
      id: `${Date.now()}-user`,
      role: MessageRole.USER,
      content: text,
      timestamp: Date.now(),
    };
    chatHistoryStore.addMessage(conversationId, userMsg);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsTyping(true);

    const assistantMsgId = `${Date.now()}-assistant`;
    chatHistoryStore.addMessage(conversationId, {
      id: assistantMsgId,
      role: MessageRole.ASSISTANT,
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    });

    try {
      const conv = chatHistoryStore.getConversationById(conversationId);
      const chatMessages: ChatMessage[] = (conv?.messages ?? [])
        .filter((m) => m.role === MessageRole.USER && m.content.trim().length > 0)
        .map((m) => ({ role: 'user', content: m.content }));

      const response = await chatService.sendMessage(chatMessages);
      chatHistoryStore.updateLastAssistantMessage(conversationId, response.content);
    } catch (error) {
      console.error('Failed to send message', error);
    } finally {
      setIsTyping(false);
      chatHistoryStore.finalizeLastAssistantMessage(conversationId);
      chatHistoryStore.setActiveConversation(conversationId);
    }
  };

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

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 scrollbar-hide z-10 min-w-0">
          <div className="max-w-3xl mx-auto">
            {messages.map((msg, idx) => {
              const prevMsg = messages[idx - 1];
              const showTime = !prevMsg || shouldShowTimestamp(msg.timestamp, prevMsg.timestamp);

              // For ASSISTANT messages: detect resources from the preceding USER message
              const isAssistant = msg.role === MessageRole.ASSISTANT;
              const isDoneStreaming = isAssistant && !msg.isStreaming && !isTyping;
              const precedingUserMsg = isAssistant ? messages[idx - 1] : null;
              const resourcePack =
                isDoneStreaming && precedingUserMsg?.role === MessageRole.USER
                  ? detectResourcesForMessage(precedingUserMsg.content)
                  : null;

              return (
                <React.Fragment key={msg.id}>
                  {showTime && (
                    <div className="flex justify-center my-2 opacity-60 animate-fade-in">
                      <span className="text-[10px] font-serif italic text-textMuted/60 tracking-widest border-b border-borderDim/30 pb-0.5 px-3">
                        {formatDate(msg.timestamp)}
                      </span>
                    </div>
                  )}

                  <div className={`mb-3 ${msg.role === MessageRole.USER ? 'flex justify-end' : 'flex justify-start'}`}>
                    <div className="max-w-[80%]">
                      <span
                        className={`text-[9px] uppercase tracking-wider text-textMuted/50 mb-1 block ${msg.role === MessageRole.USER ? 'text-right' : 'text-left'
                          }`}
                      >
                        {msg.role === MessageRole.USER ? 'You' : 'Aura'}
                      </span>

                      <div
                        className={`rounded-2xl ${msg.role === MessageRole.USER
                            ? 'bg-surface/70 px-4 py-3 text-textMain text-base font-light leading-relaxed border border-borderDim/40 shadow-sm'
                            : 'px-4 py-3 text-textMain text-base font-light leading-relaxed'
                          }`}
                      >
                        {msg.role === MessageRole.ASSISTANT ? (
                          <div className="prose prose-base prose-neutral dark:prose-invert max-w-none font-light leading-7">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap leading-7">{msg.content}</p>
                        )}
                      </div>

                      {msg.isStreaming && msg.role === MessageRole.ASSISTANT && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="w-1.5 h-1.5 bg-textMuted/30 rounded-full animate-pulse" />
                        </div>
                      )}

                      {/* ── Inline resource cards ─────────────────────── */}
                      {resourcePack && <ResourceCards pack={resourcePack} />}
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

        {/* Input bar */}
        <div className="flex-shrink-0 z-20 pb-4 pt-2 px-4 bg-gradient-to-t from-background via-background/95 to-transparent">
          <div className="max-w-3xl mx-auto flex flex-col gap-2">
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

            <div className="relative group rounded-2xl bg-surface/40 backdrop-blur-sm shadow-sm border border-borderDim/40 transition-all duration-300 focus-within:shadow-md focus-within:border-borderDim/60 focus-within:bg-surface/60">
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
                className="w-full bg-transparent border-none rounded-2xl px-6 py-4 text-base font-light leading-relaxed placeholder-textMuted/40 focus:ring-0 resize-none min-h-[80px] max-h-[240px]"
                rows={1}
              />
              <div className="absolute right-4 bottom-4 flex items-center gap-3">
                <span className="text-[9px] text-textMuted/25 font-medium tracking-widest uppercase pointer-events-none hidden sm:block mr-2">
                  Return to send
                </span>
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${input.trim()
                      ? 'bg-textMain text-background hover:scale-105 shadow-sm'
                      : 'bg-surface/60 border border-borderDim/40 text-textMuted/50 cursor-not-allowed'
                    }`}
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

// ── Root export ───────────────────────────────────────────────────────────────
const ChatInterface: React.FC = () => (
  <>
    <SignedIn><ChatSession /></SignedIn>
    <SignedOut><AuthGate /></SignedOut>
  </>
);

export default ChatInterface;