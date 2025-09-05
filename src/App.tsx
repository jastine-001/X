import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Image, FileText, Video, Volume2, Sparkles, User, Bot, Settings, Trash2 } from 'lucide-react';
import { geminiService } from './services/geminiService';
import { speechService } from './services/speechService';
import { imageProcessingService } from './services/imageProcessingService';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  type?: 'text' | 'image' | 'audio' | 'video' | 'document';
  fileName?: string;
}

interface AIMode {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const AI_MODES: AIMode[] = [
  {
    id: 'general',
    name: 'General',
    description: 'General-purpose AI assistant',
    icon: <Bot className="w-4 h-4" />
  },
  {
    id: 'beauty',
    name: 'Beauty',
    description: 'Beauty and style consultant',
    icon: <Sparkles className="w-4 h-4" />
  },
  {
    id: 'writing',
    name: 'Writing',
    description: 'Writing and editing assistant',
    icon: <FileText className="w-4 h-4" />
  },
  {
    id: 'code',
    name: 'Code',
    description: 'Programming and development',
    icon: <Settings className="w-4 h-4" />
  }
];

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentMode, setCurrentMode] = useState('general');
  const [showModeSelector, setShowModeSelector] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string, isVoiceMessage: boolean = false) => {
    if (!content.trim()) return;

    // Stop any current speech and listening when sending a message
    if (speechService.getIsSpeaking()) {
      speechService.stopSpeaking();
    }
    if (isListening) {
      speechService.stopListening();
      setIsListening(false);
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      isUser: true,
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.content
      }));

      const response = await geminiService.generateResponse(content, conversationHistory, isVoiceMessage);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        isUser: false,
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceToggle = async () => {
    if (isListening) {
      // Stop listening
      speechService.stopListening();
      setIsListening(false);
    } else {
      // Stop any current speech before starting to listen
      if (speechService.getIsSpeaking()) {
        speechService.stopSpeaking();
      }
      
      try {
        setIsListening(true);
        const transcript = await speechService.startListening();
        setIsListening(false);
        if (transcript) {
          await handleSendMessage(transcript, true);
        }
      } catch (error) {
        console.error('Voice recognition error:', error);
        setIsListening(false);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: `Uploaded: ${file.name}`,
      isUser: true,
      timestamp: new Date(),
      type: file.type.startsWith('image/') ? 'image' : 
            file.type.startsWith('audio/') ? 'audio' :
            file.type.startsWith('video/') ? 'video' : 'document',
      fileName: file.name
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      let response: string;
      
      if (file.type.startsWith('image/')) {
        response = await geminiService.analyzeImage(file);
      } else if (file.type.startsWith('audio/')) {
        response = await geminiService.analyzeAudio(file);
      } else if (file.type.startsWith('video/')) {
        response = await geminiService.analyzeVideo(file);
      } else {
        response = await geminiService.analyzeDocument(file);
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        isUser: false,
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error analyzing file:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error analyzing your file. Please try again.',
        isUser: false,
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleModeChange = (modeId: string) => {
    setCurrentMode(modeId);
    geminiService.setMode(modeId);
    setShowModeSelector(false);
  };

  const clearChat = () => {
    setMessages([]);
  };

  const currentModeInfo = AI_MODES.find(mode => mode.id === currentMode);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 p-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">XLYGER AI</h1>
              <p className="text-sm text-gray-500">Intelligent Assistant</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Mode Selector */}
            <div className="relative">
              <button
                onClick={() => setShowModeSelector(!showModeSelector)}
                className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {currentModeInfo?.icon}
                <span className="text-sm font-medium">{currentModeInfo?.name}</span>
              </button>
              
              {showModeSelector && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <div className="p-2">
                    {AI_MODES.map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => handleModeChange(mode.id)}
                        className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                          currentMode === mode.id 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        {mode.icon}
                        <div className="text-left">
                          <div className="font-medium">{mode.name}</div>
                          <div className="text-xs text-gray-500">{mode.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={clearChat}
              className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Clear chat"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to XLYGER AI</h2>
              <p className="text-gray-600 mb-6">Your intelligent assistant for any task</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {AI_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => handleModeChange(mode.id)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      currentMode === mode.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      {mode.icon}
                      <span className="font-semibold">{mode.name}</span>
                    </div>
                    <p className="text-sm text-gray-600 text-left">{mode.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl px-4 py-3 rounded-2xl ${
                  message.isUser
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-800 shadow-sm border border-gray-200'
                }`}
              >
                <div className="flex items-start space-x-2">
                  {!message.isUser && (
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                      <Bot className="w-3 h-3 text-white" />
                    </div>
                  )}
                  <div className="flex-1">
                    {message.type !== 'text' && (
                      <div className="flex items-center space-x-2 mb-2 text-sm opacity-75">
                        {message.type === 'image' && <Image className="w-4 h-4" />}
                        {message.type === 'audio' && <Volume2 className="w-4 h-4" />}
                        {message.type === 'video' && <Video className="w-4 h-4" />}
                        {message.type === 'document' && <FileText className="w-4 h-4" />}
                        <span>{message.fileName}</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                  {message.isUser && (
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                      <User className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <div className={`text-xs mt-2 ${message.isUser ? 'text-blue-100' : 'text-gray-500'}`}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-800 shadow-sm border border-gray-200 px-4 py-3 rounded-2xl">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white/80 backdrop-blur-sm border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(inputValue);
                  }
                }}
                placeholder={`Ask ${currentModeInfo?.name} AI anything...`}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none max-h-32"
                rows={1}
                disabled={isLoading}
              />
            </div>
            
            {/* File Upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"
              title="Upload file"
              disabled={isLoading}
            >
              <FileText className="w-5 h-5" />
            </button>
            
            {/* Voice Input */}
            <button
              onClick={handleVoiceToggle}
              className={`p-3 rounded-xl transition-colors ${
                isListening
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'text-gray-500 hover:text-blue-500 hover:bg-blue-50'
              }`}
              title={isListening ? 'Stop recording' : 'Start voice input'}
              disabled={isLoading}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            
            {/* Send Button */}
            <button
              onClick={() => handleSendMessage(inputValue)}
              disabled={!inputValue.trim() || isLoading}
              className="p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt,.md"
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
}

export default App;