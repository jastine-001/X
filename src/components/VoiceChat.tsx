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
  const [voiceSettings, setVoiceSettings] = useState({
    rate: 0.9,
    pitch: 1,
    volume: 1,
    voice: 'default'
  });
  const [showSettings, setShowSettings] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load available voices
    const loadVoices = () => {
      const voices = speechService.getAvailableVoices();
      setAvailableVoices(voices);
    };

    loadVoices();
    
    // Some browsers load voices asynchronously
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
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
    speechService.speak(text, {
      rate: voiceSettings.rate,
      pitch: voiceSettings.pitch,
      volume: voiceSettings.volume,
      voice: voiceSettings.voice !== 'default' ? voiceSettings.voice : undefined
    });
    
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
  }, [voiceSettings]);

  if (!isEnabled) return null;

  return (
    <div className="relative">
      {/* Voice Control Buttons */}
      <div className="flex items-center space-x-2">
        {/* Microphone Button */}
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

        {/* Speaker Button */}
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

        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          title="Voice settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="absolute top-full left-0 mt-2 p-2 bg-red-500 text-white text-xs rounded-lg whitespace-nowrap z-50">
          {error}
        </div>
      )}

      {/* Voice Settings Panel */}
      {showSettings && (
        <div className="absolute top-full left-0 mt-2 p-4 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50 w-64">
          <h3 className="text-sm font-medium text-white mb-3">Voice Settings</h3>
          
          {/* Speech Rate */}
          <div className="mb-3">
            <label className="block text-xs text-gray-400 mb-1">Speech Rate</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={voiceSettings.rate}
              onChange={(e) => setVoiceSettings(prev => ({ ...prev, rate: parseFloat(e.target.value) }))}
              className="w-full"
            />
            <span className="text-xs text-gray-500">{voiceSettings.rate}x</span>
          </div>

          {/* Pitch */}
          <div className="mb-3">
            <label className="block text-xs text-gray-400 mb-1">Pitch</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={voiceSettings.pitch}
              onChange={(e) => setVoiceSettings(prev => ({ ...prev, pitch: parseFloat(e.target.value) }))}
              className="w-full"
            />
            <span className="text-xs text-gray-500">{voiceSettings.pitch}</span>
          </div>

          {/* Volume */}
          <div className="mb-3">
            <label className="block text-xs text-gray-400 mb-1">Volume</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={voiceSettings.volume}
              onChange={(e) => setVoiceSettings(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
              className="w-full"
            />
            <span className="text-xs text-gray-500">{Math.round(voiceSettings.volume * 100)}%</span>
          </div>

          {/* Voice Selection */}
          <div className="mb-3">
            <label className="block text-xs text-gray-400 mb-1">Voice</label>
            <select
              value={voiceSettings.voice}
              onChange={(e) => setVoiceSettings(prev => ({ ...prev, voice: e.target.value }))}
              className="w-full p-1 bg-gray-700 border border-gray-600 rounded text-white text-xs"
            >
              <option value="default">Default</option>
              {availableVoices.map((voice, index) => (
                <option key={index} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowSettings(false)}
            className="w-full p-2 bg-pink-500 hover:bg-pink-600 text-white rounded text-xs transition-colors"
          >
            Close Settings
          </button>
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