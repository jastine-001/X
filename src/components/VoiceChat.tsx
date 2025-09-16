import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Settings } from 'lucide-react';
import { speechService } from '../services/speechService';

interface VoiceChatProps {
  onVoiceMessage: (transcript: string) => void;
  onSpeakResponse: (text: string) => void;
  isEnabled: boolean;
}

export const VoiceChat: React.FC<VoiceChatProps> = ({ 
  onVoiceMessage, 
  onSpeakResponse,
  isEnabled 
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize speech service
    speechService.initialize();
  }, []);

  const handleStartListening = () => {
    if (!speechService.isSupported()) {
      setError('Voice features not supported in this browser');
      return;
    }

    setError(null);
    setIsListening(true);
    
    speechService.startListening(
      (transcript) => {
        setIsListening(false);
        onVoiceMessage(transcript);
      },
      (errorMessage) => {
        setIsListening(false);
        setError(errorMessage);
      }
    );
  };

  const handleStopListening = () => {
    speechService.stopListening();
    setIsListening(false);
  };

  const handleSpeakResponse = (text: string) => {
    setIsSpeaking(true);
    speechService.speak(text);
    
    // Reset speaking state after estimated duration
    const estimatedDuration = (text.length / 10) * 1000; // Rough estimate
    setTimeout(() => setIsSpeaking(false), estimatedDuration);
  };

  const handleStopSpeaking = () => {
    speechService.stopSpeaking();
    setIsSpeaking(false);
  };

  // Expose speak function to parent
  useEffect(() => {
    onSpeakResponse(handleSpeakResponse);
  }, []);

  if (!isEnabled) return null;

  return (
    <div className="relative">
      <div className="flex items-center space-x-2">
        <button
          onClick={isListening ? handleStopListening : handleStartListening}
          className={`p-2 rounded-lg transition-all duration-200 ${
            isListening 
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
              : 'bg-pink-500 hover:bg-pink-600 text-white'
          }`}
          title={isListening ? 'Stop listening' : 'Start voice input'}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <button
          onClick={isSpeaking ? handleStopSpeaking : () => handleSpeakResponse('Voice output test')}
          className={`p-2 rounded-lg transition-all duration-200 ${
            isSpeaking 
              ? 'bg-orange-500 hover:bg-orange-600 text-white animate-pulse' 
              : 'bg-purple-500 hover:bg-purple-600 text-white'
          }`}
          title={isSpeaking ? 'Stop speaking' : 'Test voice output'}
        >
          {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="absolute top-full left-0 mt-2 p-2 bg-red-500 text-white text-xs rounded-lg whitespace-nowrap z-50">
          {error}
        </div>
      )}

      {/* Status Indicators */}
      <div className="flex items-center space-x-2 mt-2">
        {isListening && (
          <div className="flex items-center space-x-1 text-xs text-red-400">
            <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
            <span>Listening...</span>
          </div>
        )}
        {isSpeaking && (
          <div className="flex items-center space-x-1 text-xs text-orange-400">
            <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
            <span>Speaking...</span>
          </div>
        )}
      </div>
    </div>
  );
};