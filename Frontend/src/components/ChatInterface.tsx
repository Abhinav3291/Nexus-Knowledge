import { useState, useEffect, useRef, useCallback } from 'react'
import { Menu, Send, Loader2, ChevronUp, Sparkles, Bot, User, X } from 'lucide-react'
import type { Message } from '../App'
import FileUpload from './FileUpload'

interface ChatInterfaceProps {
  conversationId: string
  messages: Message[]
  onMessagesUpdate: (messages: Message[]) => void
  onToggleSidebar: React.Dispatch<React.SetStateAction<boolean>>
}

export default function ChatInterface({ 
  conversationId, 
  messages, 
  onMessagesUpdate, 
  onToggleSidebar 
}: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [localMessages, setLocalMessages] = useState<Message[]>(messages)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  useEffect(() => {
    const initializeMessages = async () => {
      setLocalMessages(messages)
    }
    initializeMessages()
  }, [conversationId, messages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [localMessages])


  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onMessagesUpdate(localMessages)
    }, 100)
    return () => clearTimeout(timeoutId)
  }, [localMessages, onMessagesUpdate])

  const [isConnected, setIsConnected] = useState(false)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isConnectingRef = useRef(false)

  const connectWebSocket = useCallback(() => {
    // Don't create new connection if one already exists or connecting
    if (isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return
    }

    isConnectingRef.current = true

    // Clear any pending reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    // Use conversation-specific WebSocket endpoint
    // In production (Docker), use relative path; in dev, use localhost
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsHost = import.meta.env.VITE_WS_URL || `${wsProtocol}//${window.location.hostname}:8000`
    const wsUrl = `${wsHost}/ws/${conversationId}`
    console.log('Connecting to WebSocket:', wsUrl)
    const socket = new WebSocket(wsUrl)

    socket.onopen = () => {
      console.log('WebSocket connected successfully')
      isConnectingRef.current = false
      setIsConnected(true)
      wsRef.current = socket
    }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'chunk') {
          setLocalMessages(prev => {
            const last = prev[prev.length - 1]
            if (last?.type === 'assistant') {
              const updated = [...prev.slice(0, -1), { ...last, content: last.content + data.content }]
              return updated
            }
            return [...prev, { id: Date.now().toString(), type: 'assistant', content: data.content, timestamp: new Date() }]
          })
        } else if (data.type === 'end') {
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }

    socket.onerror = (error) => {
      console.error('WebSocket error:', error)
      isConnectingRef.current = false
      setIsLoading(false)
    }

    socket.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason)
      isConnectingRef.current = false
      setIsConnected(false)
      wsRef.current = null
      
      // Auto-reconnect after a delay
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket()
      }, 2000)
    }
  }, [conversationId])

  // Connect on mount and reconnect when conversation changes
  useEffect(() => {
    // Close existing connection when conversation changes
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    connectWebSocket()
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [conversationId, connectWebSocket])

  // Cancel generation function
  const handleCancelGeneration = useCallback(() => {
    if (wsRef.current) {
      // Close current connection to stop the stream
      wsRef.current.close()
      wsRef.current = null
    }
    setIsLoading(false)
    
    // Add a cancellation message to the last assistant message if it exists
    setLocalMessages(prev => {
      const last = prev[prev.length - 1]
      if (last?.type === 'assistant' && last.content) {
        return [...prev.slice(0, -1), { ...last, content: last.content + '\n\n*[Generation cancelled]*' }]
      }
      return prev
    })
    
    // Reconnect after a short delay
    setTimeout(() => {
      connectWebSocket()
    }, 500)
  }, [connectWebSocket])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMsg: Message = { id: Date.now().toString(), type: 'user', content: input, timestamp: new Date() }
    const message = input
    
    // Update local state (parent sync happens via useEffect)
    setLocalMessages(prev => [...prev, userMsg])
    setInput('')
    
    // Send via WebSocket if connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(message)  // Send plain text as backend expects
      setIsLoading(true)
    } else {
      // Try to reconnect
      connectWebSocket()
      setLocalMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        type: 'status', 
        content: 'Connecting to server... Please wait and try again.', 
        timestamp: new Date() 
      }])
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0a0b] relative overflow-hidden">
      {/* Connection Status Banner */}
      {!isConnected && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-yellow-500/90 text-black text-center py-2 text-sm font-medium">
          ⚠️ Connecting to server... Please wait.
        </div>
      )}
      
      {/* Ambient Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-4 py-3 border-b border-gray-800/50 flex items-center gap-4 bg-[#0d0d0e]/80 backdrop-blur-xl">
        <button 
          onClick={() => onToggleSidebar(prev => !prev)} 
          className="p-2.5 hover:bg-gray-800/50 rounded-xl transition-all duration-200 text-gray-400 hover:text-white"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-cyan-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-base bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Nexus Knowledge
            </h2>
            <p className="text-xs text-gray-500">AI-powered RAG assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-medium bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 rounded-full border border-green-500/30">
            Online
          </span>
        </div>
      </header>

      {/* Messages Container */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {localMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 via-cyan-500 to-purple-500 flex items-center justify-center shadow-2xl shadow-blue-500/30">
                  <Sparkles size={40} className="text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
                  <Bot size={16} className="text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent mb-3">
                Welcome to Nexus
              </h3>
              <p className="text-gray-500 text-sm max-w-md leading-relaxed mb-8">
                Upload your PDF documents and ask questions. I'll search through your knowledge base and the web to provide accurate answers.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
                {['📚 Upload a PDF document', '🔍 Search your knowledge base', '🌐 Web-enhanced answers', '💬 Natural conversations'].map((feature, i) => (
                  <div key={i} className="px-4 py-3 bg-gray-900/50 border border-gray-800/50 rounded-xl text-sm text-gray-400 text-left hover:bg-gray-800/50 hover:border-gray-700/50 transition-all duration-200 cursor-default">
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {localMessages.map((msg, index) => (
            <div 
              key={msg.id} 
              className={`flex gap-4 animate-fade-in ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {msg.type !== 'user' && (
                <div className="flex-shrink-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    msg.type === 'status' 
                      ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30' 
                      : 'bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/20'
                  }`}>
                    {msg.type === 'status' ? (
                      <Loader2 size={16} className="text-amber-400 animate-spin" />
                    ) : (
                      <Bot size={16} className="text-white" />
                    )}
                  </div>
                </div>
              )}
              
              <div className={`max-w-[75%] ${msg.type === 'user' ? 'order-first' : ''}`}>
                <div className={`px-4 py-3 rounded-2xl transition-all duration-200 ${
                  msg.type === 'user' 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-md shadow-lg shadow-blue-500/20' 
                    : msg.type === 'status'
                    ? 'bg-amber-500/10 text-amber-300 text-sm border border-amber-500/20 rounded-bl-md'
                    : 'bg-gray-900/80 text-gray-100 border border-gray-800/50 rounded-bl-md backdrop-blur-sm'
                }`}>
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.type !== 'status' && (
                  <p className={`text-xs text-gray-600 mt-1.5 ${msg.type === 'user' ? 'text-right' : 'text-left'} px-1`}>
                    {msg.timestamp?.toLocaleTimeString?.([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>

              {msg.type === 'user' && (
                <div className="flex-shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                    <User size={16} className="text-white" />
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {isLoading && localMessages[localMessages.length - 1]?.type !== 'status' && (
            <div className="flex gap-4 justify-start animate-fade-in">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Bot size={16} className="text-white" />
              </div>
              <div className="px-5 py-4 rounded-2xl bg-gray-900/80 border border-gray-800/50 rounded-bl-md">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Form */}
      <div className="relative z-10 p-4 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/95 to-transparent">
        {uploadMessage && (
          <div className={`max-w-3xl mx-auto mb-3 p-3 rounded-xl text-sm flex items-center gap-2 animate-fade-in ${
            uploadMessage.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}>
            <span>{uploadMessage.type === 'success' ? '✓' : '✕'}</span>
            {uploadMessage.text}
          </div>
        )}

        {showUpload && (
          <div className="max-w-3xl mx-auto mb-4 animate-fade-in">
            <FileUpload 
              onUploadComplete={(success, message) => {
                setUploadMessage({ type: success ? 'success' : 'error', text: message })
                if (success) {
                  setTimeout(() => setShowUpload(false), 2000)
                }
                setTimeout(() => setUploadMessage(null), 5000)
              }}
            />
          </div>
        )}

        <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto">
          <div className="flex gap-3 items-end">
            <button
              type="button"
              onClick={() => setShowUpload(!showUpload)}
              className={`p-3.5 rounded-xl transition-all duration-200 border ${
                showUpload 
                  ? 'bg-blue-500/20 border-blue-500/30 text-blue-400' 
                  : 'bg-gray-900/80 border-gray-800/50 text-gray-400 hover:bg-gray-800/80 hover:border-gray-700/50 hover:text-gray-300'
              }`}
              title="Upload PDF"
            >
              <ChevronUp size={18} className={`transition-transform duration-200 ${showUpload ? 'rotate-180' : ''}`} />
            </button>

            <div className="flex-1 bg-gray-900/80 border border-gray-800/50 rounded-2xl px-5 py-3.5 focus-within:border-blue-500/50 focus-within:bg-gray-900 transition-all duration-200 group hover:border-gray-700/50">
              <input 
                value={input} 
                onChange={e => setInput(e.target.value)}
                disabled={isLoading}
                className="w-full bg-transparent outline-none text-white placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                placeholder="Ask anything about your documents..."
              />
            </div>
            
            {isLoading ? (
              <button 
                type="button"
                onClick={handleCancelGeneration}
                className="p-3.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl transition-all duration-200 shadow-lg shadow-red-500/20 hover:shadow-red-500/40 hover:scale-105 active:scale-95"
                title="Cancel generation"
              >
                <X size={18} />
              </button>
            ) : (
              <button 
                type="submit" 
                disabled={!input.trim()}
                className="p-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 disabled:shadow-none hover:scale-105 active:scale-95 disabled:hover:scale-100"
              >
                <Send size={18} />
              </button>
            )}
          </div>
          <p className="text-center text-xs text-gray-600 mt-3">
            Nexus uses RAG to search your documents and the web for accurate answers
          </p>
        </form>
      </div>
    </div>
  )
}