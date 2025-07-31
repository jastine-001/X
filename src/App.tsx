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
  Check
} from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  mode: string;
  isLoading?: boolean;
  images?: string[];
  hasBeenCopied?: boolean;
}

interface AIMode {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  textColor: string;
  bgColor: string;
}

const AI_MODES: AIMode[] = [
  {
    id: 'general',
    name: 'General AI',
    icon: <Brain className="w-5 h-5" />,
    color: '#3B82F6',
    textColor: 'text-blue-400',
    bgColor: 'bg-blue-500'
  },
  {
    id: 'writing',
    name: 'Writing Assistant',
    icon: <PenTool className="w-5 h-5" />,
    color: '#8B5CF6',
    textColor: 'text-purple-400',
    bgColor: 'bg-purple-500'
  },
  {
    id: 'code',
    name: 'Code Helper',
    icon: <Code className="w-5 h-5" />,
    color: '#10B981',
    textColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500'
  },
  {
    id: 'beauty',
    name: 'Beauty & Solutions',
    icon: <Sparkles className="w-5 h-5" />,
    color: '#EC4899',
    textColor: 'text-pink-400',
    bgColor: 'bg-pink-500'
  }
];

// Daily usage tracking
interface DailyUsage {
  date: string;
  imageGenerations: number;
  uploads: number;
}

const DAILY_LIMITS = {
  images: 6,
  uploads: 10
};

