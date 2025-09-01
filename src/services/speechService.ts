export class SpeechService {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis;
  private isListening: boolean = false;
  private onResultCallback: ((text: string) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isListening = true;
    };

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (this.onResultCallback) {
        this.onResultCallback(transcript);
      }
    };

    this.recognition.onerror = (event) => {
      this.isListening = false;
      const errorMessage = this.getErrorMessage(event.error);
      if (this.onErrorCallback) {
        this.onErrorCallback(errorMessage);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };
  }

  private getErrorMessage(error: string): string {
    switch (error) {
      case 'no-speech':
        return 'No speech detected. Please try speaking again.';
      case 'audio-capture':
        return 'Microphone not accessible. Please check permissions.';
      case 'not-allowed':
        return 'Microphone permission denied. Please allow microphone access.';
      case 'network':
        return 'Network error occurred. Please check your connection.';
      default:
        return 'Speech recognition error. Please try again.';
    }
  }

  startListening(onResult: (text: string) => void, onError: (error: string) => void) {
    if (!this.recognition) {
      onError('Speech recognition not supported in this browser');
      return;
    }

    if (this.isListening) {
      this.stopListening();
      return;
    }

    this.onResultCallback = onResult;
    this.onErrorCallback = onError;
    
    try {
      this.recognition.start();
    } catch (error) {
      onError('Failed to start speech recognition');
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  speak(text: string, options: { rate?: number; pitch?: number; volume?: number; voice?: string } = {}) {
    // Cancel any ongoing speech
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set voice options
    utterance.rate = options.rate || 0.9;
    utterance.pitch = options.pitch || 1;
    utterance.volume = options.volume || 1;

    // Try to use a specific voice if requested
    if (options.voice) {
      const voices = this.synthesis.getVoices();
      const selectedVoice = voices.find(voice => 
        voice.name.toLowerCase().includes(options.voice!.toLowerCase()) ||
        voice.lang.includes(options.voice!)
      );
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    this.synthesis.speak(utterance);
  }

  stopSpeaking() {
    this.synthesis.cancel();
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    return this.synthesis.getVoices();
  }

  isSupported(): boolean {
    return !!(this.recognition && this.synthesis);
  }

  get listening(): boolean {
    return this.isListening;
  }
}

export const speechService = new SpeechService();