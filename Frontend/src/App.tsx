import { useState, useCallback, useEffect } from 'react'
import './App.css'
import ChatInterface from './components/ChatInterface'
import Sidebar from './components/Sidebar'

// Use environment variable or default to localhost for development
const API_URL = import.meta.env.VITE_API_URL || 'http://0.0.0.0:8000'

// Ensure this matches ChatInterface exactly
export interface Message {
  id: string
  type: 'user' | 'assistant' | 'status'
  content: string
  timestamp: Date
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
}

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConvId, setCurrentConvId] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

  // Load conversations from database on mount
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const response = await fetch(`${API_URL}/conversations`)
        const data = await response.json()
        if (data.status === 'success') {
          const convs = data.conversations.map((c: { id: string; title: string }) => ({
            id: c.id,
            title: c.title,
            messages: []
          }))
          setConversations(convs)
          // Select first conversation if exists
          if (convs.length > 0) {
            setCurrentConvId(convs[0].id)
          }
        }
      } catch (error) {
        console.error('Failed to load conversations:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadConversations()
  }, [])

  // Load messages when conversation changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!currentConvId) return
      
      try {
        const response = await fetch(`${API_URL}/conversations/${currentConvId}`)
        const data = await response.json()
        if (data.status === 'success') {
          const messages = data.messages.map((m: { id: string; type: string; content: string; timestamp: string }) => ({
            id: m.id,
            type: m.type,
            content: m.content,
            timestamp: new Date(m.timestamp)
          }))
          setConversations(prev => 
            prev.map(c => c.id === currentConvId ? { ...c, messages } : c)
          )
        }
      } catch (error) {
        console.error('Failed to load messages:', error)
      }
    }
    loadMessages()
  }, [currentConvId])

  const createNewConversation = async () => {
    try {
      const response = await fetch(`${API_URL}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' })
      })
      const data = await response.json()
      if (data.status === 'success') {
        const newConv = {
          id: data.conversation.id,
          title: data.conversation.title,
          messages: []
        }
        setConversations(prev => [newConv, ...prev])
        setCurrentConvId(newConv.id)
      }
    } catch (error) {
      console.error('Failed to create conversation:', error)
      // Fallback to local creation
      const newId = Date.now().toString()
      setConversations(prev => [...prev, { id: newId, title: 'New Chat', messages: [] }])
      setCurrentConvId(newId)
    }
  }

  // Use useCallback to prevent infinite render loops
  const updateConversationMessages = useCallback((messages: Message[]) => {
    if (!currentConvId) return
    setConversations(convs =>
      convs.map(c => {
        if (c.id === currentConvId) {
          // Update title from first user message
          const firstUserMsg = messages.find(m => m.type === 'user')
          const newTitle = firstUserMsg 
            ? firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '')
            : c.title
          return { ...c, messages, title: c.messages.length === 0 && firstUserMsg ? newTitle : c.title }
        }
        return c
      })
    )
  }, [currentConvId])

  const deleteConversation = async (id: string) => {
    try {
      await fetch(`${API_URL}/conversations/${id}`, { method: 'DELETE' })
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
    setConversations(convs => convs.filter(c => c.id !== id))
    if (currentConvId === id) setCurrentConvId(null)
  }

  const activeConv = conversations.find(c => c.id === currentConvId)

  if (isLoading) {
    return (
      <div className="flex h-screen w-full bg-[#0a0a0b] text-white items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full bg-[#0a0a0b] text-white overflow-hidden">
      <Sidebar
        conversations={conversations}
        currentConvId={currentConvId}
        onSelectConversation={setCurrentConvId}
        onNewConversation={createNewConversation}
        onDeleteConversation={deleteConversation}
        isOpen={isSidebarOpen}
        onToggle={setIsSidebarOpen} 
      />
      <main className="flex-1 flex flex-col min-w-0 relative">
        {currentConvId && activeConv ? (
          <ChatInterface
            conversationId={currentConvId}
            messages={activeConv.messages}
            onMessagesUpdate={updateConversationMessages}
            onToggleSidebar={setIsSidebarOpen}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-[#0a0a0b] to-[#0d0d0e]">
            <div className="text-center animate-fade-in">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-500 to-purple-500 flex items-center justify-center shadow-2xl shadow-blue-500/30">
                <span className="text-3xl">✨</span>
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-3">
                Welcome to Nexus
              </h2>
              <p className="text-gray-500 mb-8 max-w-md">
                Your AI-powered knowledge assistant. Upload documents and get intelligent answers.
              </p>
              <button 
                onClick={createNewConversation} 
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 rounded-xl font-medium transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-105"
              >
                Start New Chat
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
