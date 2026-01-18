import React, { useState, useEffect } from 'react';
import { MessageRole, Message } from '../types';
import { chatHistoryStore } from '../services/chatHistoryStore';

interface ConversationSidebarProps {
  onConversationSelect: (id: string) => void;
  activeConversationId: string | null;
}

const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  onConversationSelect,
  activeConversationId
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeMenuId) {
        setActiveMenuId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeMenuId]);

  const conversations = chatHistoryStore.getConversations();

  const handleNewConversation = () => {
    const conversationId = chatHistoryStore.createConversation();
    chatHistoryStore.setActiveConversation(conversationId);
    onConversationSelect(conversationId);
  };

  const handleDeleteConversation = (conversationId: string) => {
    if (window.confirm('Delete this conversation? This cannot be undone.')) {
      chatHistoryStore.deleteConversation(conversationId);
      setActiveMenuId(null);

      const active = chatHistoryStore.getActiveConversation();
      if (active) {
        onConversationSelect(active.id);
      }
    }
  };

  return (
    <div
      className="hidden md:flex md:flex-col w-72 h-full flex bg-surface/20 border-r border-borderDim/30"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-borderDim/10">
        <h3 className="text-sm font-medium text-textMain/90">Conversations</h3>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto relative">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className={`px-4 py-3 cursor-pointer transition-all duration-200 hover:bg-surface/40 rounded-lg mx-2 mb-1 relative group ${
              activeConversationId === conversation.id ? 'bg-surface/60 border border-borderDim/15 shadow-sm' : ''
            }`}
            onClick={() => {
              chatHistoryStore.setActiveConversation(conversation.id);
              onConversationSelect(conversation.id);
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-textMain/95 truncate flex-1">
                {conversation.title || 'New Conversation'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-textMuted/40">
                  {new Date(conversation.lastUpdated).toLocaleDateString()}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(activeMenuId === conversation.id ? null : conversation.id);
                  }}
                  className="opacity-0 group-hover:opacity-80 p-1.5 text-textMuted/30 hover:text-textMuted/60 transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="5" r="1.5" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="12" cy="19" r="1.5" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Contextual Menu */}
            {activeMenuId === conversation.id && (
              <div className="absolute right-4 top-12 bg-surface/95 backdrop-blur-sm border border-borderDim/30 rounded-lg shadow-lg py-1 z-50">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConversation(conversation.id);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-textMain hover:bg-surface/50 transition-colors"
                >
                  Delete conversation
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* New Conversation Button */}
      <div className="px-4 py-3 border-t border-borderDim/10">
        <button
          onClick={handleNewConversation}
          className="w-full py-2 px-4 bg-surface/25 text-textMain rounded-lg font-medium hover:bg-surface/40 transition-colors"
        >
          New Conversation
        </button>
      </div>
    </div>
  );
};

export default ConversationSidebar;
