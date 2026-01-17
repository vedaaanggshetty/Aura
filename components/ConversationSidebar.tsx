import React from 'react';
import { MessageRole, Message } from '../types';
import { chatHistoryStore } from '../services/chatHistoryStore';

interface ConversationSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onConversationSelect: (id: string) => void;
  activeConversationId: string | null;
}

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  isOpen,
  onToggle,
  onConversationSelect,
  activeConversationId
}) => {
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => chatHistoryStore.subscribe(forceUpdate), []);

  const conversations = chatHistoryStore.getConversations();

  const handleNewConversation = () => {
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      role: MessageRole.ASSISTANT,
      content: 'Hello! How can I help you today?',
      timestamp: Date.now()
    };
    
    const conversationId = chatHistoryStore.createConversation(welcomeMessage);
    chatHistoryStore.setActiveConversation(conversationId);
    onConversationSelect(conversationId);
  };

  const handleDeleteConversation = (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    
    if (window.confirm('Delete this conversation? This cannot be undone.')) {
      chatHistoryStore.deleteConversation(conversationId);

      const active = chatHistoryStore.getActiveConversation();
      if (active) {
        onConversationSelect(active.id);
      }
    }
  };

  return (
    <div
      className="fixed left-0 top-20 bottom-0 w-72 bg-surface/50 border-r border-borderDim/30 z-40 flex flex-col transition-transform duration-300 ease-in-out"
      style={{ transform: isOpen ? 'translateX(0)' : 'translateX(-18rem)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-borderDim/20">
        <h3 className="text-sm font-medium text-textMain">Conversations</h3>
        <button
          onClick={onToggle}
          className="p-1 rounded-md hover:bg-surface/80 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l-12 12" />
          </svg>
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            onClick={() => {
              chatHistoryStore.setActiveConversation(conversation.id);
              onConversationSelect(conversation.id);
            }}
            className={`p-3 cursor-pointer hover:bg-surface/80 transition-colors border-b border-transparent hover:border-borderDim/20 ${
              activeConversationId === conversation.id ? 'bg-surface/60 border-borderDim/30' : ''
            }`}
          >
            {/* Conversation Title */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-textMain truncate flex-1">
                {conversation.title}
              </span>
              <span className="text-xs text-textMuted">
                {new Date(conversation.lastUpdated).toLocaleDateString()}
              </span>
            </div>

            {/* Delete Button */}
            <button
              onClick={(e) => handleDeleteConversation(e, conversation.id)}
              className="opacity-0 hover:opacity-100 transition-opacity p-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-7 7M5 5l-7 7" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* New Conversation Button */}
      <div className="p-4 border-t border-borderDim/20">
        <button
          onClick={handleNewConversation}
          className="w-full py-2 px-4 bg-textMain text-background rounded-lg font-medium hover:bg-surface/80 transition-colors"
        >
          New Conversation
        </button>
      </div>
    </div>
  );
};

export default ConversationSidebar;
