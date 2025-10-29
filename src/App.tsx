import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Image as ImageIcon, FileText, Video, Volume2, Sparkles, User, Bot, Settings, Trash2, Menu, X, Home, MessageCircle, Camera, Headphones, Code, Palette, PenTool, Brain, Copy, Check, History, Wand2 } from 'lucide-react';
import { geminiService } from './services/geminiService';
import { speechService } from './services/speechService';
import { supabaseService } from './services/supabaseService';
import { ChatHistory } from './components/ChatHistory';

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
  color: string;
  bgGradient: string;
}

const AI_MODES: AIMode[] = [
  {
    id: 'general',
    name: 'General Assistant',
    description: 'Your all-purpose AI companion for any task',
    icon: <Brain className="w-5 h-5" />,
    color: 'text-cyan-400',
    bgGradient: 'from-cyan-500 to-blue-600'
  },
  {
    id: 'beauty',
    name: 'Beauty & Style',
    description: 'Expert beauty and fashion consultant',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'text-pink-400',
    bgGradient: 'from-pink-500 to-rose-600'
  },
  {
    id: 'writing',
    name: 'Writing Assistant',
    description: 'Professional writing and editing support',
    icon: <PenTool className="w-5 h-5" />,
    color: 'text-green-400',
    bgGradient: 'from-green-500 to-emerald-600'
  },
  {
    id: 'code',
    name: 'Code Helper',
    description: 'Programming and development expert',
    icon: <Code className="w-5 h-5" />,
    color: 'text-purple-400',
    bgGradient: 'from-purple-500 to-violet-600'
  }
];