function App() {
  const [currentMode, setCurrentMode] = useState<AIMode>(AI_MODES[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [dailyUsage, setDailyUsage] = useState<DailyUsage>(() => {
    const today = new Date().toDateString();
    const saved = localStorage.getItem('xlyger-daily-usage');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.date === today) {
        return parsed;
      }
    }
    return { date: today, imageGenerations: 0, uploads: 0 };
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Save daily usage to localStorage
  useEffect(() => {
    localStorage.setItem('xlyger-daily-usage', JSON.stringify(dailyUsage));
  }, [dailyUsage]);

  // Reset daily usage at midnight
  useEffect(() => {
    const checkDate = () => {
      const today = new Date().toDateString();
      if (dailyUsage.date !== today) {
        setDailyUsage({ date: today, imageGenerations: 0, uploads: 0 });
      }
    };
    
    const interval = setInterval(checkDate, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [dailyUsage.date]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Get conversation history for context
  const getConversationHistory = () => {
    return messages.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
  };

  // Generate images using a placeholder service (you can replace with actual image generation API)
  const generateImages = async (query: string): Promise<string[]> => {
    // Simulate image generation with placeholder images from Pexels
    const imageQueries = [
      `${query} professional`,
      `${query} modern`,
      `${query} elegant`
    ];
    
    return imageQueries.map((q, index) => 
      `https://images.pexels.com/photos/${1000000 + Math.floor(Math.random() * 1000000)}/pexels-photo-${1000000 + Math.floor(Math.random() * 1000000)}.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&fit=crop`
    );
  };

  // Check if query needs images
  const shouldGenerateImages = (message: string, mode: string): boolean => {
    const imageKeywords = [
      'show', 'picture', 'image', 'photo', 'visual', 'example', 'product', 
      'beauty', 'makeup', 'skincare', 'fashion', 'style', 'design', 'tutorial',
      'education', 'learn', 'study', 'course', 'book', 'reference'
    ];
    
    return imageKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    ) || mode === 'beauty';
  };

  // Copy text to clipboard
  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, hasBeenCopied: true }
          : msg
      ));
      
      // Reset copy status after 2 seconds
      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, hasBeenCopied: false }
            : msg
        ));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  // Format AI response text (make important text bold instead of using *)
  const formatResponseText = (text: string): string => {
    // Replace **text** with <strong>text</strong>
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Replace *text* with <em>text</em>
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    return formatted;
  };

  const handleModeChange = (mode: AIMode) => {
    if (mode.id !== currentMode.id) {
      setCurrentMode(mode);
      geminiService.setMode(mode.id);
      
      // Add mode switch message
      const switchMessage: Message = {
        id: Date.now().toString(),
        type: 'ai',
        content: `**Welcome to XLYGER AI**\n\n*${mode.name} Mode*\n\nHow can I help you today?`,
        timestamp: new Date(),
        mode: mode.id
      };
      
      setMessages(prev => [...prev, switchMessage]);
    }
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const messageContent = inputMessage.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: messageContent,
      timestamp: new Date(),
      mode: currentMode.id
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Generate real AI response
    const generateResponse = async () => {
      try {
        const conversationHistory = getConversationHistory();
        const aiResponseText = await geminiService.generateResponse(messageContent, conversationHistory);
        
        // Check if we should generate images
        const needsImages = shouldGenerateImages(messageContent, currentMode.id);
        let images: string[] = [];
        
        if (needsImages && dailyUsage.imageGenerations < DAILY_LIMITS.images) {
          images = await generateImages(messageContent);
          setDailyUsage(prev => ({
            ...prev,
            imageGenerations: prev.imageGenerations + images.length
          }));
        }
        
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: aiResponseText,
          timestamp: new Date(),
          mode: currentMode.id,
          images: images.length > 0 ? images : undefined
        };
        setMessages(prev => [...prev, aiResponse]);
      } catch (error) {
        const errorResponse: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          content: "I apologize, but I'm experiencing some technical difficulties. Please try again in a moment.",
          timestamp: new Date(),
          mode: currentMode.id
        };
        setMessages(prev => [...prev, errorResponse]);
      } finally {
        setIsTyping(false);
      }
    };

    generateResponse();
  };

  const handleNewChat = () => {
    setMessages([]);
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      type: 'ai',
      content: `**Welcome to XLYGER AI**\n\n*${currentMode.name} Mode*\n\nHow can I help you today?`,
      timestamp: new Date(),
      mode: currentMode.id
    };
    setMessages([welcomeMessage]);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && dailyUsage.uploads < DAILY_LIMITS.uploads) {
      setDailyUsage(prev => ({
        ...prev,
        uploads: prev.uploads + 1
      }));
      
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');
      
      const fileMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: `Uploaded ${isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'file'}: ${file.name}`,
        timestamp: new Date(),
        mode: currentMode.id
      };
      setMessages(prev => [...prev, fileMessage]);

      setIsTyping(true);

      // Generate AI response to file
      const analyzeFile = async () => {
        try {
          let aiResponseText;
          
          if (isImage || isVideo) {
            aiResponseText = await geminiService.analyzeImage(file, "Please analyze this image and provide insights based on the current mode.");
          } else if (isAudio) {
            aiResponseText = `I can see you've uploaded an audio file "${file.name}". While I can process audio content, I'd be happy to help you with any questions about it or assist you in the current ${currentMode.name} mode.`;
          } else {
            aiResponseText = `I can see you've uploaded "${file.name}". While I can't directly process this file type, I'd be happy to help you with any questions about it or assist you in the current ${currentMode.name} mode.`;
          }
          
          const aiResponse: Message = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: aiResponseText,
            timestamp: new Date(),
            mode: currentMode.id
          };
          setMessages(prev => [...prev, aiResponse]);
        } catch (error) {
          const errorResponse: Message = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: "I'm having trouble analyzing this file right now. Please try again later.",
            timestamp: new Date(),
            mode: currentMode.id
          };
          setMessages(prev => [...prev, errorResponse]);
        } finally {
          setIsTyping(false);
        }
      };

      analyzeFile();
    } else if (dailyUsage.uploads >= DAILY_LIMITS.uploads) {
      alert(`Daily upload limit reached (${DAILY_LIMITS.uploads}). Please try again tomorrow.`);
    }
    
    // Reset file input
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleVoiceMessage = (transcript: string) => {
    if (transcript.trim()) {
      const voiceMessage: Message = {
        id: Date.now().toString(),
        type: 'user',
        content: `🎤 ${transcript}`,
        timestamp: new Date(),
        mode: currentMode.id
      };
      setMessages(prev => [...prev, voiceMessage]);

      setIsTyping(true);

      // Generate AI response to voice message
      const generateVoiceResponse = async () => {
        try {
          const conversationHistory = getConversationHistory();
          const aiResponseText = await geminiService.generateResponse(transcript, conversationHistory);
          
          // Check if we should generate images for voice queries too
          const needsImages = shouldGenerateImages(transcript, currentMode.id);
          let images: string[] = [];
          
          if (needsImages && dailyUsage.imageGenerations < DAILY_LIMITS.images) {
            images = await generateImages(transcript);
            setDailyUsage(prev => ({
              ...prev,
              imageGenerations: prev.imageGenerations + images.length
            }));
          }
          
          const aiResponse: Message = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: aiResponseText,
            timestamp: new Date(),
            mode: currentMode.id,
            images: images.length > 0 ? images : undefined
          };
          setMessages(prev => [...prev, aiResponse]);
        } catch (error) {
          const errorResponse: Message = {
            id: (Date.now() + 1).toString(),
            type: 'ai',
            content: "I'm having trouble processing your voice message right now. Please try again.",
            timestamp: new Date(),
            mode: currentMode.id
          };
          setMessages(prev => [...prev, errorResponse]);
        } finally {
          setIsTyping(false);
        }
      };

      generateVoiceResponse();
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
        // For now, simulate speech-to-text with a placeholder
        // In a real implementation, you'd use a speech-to-text service
        handleVoiceMessage("This is a simulated transcription of your voice message. In a production app, this would be the actual transcribed text from your speech.");
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);

      setTimeout(() => {
        if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          stream.getTracks().forEach(track => track.stop());
        }
      }, 3000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
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
      <div className={`
        fixed lg:relative inset-y-0 left-0 z-50 w-80 bg-gray-800 border-r border-gray-700 flex flex-col transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="p-4 lg:p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="font-bold text-lg text-white">XL</span>
              </div>
              <div>
                <div className="text-sm text-gray-400">XLYGER</div>
                <div className="text-xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                  XLYGER AI
                </div>
              </div>
            </div>
            {/* Close button for mobile */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Daily Usage Stats */}
        <div className="p-4 lg:p-6 border-b border-gray-700">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Daily Usage</h3>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Images Generated:</span>
              <span className={dailyUsage.imageGenerations >= DAILY_LIMITS.images ? 'text-red-400' : 'text-green-400'}>
                {dailyUsage.imageGenerations}/{DAILY_LIMITS.images}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Files Uploaded:</span>
              <span className={dailyUsage.uploads >= DAILY_LIMITS.uploads ? 'text-red-400' : 'text-green-400'}>
                {dailyUsage.uploads}/{DAILY_LIMITS.uploads}
              </span>
            </div>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="p-4 lg:p-6">
          <h3 className="text-gray-400 text-sm font-medium mb-4">Select Mode</h3>
          <div className="space-y-2">
            {AI_MODES.map((mode) => (
              <button
                key={mode.id}
                onClick={() => {
                  handleModeChange(mode);
                  setIsSidebarOpen(false); // Close sidebar on mobile after selection
                }}
                className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 hover:bg-gray-700 ${
                  currentMode.id === mode.id 
                    ? `${mode.bgColor} text-white shadow-lg transform scale-105` 
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                {mode.icon}
                <span className="font-medium text-sm lg:text-base">{mode.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-4 lg:p-6">
          <button
            onClick={() => {
              handleNewChat();
              setIsSidebarOpen(false); // Close sidebar on mobile after action
            }}
            className="w-full flex items-center justify-center space-x-2 p-3 bg-pink-500 hover:bg-pink-600 rounded-lg transition-colors duration-200 font-medium text-sm lg:text-base"
          >
            <Plus className="w-5 h-5" />
            <span>NEW CHAT</span>
          </button>
        </div>

        {/* Quick Prompts */}
        <div className="p-4 lg:p-6 mt-auto">
          <h3 className="text-gray-400 text-sm font-medium mb-4">Quick Prompts</h3>
          <div className="space-y-2">
            <button 
              onClick={() => {
                setInputMessage("Help me get started");
                setIsSidebarOpen(false);
              }}
              className="w-full text-left p-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              "Help me get started"
            </button>
            <button 
              onClick={() => {
                setInputMessage("What can you do?");
                setIsSidebarOpen(false);
              }}
              className="w-full text-left p-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              "What can you do?"
            </button>
            <button 
              onClick={() => {
                setInputMessage("Show me examples");
                setIsSidebarOpen(false);
              }}
              className="w-full text-left p-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              "Show me examples"
            </button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2">
            <div className={`w-6 h-6 ${currentMode.bgColor} rounded-full flex items-center justify-center`}>
              {React.cloneElement(currentMode.icon as React.ReactElement, { className: "w-3 h-3" })}
            </div>
            <span className={`font-medium text-sm ${currentMode.textColor}`}>
              {currentMode.name}
            </span>
          </div>
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-6 space-y-4 lg:space-y-6 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center px-4">
                <div className={`w-12 h-12 lg:w-16 lg:h-16 ${currentMode.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  {React.cloneElement(currentMode.icon as React.ReactElement, { className: "w-6 h-6 lg:w-8 lg:h-8" })}
                </div>
                <h2 className="text-xl lg:text-2xl font-bold text-white mb-2">
                  Welcome to XLYGER AI
                </h2>
                <p className={`text-lg ${currentMode.textColor} mb-4`}>
                  {currentMode.name} Mode
                </p>
                <p className="text-gray-400 text-sm lg:text-base">How can I help you today?</p>
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const messageMode = AI_MODES.find(mode => mode.id === message.mode) || currentMode;
              return (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex space-x-2 lg:space-x-3 max-w-[85%] lg:max-w-3xl ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    <div className={`w-6 h-6 lg:w-8 lg:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.type === 'user' 
                        ? 'bg-gray-600' 
                        : `${messageMode.bgColor}`
                    }`}>
                      {message.type === 'user' ? (
                        <span className="text-xs lg:text-sm font-bold">U</span>
                      ) : (
                        <img 
                          src="/xlyger-logo.svg" 
                          alt="Xlyger AI" 
                          className="w-4 h-4 lg:w-6 lg:h-6 rounded-full object-cover"
                          onError={(e) => {
                            // Fallback to text if image fails to load
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling!.style.display = 'inline';
                          }}
                        />
                      )}
                      <span className="text-xs lg:text-sm font-bold hidden">A</span>
                    </div>
                    <div className={`flex-1 ${message.type === 'user' ? 'text-right' : ''}`}>
                      <div className={`inline-block p-3 lg:p-4 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-gray-700 text-white'
                          : `bg-gray-800 border border-gray-700 ${messageMode.textColor}`
                      }`}>
                        <div 
                          className="leading-relaxed whitespace-pre-wrap text-sm lg:text-base"
                          dangerouslySetInnerHTML={{ __html: formatResponseText(message.content) }}
                        />
                        
                        {/* Display generated images */}
                        {message.images && message.images.length > 0 && (
                          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {message.images.map((imageUrl, index) => (
                              <div key={index} className="relative">
                                <img 
                                  src={imageUrl} 
                                  alt={`Generated image ${index + 1}`}
                                  className="w-full h-32 object-cover rounded-lg"
                                  onError={(e) => {
                                    e.currentTarget.src = `https://via.placeholder.com/300x200/374151/9CA3AF?text=Image+${index + 1}`;
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Copy button for AI messages */}
                        {message.type === 'ai' && (
                          <button
                            onClick={() => copyToClipboard(message.content, message.id)}
                            className="mt-2 flex items-center space-x-1 text-xs text-gray-400 hover:text-white transition-colors"
                          >
                            {message.hasBeenCopied ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex space-x-2 lg:space-x-3 max-w-[85%] lg:max-w-3xl">
                <div className={`w-6 h-6 lg:w-8 lg:h-8 rounded-full flex items-center justify-center flex-shrink-0 ${currentMode.bgColor}`}>
                  <img 
                    src="/xlyger-logo.svg" 
                    alt="Xlyger AI" 
                    className="w-4 h-4 lg:w-6 lg:h-6 rounded-full object-cover"
                    onError={(e) => {
                      // Fallback to text if image fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling!.style.display = 'inline';
                    }}
                  />
                  <span className="text-xs lg:text-sm font-bold hidden">A</span>
                </div>
                <div className="flex-1">
                  <div className={`inline-block p-3 lg:p-4 rounded-lg bg-gray-800 border border-gray-700 ${currentMode.textColor}`}>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-700 p-3 lg:p-6 bg-gray-900 safe-area-inset-bottom">
          {/* Media buttons - horizontal scroll on mobile */}
          <div className="flex items-center space-x-2 lg:space-x-4 mb-3 lg:mb-4 overflow-x-auto pb-2">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`p-2 lg:p-2 hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0 ${
                dailyUsage.uploads >= DAILY_LIMITS.uploads 
                  ? 'text-gray-500 cursor-not-allowed' 
                  : 'text-pink-400 hover:text-pink-300'
              }`}
              title="Upload file"
              disabled={dailyUsage.uploads >= DAILY_LIMITS.uploads}
            >
              <Image className="w-4 h-4 lg:w-5 lg:h-5" />
            </button>
            
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-2 lg:p-2 hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0 ${
                isRecording ? 'text-red-400 animate-pulse' : 'text-pink-400 hover:text-pink-300'
              }`}
              title={isRecording ? 'Stop recording' : 'Record voice'}
            >
              <Mic className="w-4 h-4 lg:w-5 lg:h-5" />
            </button>
            
            <button
              className="p-2 lg:p-2 text-pink-400 hover:text-pink-300 hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
              title="Video call"
            >
              <Video className="w-4 h-4 lg:w-5 lg:h-5" />
            </button>
            
            <button
              className="p-2 lg:p-2 text-pink-400 hover:text-pink-300 hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
              title="Voice note"
            >
              <Circle className="w-4 h-4 lg:w-5 lg:h-5" />
            </button>
          </div>

          {/* Message input */}
          <div className="flex items-center space-x-2 lg:space-x-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Send a message..."
                className="w-full p-3 lg:p-4 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 text-sm lg:text-base"
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isTyping}
              className="p-3 lg:p-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors flex-shrink-0"
            >
              <Send className="w-4 h-4 lg:w-5 lg:h-5" />
            </button>
          </div>

          <div className="text-center text-xs text-gray-500 mt-3 lg:mt-4">
            Free Research Preview. XLYGER AI may produce inaccurate information.
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;