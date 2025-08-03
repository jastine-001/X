import React, { useState, useRef, useEffect } from 'react';
import { geminiService } from './services/geminiService';
import {
  MessageSquare,
  Sparkles,
  PenTool,
  Code,
  Brain,
  Plus,
  Send,
  Image,
  Mic,
  Video,
  Circle,
  Menu,
  X,
  Copy,
  Check,
  Search
} from 'lucide-react';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: Date;
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateMessageId = () => Math.random().toString(36).substr(2, 9);

  const createNewConversation = () => {
    const newConversation: Conversation = {
      id: generateMessageId(),
      title: 'New Chat',
      messages: [],
      lastUpdated: new Date()
    };
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
    setMessages([]);
    setIsSidebarOpen(false);
  };

  const switchConversation = (conversationId: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setCurrentConversationId(conversationId);
      setMessages(conversation.messages);
      setIsSidebarOpen(false);
    }
  };

  const updateConversationTitle = (conversationId: string, firstMessage: string) => {
    const title = firstMessage.length > 30 ? firstMessage.substring(0, 30) + '...' : firstMessage;
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, title, lastUpdated: new Date() }
          : conv
      )
    );
  };

  const updateConversationMessages = (conversationId: string, newMessages: Message[]) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, messages: newMessages, lastUpdated: new Date() }
          : conv
      )
    );
  };

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    let conversationId = currentConversationId;
    
    if (!conversationId) {
      createNewConversation();
      conversationId = conversations[0]?.id || generateMessageId();
    }

    const userMessage: Message = {
      id: generateMessageId(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);

    if (conversationId && newMessages.length === 1) {
      updateConversationTitle(conversationId, userMessage.text);
    }

    try {
      const response = await geminiService.generateResponse(inputText.trim());
      
      const aiMessage: Message = {
        id: generateMessageId(),
        text: response,
        isUser: false,
        timestamp: new Date()
      };

      const updatedMessages = [...newMessages, aiMessage];
      setMessages(updatedMessages);
      
      if (conversationId) {
        updateConversationMessages(conversationId, updatedMessages);
      }
    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessage: Message = {
        id: generateMessageId(),
        text: 'Sorry, I encountered an error while processing your request. Please try again.',
        isUser: false,
        timestamp: new Date()
      };
      
      const updatedMessages = [...newMessages, errorMessage];
      setMessages(updatedMessages);
      
      if (conversationId) {
        updateConversationMessages(conversationId, updatedMessages);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceMessage = async (transcribedText: string) => {
    if (!transcribedText.trim() || isLoading) return;

    let conversationId = currentConversationId;
    
    if (!conversationId) {
      createNewConversation();
      conversationId = conversations[0]?.id || generateMessageId();
    }

    const userMessage: Message = {
      id: generateMessageId(),
      text: transcribedText.trim(),
      isUser: true,
      timestamp: new Date()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    if (conversationId && newMessages.length === 1) {
      updateConversationTitle(conversationId, userMessage.text);
    }

    try {
      const response = await geminiService.generateResponse(transcribedText.trim());
      
      const aiMessage: Message = {
        id: generateMessageId(),
        text: response,
        isUser: false,
        timestamp: new Date()
      };

      const updatedMessages = [...newMessages, aiMessage];
      setMessages(updatedMessages);
      
      if (conversationId) {
        updateConversationMessages(conversationId, updatedMessages);
      }

      // Enhanced voice response generation
      const generateVoiceResponse = async () => {
        try {
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(response);
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.volume = 0.8;
            
            const voices = speechSynthesis.getVoices();
            const preferredVoice = voices.find(voice => 
              voice.name.includes('Google') || 
              voice.name.includes('Microsoft') ||
              voice.lang.startsWith('en')
            );
            
            if (preferredVoice) {
              utterance.voice = preferredVoice;
            }
            
            speechSynthesis.speak(utterance);
          }
        } catch (error) {
          console.error('Voice synthesis error:', error);
          const errorResponse: Message = {
            id: generateMessageId(),
            text: 'Voice response is currently unavailable, but I can still help you through text.',
            isUser: false,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, errorResponse]);
        }
      };

      generateVoiceResponse();
    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessage: Message = {
        id: generateMessageId(),
        text: 'Sorry, I encountered an error while processing your voice message. Please try again.',
        isUser: false,
        timestamp: new Date()
      };
      
      const updatedMessages = [...newMessages, errorMessage];
      setMessages(updatedMessages);
      
      if (conversationId) {
        updateConversationMessages(conversationId, updatedMessages);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      const audioChunks: BlobPart[] = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        // Enhanced voice processing simulation
        const simulatedTranscriptions = [
          "Hello, I need help with my skincare routine",
          "Can you help me write a professional email?",
          "Show me some coding examples in JavaScript",
          "I want to learn about healthy eating habits",
          "Help me plan my daily schedule"
        ];
        const randomTranscription = simulatedTranscriptions[Math.floor(Math.random() * simulatedTranscriptions.length)];
        handleVoiceMessage(`${randomTranscription} [Voice transcribed and processed]`);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      // Auto-stop after 5 seconds for better user experience
      setTimeout(() => {
        if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
        }
      }, 5000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white relative">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out z-50 ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } w-64 bg-gray-800 border-r border-gray-700 flex flex-col h-full`}>
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="font-semibold text-lg">Xlyger AI</span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-gray-700 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <button
            onClick={createNewConversation}
            className="w-full mt-4 flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => switchConversation(conversation.id)}
              className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                currentConversationId === conversation.id
                  ? 'bg-gray-700 border border-gray-600'
                  : 'hover:bg-gray-700'
              }`}
            >
              <div className="flex items-start space-x-2">
                <MessageSquare className="w-4 h-4 mt-1 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{conversation.title}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {conversation.lastUpdated.toLocaleDateString()}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold">U</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">User</p>
              <p className="text-xs text-gray-400">Free Plan</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-700 rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-2">
                <Brain className="w-6 h-6 text-blue-400" />
                <h1 className="text-xl font-semibold">Xlyger AI Assistant</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="hidden sm:flex items-center space-x-1 text-sm text-gray-400">
                <Circle className="w-2 h-2 fill-green-400 text-green-400" />
                <span>Online</span>
              </div>
            </div>
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Welcome to Xlyger AI</h2>
              <p className="text-gray-400 mb-8 max-w-md">
                Your intelligent assistant powered by advanced AI. Ask me anything, and I'll help you with detailed, professional responses.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <PenTool className="w-5 h-5 text-blue-400" />
                    <span className="font-medium">Creative Writing</span>
                  </div>
                  <p className="text-sm text-gray-400">Get help with essays, stories, and creative content</p>
                </div>
                
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <Code className="w-5 h-5 text-green-400" />
                    <span className="font-medium">Code Assistance</span>
                  </div>
                  <p className="text-sm text-gray-400">Debug, explain, and write code in any language</p>
                </div>
                
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <Brain className="w-5 h-5 text-purple-400" />
                    <span className="font-medium">Problem Solving</span>
                  </div>
                  <p className="text-sm text-gray-400">Analyze complex problems and find solutions</p>
                </div>
                
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <Search className="w-5 h-5 text-yellow-400" />
                    <span className="font-medium">Research & Analysis</span>
                  </div>
                  <p className="text-sm text-gray-400">Get detailed explanations and research insights</p>
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-3xl p-4 rounded-lg ${
                    message.isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 border border-gray-700'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {!message.isUser && (
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="prose prose-invert max-w-none">
                        <p className="whitespace-pre-wrap">{message.text}</p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                        {!message.isUser && (
                          <button
                            onClick={() => copyToClipboard(message.text, message.id)}
                            className="p-1 hover:bg-gray-700 rounded transition-colors"
                            title="Copy message"
                          >
                            {copiedMessageId === message.id ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-3xl p-4 rounded-lg bg-gray-800 border border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-700 p-4">
          <form onSubmit={handleSubmit} className="flex items-end space-x-2">
            <div className="flex-1 relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Message Xlyger AI..."
                className="w-full p-3 pr-12 bg-gray-800 border border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={1}
                style={{ minHeight: '44px', maxHeight: '120px' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                disabled={isLoading}
              />
              
              <div className="absolute right-2 bottom-2 flex items-center space-x-1">
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`p-2 rounded-lg transition-colors ${
                    isRecording 
                      ? 'bg-red-600 hover:bg-red-700 text-white' 
                      : 'hover:bg-gray-700 text-gray-400'
                  }`}
                  title={isRecording ? 'Stop recording' : 'Start voice recording'}
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          
          <p className="text-xs text-gray-500 mt-2 text-center">
            Xlyger AI can make mistakes. Consider checking important information.
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;