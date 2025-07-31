// Speech recognition service using Web Speech API
export class SpeechService {
  private recognition: SpeechRecognition | null = null;
  private isSupported: boolean = false;

  constructor() {
    // Check if browser supports SpeechRecognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      this.isSupported = true;
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognitionAPI();
      
      // Configure recognition
      if (this.recognition) {
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US'; // Default language
      }
    }
  }

  /**
   * Start speech recognition and return transcript via callback
   */
  startListening(onResult: (transcript: string) => void, onError: (error: string) => void): void {
    if (!this.isSupported || !this.recognition) {
      onError('Speech recognition is not supported in this browser');
      return;
    }

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
    };

    this.recognition.onerror = (event) => {
      onError(`Speech recognition error: ${event.error}`);
    };

    this.recognition.start();
  }

  /**
   * Stop speech recognition
   */
  stopListening(): void {
    if (this.recognition) {
      this.recognition.stop();
    }
  }

  /**
   * Check if speech recognition is supported
   */
  isSpeechRecognitionSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Set recognition language
   */
  setLanguage(languageCode: string): void {
    if (this.recognition) {
      this.recognition.lang = languageCode;
    }
  }
}

// Add TypeScript declarations for the Web Speech API
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export const speechService = new SpeechService();