const MENU_ITEMS = [
  { id: 'home', name: 'Home', icon: <Home className="w-5 h-5" />, color: 'text-blue-400' },
  { id: 'chat', name: 'Chat', icon: <MessageCircle className="w-5 h-5" />, color: 'text-green-400' },
  { id: 'vision', name: 'Vision', icon: <Camera className="w-5 h-5" />, color: 'text-purple-400' },
  { id: 'voice', name: 'Voice', icon: <Headphones className="w-5 h-5" />, color: 'text-orange-400' },
  { id: 'creative', name: 'Creative', icon: <Palette className="w-5 h-5" />, color: 'text-pink-400' },
  { id: 'generate', name: 'Generate', icon: <Wand2 className="w-5 h-5" />, color: 'text-cyan-400' },
  { id: 'settings', name: 'Settings', icon: <Settings className="w-5 h-5" />, color: 'text-gray-400' }
];

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currentMode, setCurrentMode] = useState('general');
  const [activeMenu, setActiveMenu] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<'en-US' | 'sw-KE'>('en-US');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    initializeSession();
  }, []);

  const initializeSession = async () => {
    const sessionId = await supabaseService.createSession(currentMode);
    setCurrentSessionId(sessionId);
  };

  const handleSendMessage = async (content: string, isVoiceMessage: boolean = false) => {
    if (!content.trim()) return;

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

    if (currentSessionId) {
      await supabaseService.saveMessage(currentSessionId, content, true, 'text');

      if (messages.length === 0) {
        const title = await supabaseService.generateSessionTitle(content);
        await supabaseService.updateSessionTitle(currentSessionId, title);
      }
    }

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

      if (currentSessionId) {
        await supabaseService.saveMessage(currentSessionId, response, false, 'text');
      }
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

  const handleImageGeneration = async (prompt: string) => {
    if (!prompt.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: `Generate image: ${prompt}`,
      isUser: true,
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    if (currentSessionId) {
      await supabaseService.saveMessage(currentSessionId, `Generate image: ${prompt}`, true, 'text');
    }

    try {
      const response = await geminiService.generateImage(prompt);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response,
        isUser: false,
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, aiMessage]);

      if (currentSessionId) {
        await supabaseService.saveMessage(currentSessionId, response, false, 'text');
      }
    } catch (error) {
      console.error('Error generating image:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error generating the image guidance. Please try again.',
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
      speechService.stopListening();
      setIsListening(false);
    } else {
      if (speechService.getIsSpeaking()) {
        speechService.stopSpeaking();
      }

      try {
        speechService.setLanguage(currentLanguage);
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

  const toggleLanguage = () => {
    const newLanguage = currentLanguage === 'en-US' ? 'sw-KE' : 'en-US';
    setCurrentLanguage(newLanguage);
    speechService.setLanguage(newLanguage);
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

    if (currentSessionId) {
      await supabaseService.saveMessage(
        currentSessionId,
        `Uploaded: ${file.name}`,
        true,
        file.type.startsWith('image/') ? 'image' : 'document',
        file.name
      );
    }

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

      if (currentSessionId) {
        await supabaseService.saveMessage(currentSessionId, response, false, 'text');
      }
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

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleModeChange = (modeId: string) => {
    setCurrentMode(modeId);
    geminiService.setMode(modeId);
  };

  const clearChat = async () => {
    setMessages([]);
    const sessionId = await supabaseService.createSession(currentMode);
    setCurrentSessionId(sessionId);
  };

  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const handleSpeakMessage = (messageId: string, content: string) => {
    if (speakingMessageId === messageId) {
      speechService.stopSpeaking();
      setSpeakingMessageId(null);
    } else {
      if (speechService.getIsSpeaking()) {
        speechService.stopSpeaking();
      }
      setSpeakingMessageId(messageId);
      speechService.speak(content);

      const estimatedDuration = (content.length / 10) * 1000;
      setTimeout(() => setSpeakingMessageId(null), estimatedDuration);
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    const sessionMessages = await supabaseService.getSessionMessages(sessionId);
    const loadedMessages: Message[] = sessionMessages.map(msg => ({
      id: msg.id,
      content: msg.content,
      isUser: msg.is_user,
      timestamp: new Date(msg.created_at),
      type: msg.message_type,
      fileName: msg.file_name
    }));
    setMessages(loadedMessages);
    setIsHistoryOpen(false);
    setActiveMenu('chat');
  };

  const handleNewChat = async () => {
    setMessages([]);
    const sessionId = await supabaseService.createSession(currentMode);
    setCurrentSessionId(sessionId);
    setIsHistoryOpen(false);
    setActiveMenu('chat');
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (sessionId === currentSessionId) {
      await handleNewChat();
    }
  };

  const currentModeInfo = AI_MODES.find(mode => mode.id === currentMode);

  const renderContent = () => {
    switch (activeMenu) {
      case 'home':
        return (
          <div className="text-center py-8 sm:py-16 px-4">
            <div className={`w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r ${currentModeInfo?.bgGradient || 'from-blue-500 to-cyan-600'} rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg`}>
              <img
                src="/xlyger-logo.png"
                alt="Xlyger AI"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling!.classList.remove('hidden');
                }}
              />
              <div className="hidden w-10 h-10 sm:w-12 sm:h-12 text-white font-bold text-xl sm:text-2xl flex items-center justify-center">A</div>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent mb-3 sm:mb-4">
              Welcome to XLYGER AI
            </h1>
            <p className="text-lg sm:text-xl text-gray-400 mb-6 sm:mb-8 font-medium">Your intelligent companion for every task</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto mb-8 sm:mb-12">
              {AI_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => {
                    handleModeChange(mode.id);
                    setActiveMenu('chat');
                  }}
                  className={`group p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 active:scale-95 sm:hover:scale-105 touch-manipulation ${
                    currentMode === mode.id
                      ? `border-transparent bg-gradient-to-r ${mode.bgGradient} text-white shadow-xl`
                      : 'border-gray-700 hover:border-gray-600 bg-gray-800 hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center space-x-3 sm:space-x-4 mb-2 sm:mb-3">
                    <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl ${currentMode === mode.id ? 'bg-white/20' : 'bg-gray-700 group-hover:bg-gray-600'} transition-colors`}>
                      <div className={currentMode === mode.id ? 'text-white' : mode.color}>
                        {mode.icon}
                      </div>
                    </div>
                    <span className="font-bold text-base sm:text-lg">{mode.name}</span>
                  </div>
                  <p className={`text-left text-sm sm:text-base ${currentMode === mode.id ? 'text-white/90' : 'text-gray-400'}`}>
                    {mode.description}
                  </p>
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <button
                onClick={() => setActiveMenu('chat')}
                className="px-6 sm:px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg active:scale-95 sm:hover:scale-105 transition-all duration-200 touch-manipulation"
              >
                Start Chatting
              </button>
              <button
                onClick={() => setActiveMenu('generate')}
                className="px-6 sm:px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg active:scale-95 sm:hover:scale-105 transition-all duration-200 touch-manipulation"
              >
                Generate Image
              </button>
            </div>
          </div>
        );

      case 'chat':
        return (
          <div className="flex flex-col h-full">
            <div className="bg-gray-800/90 backdrop-blur-sm border-b border-gray-700 p-3 sm:p-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r ${currentModeInfo?.bgGradient} rounded-lg sm:rounded-xl flex items-center justify-center shadow-md flex-shrink-0`}>
                    <img
                      src="/xlyger-logo.png"
                      alt="AI"
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-full"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling!.classList.remove('hidden');
                      }}
                    />
                    <div className="hidden w-5 h-5 sm:w-6 sm:h-6 text-white font-bold text-xs sm:text-sm flex items-center justify-center">A</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-gray-200 text-sm sm:text-base truncate">{currentModeInfo?.name}</h2>
                    <p className="text-xs sm:text-sm text-gray-400 truncate hidden sm:block">{currentModeInfo?.description}</p>
                  </div>
                </div>
                <button
                  onClick={clearChat}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0 touch-manipulation"
                  title="Clear chat"
                >
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 custom-scrollbar">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <div className={`w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r ${currentModeInfo?.bgGradient} rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                    {currentModeInfo?.icon}
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-200 mb-2">Ready to help!</h3>
                  <p className="text-sm sm:text-base text-gray-400">Ask me anything or upload a file to get started.</p>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-3xl px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl shadow-sm ${
                      message.isUser
                        ? `bg-gradient-to-r ${currentModeInfo?.bgGradient} text-white`
                        : 'bg-gray-800 text-gray-200 border border-gray-700'
                    }`}
                  >
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      {!message.isUser && (
                        <div className={`w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r ${currentModeInfo?.bgGradient} rounded-full flex items-center justify-center mt-1 flex-shrink-0 shadow-md`}>
                          <img
                            src="/xlyger-logo.png"
                            alt="AI"
                            className="w-4 h-4 sm:w-5 sm:h-5 rounded-full"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling!.classList.remove('hidden');
                            }}
                          />
                          <div className="hidden w-4 h-4 sm:w-5 sm:h-5 text-white font-bold text-xs flex items-center justify-center">A</div>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        {message.type !== 'text' && (
                          <div className="flex items-center space-x-2 mb-2 text-sm opacity-75">
                            {message.type === 'image' && <ImageIcon className="w-4 h-4" />}
                            {message.type === 'audio' && <Volume2 className="w-4 h-4" />}
                            {message.type === 'video' && <Video className="w-4 h-4" />}
                            {message.type === 'document' && <FileText className="w-4 h-4" />}
                            <span className="truncate">{message.fileName}</span>
                          </div>
                        )}
                        <div className="whitespace-pre-wrap font-medium text-sm sm:text-base break-words">{message.content}</div>
                      </div>
                      {message.isUser && (
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white/20 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                          <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <div className={`flex items-center justify-between mt-3 ${message.isUser ? 'text-white/70' : 'text-gray-500'}`}>
                      <div className="text-xs">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                      {!message.isUser && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleCopyMessage(message.id, message.content)}
                            className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors touch-manipulation group"
                            title="Copy message"
                          >
                            {copiedMessageId === message.id ? (
                              <Check className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-400 group-hover:text-gray-300" />
                            )}
                          </button>
                          <button
                            onClick={() => handleSpeakMessage(message.id, message.content)}
                            className={`p-1.5 hover:bg-gray-700 rounded-lg transition-colors touch-manipulation group ${
                              speakingMessageId === message.id ? 'bg-blue-500/20' : ''
                            }`}
                            title={speakingMessageId === message.id ? 'Stop speaking' : 'Speak message'}
                          >
                            <Volume2 className={`w-4 h-4 ${
                              speakingMessageId === message.id ? 'text-blue-400 animate-pulse' : 'text-gray-400 group-hover:text-gray-300'
                            }`} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 text-gray-200 shadow-sm border border-gray-700 px-4 sm:px-6 py-3 sm:py-4 rounded-xl sm:rounded-2xl">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className={`w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r ${currentModeInfo?.bgGradient} rounded-full flex items-center justify-center shadow-md`}>
                        <img
                          src="/xlyger-logo.png"
                          alt="AI"
                          className="w-4 h-4 sm:w-5 sm:h-5 rounded-full"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling!.classList.remove('hidden');
                          }}
                        />
                        <div className="hidden w-4 h-4 sm:w-5 sm:h-5 text-white font-bold text-xs flex items-center justify-center">A</div>
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

            <div className="bg-gray-800/90 backdrop-blur-sm border-t border-gray-700 p-3 sm:p-4 rounded-b-2xl">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={toggleLanguage}
                  className="text-xs sm:text-sm px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors touch-manipulation font-medium"
                  title="Switch language"
                >
                  {currentLanguage === 'en-US' ? '🇺🇸 English' : '🇰🇪 Swahili'}
                </button>
              </div>
              <div className="flex items-end space-x-2 sm:space-x-3">
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
                    placeholder={`Ask ${currentModeInfo?.name} anything...`}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-12 border border-gray-700 bg-gray-900 text-gray-200 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none max-h-32 font-medium text-sm sm:text-base touch-manipulation placeholder-gray-500"
                    rows={1}
                    disabled={isLoading}
                  />
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 sm:p-3 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg sm:rounded-xl transition-colors touch-manipulation"
                  title="Upload file"
                  disabled={isLoading}
                >
                  <FileText className="w-5 h-5" />
                </button>

                <button
                  onClick={handleVoiceToggle}
                  className={`p-2 sm:p-3 rounded-lg sm:rounded-xl transition-colors touch-manipulation ${
                    isListening
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10'
                  }`}
                  title={isListening ? 'Stop recording' : `Start voice input (${currentLanguage === 'en-US' ? 'English' : 'Swahili'})`}
                  disabled={isLoading}
                >
                  {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <button
                  onClick={() => handleSendMessage(inputValue)}
                  disabled={!inputValue.trim() || isLoading}
                  className={`p-2 sm:p-3 bg-gradient-to-r ${currentModeInfo?.bgGradient} text-white rounded-lg sm:rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95 sm:hover:scale-105 touch-manipulation`}
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
        );

      case 'generate':
        return (
          <div className="flex flex-col h-full p-4 sm:p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Wand2 className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-200 mb-4">Image Generation</h2>
              <p className="text-sm sm:text-base text-gray-400 mb-8 max-w-2xl mx-auto">
                Describe the image you want to create and get detailed guidance for generating it with AI tools.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 mb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-3xl px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-sm ${
                      message.isUser
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white'
                        : 'bg-gray-800 text-gray-200 border border-gray-700'
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-medium text-sm sm:text-base break-words">{message.content}</div>
                    <div className={`text-xs mt-2 ${message.isUser ? 'text-white/70' : 'text-gray-500'}`}>
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 border border-gray-700 px-6 py-4 rounded-xl">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4">
              <div className="flex items-end space-x-3">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleImageGeneration(inputValue);
                    }
                  }}
                  placeholder="Describe the image you want to generate..."
                  className="flex-1 px-4 py-3 border border-gray-700 bg-gray-900 text-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none max-h-32 font-medium text-sm sm:text-base placeholder-gray-500"
                  rows={2}
                  disabled={isLoading}
                />
                <button
                  onClick={() => handleImageGeneration(inputValue)}
                  disabled={!inputValue.trim() || isLoading}
                  className="generate-btn p-3 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 active:scale-95 sm:hover:scale-105"
                  title="Generate"
                >
                  <Wand2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        );

      case 'vision':
        return (
          <div className="text-center py-8 sm:py-16 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
              <Camera className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-200 mb-4">Vision AI</h2>
            <p className="text-sm sm:text-base text-gray-400 mb-8 max-w-2xl mx-auto">
              Upload images for advanced AI analysis, object detection, text extraction, and visual insights.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 sm:px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg active:scale-95 sm:hover:scale-105 transition-all duration-200 touch-manipulation"
            >
              Upload Image
            </button>
          </div>
        );

      case 'voice':
        return (
          <div className="text-center py-8 sm:py-16 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
              <Headphones className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-200 mb-4">Voice Assistant</h2>
            <p className="text-sm sm:text-base text-gray-400 mb-8 max-w-2xl mx-auto">
              Interact with AI using natural speech. Perfect for hands-free conversations and accessibility.
            </p>
            <button
              onClick={handleVoiceToggle}
              className={`px-6 sm:px-8 py-3 font-semibold rounded-xl hover:shadow-lg active:scale-95 sm:hover:scale-105 transition-all duration-200 touch-manipulation ${
                isListening
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                  : 'bg-gradient-to-r from-orange-500 to-red-600 text-white'
              }`}
            >
              {isListening ? 'Stop Listening' : 'Start Voice Chat'}
            </button>
          </div>
        );

      case 'creative':
        return (
          <div className="text-center py-8 sm:py-16 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
              <Palette className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-200 mb-4">Creative Studio</h2>
            <p className="text-sm sm:text-base text-gray-400 mb-8 max-w-2xl mx-auto">
              Unleash your creativity with AI-powered writing, brainstorming, and artistic inspiration.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
              <button
                onClick={() => {
                  handleModeChange('writing');
                  setActiveMenu('chat');
                }}
                className="p-4 sm:p-6 bg-gray-800 rounded-xl border border-gray-700 hover:shadow-lg transition-all duration-200 active:scale-95 sm:hover:scale-105 touch-manipulation"
              >
                <PenTool className="w-8 h-8 text-green-400 mx-auto mb-3" />
                <h3 className="font-bold text-gray-200 mb-2">Writing</h3>
                <p className="text-sm text-gray-400">Stories, articles, and creative content</p>
              </button>
              <button
                onClick={() => {
                  handleModeChange('beauty');
                  setActiveMenu('chat');
                }}
                className="p-4 sm:p-6 bg-gray-800 rounded-xl border border-gray-700 hover:shadow-lg transition-all duration-200 active:scale-95 sm:hover:scale-105 touch-manipulation"
              >
                <Sparkles className="w-8 h-8 text-pink-400 mx-auto mb-3" />
                <h3 className="font-bold text-gray-200 mb-2">Beauty</h3>
                <p className="text-sm text-gray-400">Style advice and beauty tips</p>
              </button>
              <button
                onClick={() => {
                  handleModeChange('code');
                  setActiveMenu('chat');
                }}
                className="p-4 sm:p-6 bg-gray-800 rounded-xl border border-gray-700 hover:shadow-lg transition-all duration-200 active:scale-95 sm:hover:scale-105 touch-manipulation"
              >
                <Code className="w-8 h-8 text-purple-400 mx-auto mb-3" />
                <h3 className="font-bold text-gray-200 mb-2">Code</h3>
                <p className="text-sm text-gray-400">Programming and development</p>
              </button>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="text-center py-8 sm:py-16 px-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg">
              <Settings className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-200 mb-4">Settings</h2>
            <p className="text-sm sm:text-base text-gray-400 mb-8 max-w-2xl mx-auto">
              Customize your XLYGER AI experience with personalized preferences and options.
            </p>
            <div className="max-w-md mx-auto space-y-4">
              <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
                <h3 className="font-bold text-gray-200 mb-2">Current Mode</h3>
                <p className="text-sm text-gray-400">{currentModeInfo?.name}</p>
              </div>
              <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
                <h3 className="font-bold text-gray-200 mb-2">Voice Features</h3>
                <p className="text-sm text-gray-400">
                  {speechService.isSupported() ? 'Enabled' : 'Not supported'}
                </p>
              </div>
              <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
                <h3 className="font-bold text-gray-200 mb-2">Theme</h3>
                <p className="text-sm text-gray-400">Dark Mode</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      <div className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 sm:w-72 bg-gray-900/95 backdrop-blur-sm shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 border-r border-gray-800`}>
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
              <img
                src="/xlyger-logo.png"
                alt="Xlyger AI"
                className="w-6 h-6 rounded-full"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling!.classList.remove('hidden');
                }}
              />
              <div className="hidden w-6 h-6 text-white font-bold text-sm flex items-center justify-center">X</div>
            </div>
            <div>
              <h1 className="font-bold text-gray-200 text-base sm:text-lg">XLYGER</h1>
              <p className="text-xs text-gray-400">AI Assistant</p>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 text-gray-400 hover:text-gray-300 rounded-lg touch-manipulation"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveMenu(item.id);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 touch-manipulation ${
                activeMenu === item.id
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <div className={activeMenu === item.id ? 'text-white' : item.color}>
                {item.icon}
              </div>
              <span className="font-medium text-sm sm:text-base">{item.name}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-4 left-4 right-4 hidden lg:block">
          <div className="p-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-white">
            <h3 className="font-bold mb-1">Pro Features</h3>
            <p className="text-xs text-white/80 mb-3">Unlock advanced AI capabilities</p>
            <button className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors">
              Upgrade Now
            </button>
          </div>
        </div>
      </div>

      <div className={`${isHistoryOpen ? 'translate-x-0' : 'translate-x-full'} fixed inset-y-0 right-0 z-50 w-64 sm:w-80 bg-gray-900 shadow-xl transition-transform duration-300 ease-in-out border-l border-gray-800`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="font-bold text-gray-200">Chat History</h2>
          <button
            onClick={() => setIsHistoryOpen(false)}
            className="p-2 text-gray-400 hover:text-gray-300 rounded-lg touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <ChatHistory
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onDeleteSession={handleDeleteSession}
        />
      </div>

      <div className="flex-1 flex flex-col">
        <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 p-3 sm:p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-400 hover:text-gray-300 rounded-lg touch-manipulation"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            <div className="flex items-center space-x-4">
              <div className="hidden md:block">
                <h2 className="text-lg sm:text-xl font-bold text-gray-200 capitalize">{activeMenu}</h2>
                <p className="text-xs sm:text-sm text-gray-400">
                  {activeMenu === 'home' && 'Welcome to your AI assistant'}
                  {activeMenu === 'chat' && `Chatting with ${currentModeInfo?.name}`}
                  {activeMenu === 'vision' && 'AI-powered image analysis'}
                  {activeMenu === 'voice' && 'Voice-enabled conversations'}
                  {activeMenu === 'creative' && 'Creative AI tools and inspiration'}
                  {activeMenu === 'generate' && 'AI-powered image generation guidance'}
                  {activeMenu === 'settings' && 'Customize your experience'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsHistoryOpen(true)}
                className="p-2 text-gray-400 hover:text-cyan-400 rounded-lg touch-manipulation"
                title="Chat History"
              >
                <History className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden">
          <div className="h-full p-3 sm:p-6">
            <div className="h-full bg-gray-800/30 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-700/50 overflow-hidden">
              {renderContent()}
            </div>
          </div>
        </main>
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {isHistoryOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsHistoryOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
