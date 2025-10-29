import React, { useState, useEffect } from 'react';
import { MessageCircle, Trash2, Plus, Clock } from 'lucide-react';
import { supabaseService, ChatSession } from '../services/supabaseService';

interface ChatHistoryProps {
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
}

export const ChatHistory: React.FC<ChatHistoryProps> = ({
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setIsLoading(true);
    const sessionList = await supabaseService.getSessions();
    setSessions(sessionList);
    setIsLoading(false);
  };

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this chat?')) {
      await supabaseService.deleteSession(sessionId);
      onDeleteSession(sessionId);
      loadSessions();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  useEffect(() => {
    const interval = setInterval(loadSessions, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full bg-gray-900">
      <div className="p-4 border-b border-gray-700">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center space-x-2 p-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg transition-all duration-200 active:scale-95 touch-manipulation shadow-lg"
        >
          <Plus className="w-5 h-5" />
          <span className="font-medium">New Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {isLoading ? (
          <div className="text-center py-8 text-gray-400">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm">Loading chats...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No chat history</p>
            <p className="text-xs mt-1">Start a new conversation</p>
          </div>
        ) : (
          sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`w-full group p-3 rounded-lg transition-all duration-200 text-left touch-manipulation ${
                currentSessionId === session.id
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                  : 'bg-gray-800 hover:bg-gray-750 text-gray-200'
              }`}
            >
              <div className="flex items-start justify-between space-x-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <MessageCircle className="w-4 h-4 flex-shrink-0" />
                    <h3 className="text-sm font-medium truncate">{session.title}</h3>
                  </div>
                  <div className="flex items-center space-x-2 text-xs opacity-70">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(session.updated_at)}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDelete(session.id, e)}
                  className={`p-1.5 rounded transition-colors ${
                    currentSessionId === session.id
                      ? 'hover:bg-white/20 text-white'
                      : 'hover:bg-red-500/20 text-gray-400 hover:text-red-400'
                  }`}
                  title="Delete chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </button>
          ))
        )}
      </div>

      <div className="p-4 border-t border-gray-700 bg-gray-850">
        <div className="text-xs text-gray-400 text-center">
          <p>{sessions.length} {sessions.length === 1 ? 'conversation' : 'conversations'}</p>
        </div>
      </div>
    </div>
  );
};
