import { Plus, X, MessageSquare, Sparkles } from 'lucide-react'
import type { Message } from '../App'

interface SidebarProps {
  conversations: Array<{ id: string; title: string; messages: Message[] }>
  currentConvId: string | null
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
  onDeleteConversation: (id: string) => void
  isOpen: boolean
  onToggle: (state: boolean) => void
}
export default function Sidebar({
  conversations,
  currentConvId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isOpen
}: SidebarProps) {
  return (
    <aside className={`sidebar ${!isOpen ? 'closed' : ''}`}>
      {/* Logo Section */}
      <div className="p-4 border-b border-gray-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-cyan-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Nexus
            </h1>
            <p className="text-xs text-gray-500">Knowledge Base</p>
          </div>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="sidebar-header">
        <button className="new-chat-btn group" onClick={onNewConversation}>
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-all">
            <Plus size={16} className="text-blue-400" />
          </div>
          <span>New Conversation</span>
        </button>
      </div>

      {/* Conversations List */}
      <div className="conversations-list">
        <p className="text-xs text-gray-500 uppercase tracking-wider px-3 mb-3 font-medium">Recent Chats</p>
        {conversations.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <MessageSquare size={32} className="mx-auto mb-3 text-gray-600" />
            <p className="text-sm text-gray-500">No conversations yet</p>
            <p className="text-xs text-gray-600 mt-1">Start a new chat to begin</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item group ${conv.id === currentConvId ? 'active' : ''}`}
              onClick={() => onSelectConversation(conv.id)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`p-1.5 rounded-lg transition-all ${
                  conv.id === currentConvId 
                    ? 'bg-gradient-to-br from-blue-500/30 to-purple-500/30' 
                    : 'bg-gray-800/50 group-hover:bg-gray-700/50'
                }`}>
                  <MessageSquare size={14} className={conv.id === currentConvId ? 'text-blue-400' : 'text-gray-400'} />
                </div>
                <span className="overflow-hidden text-ellipsis whitespace-nowrap text-sm">
                  {conv.title}
                </span>
              </div>
              <button
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteConversation(conv.id)
                }}
                title="Delete conversation"
              >
                <X size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800/50">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
            U
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate">User</p>
            <p className="text-xs text-gray-500">Free Plan</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
