export class SpeechService {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    this.synthesis = window.speechSynthesis;
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new (window as any).webkitSpeechRecognition();
    } else if ('SpeechRecognition' in window) {
      this.recognition = new (window as any).SpeechRecognition();
    }

    if (this.recognition) {
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';
    }
  }

  initialize() {
    // Already initialized in constructor
  }

  isSupported(): boolean {
    return this.recognition !== null && 'speechSynthesis' in window;
  }

  async startListening(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject('Speech recognition not supported');
        return;
      }

      // Stop any current speech when starting to listen
      this.stopSpeaking();

      this.isListening = true;

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        this.isListening = false;
        resolve(transcript);
      };

      this.recognition.onerror = (event) => {
        this.isListening = false;
        reject(`Speech recognition error: ${event.error}`);
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };

      try {
        this.recognition.start();
      } catch (error) {
        this.isListening = false;
        reject('Failed to start speech recognition');
      }
    });
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  speak(text: string) {
    // Stop any current speech
    this.stopSpeaking();

    // Fix pronunciation of XLYGER AI - spell it out letter by letter
    const correctedText = text.replace(/XLYGER AI/gi, 'X-L-Y-G-E-R A-I');

    this.currentUtterance = new SpeechSynthesisUtterance(correctedText);
    // Adjust speech parameters for a more natural, Siri-like voice
    this.currentUtterance.rate = 1.0;  // Normal speaking rate
    this.currentUtterance.pitch = 1.1; // Slightly higher pitch for clarity
    this.currentUtterance.volume = 1;
    
    // Try to use a female voice if available (similar to Siri)
    const voices = this.synthesis.getVoices();
    const femaleVoice = voices.find(voice => 
      voice.name.includes('female') || 
      voice.name.includes('Samantha') || 
      voice.name.includes('Google US English Female')
    );
    if (femaleVoice) {
      this.currentUtterance.voice = femaleVoice;
    }

    this.currentUtterance.onstart = () => {
      this.isSpeaking = true;
    };

    this.currentUtterance.onend = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
    };

    this.currentUtterance.onerror = () => {
      this.isSpeaking = false;
      this.currentUtterance = null;
    };

    this.synthesis.speak(this.currentUtterance);
  }

  stopSpeaking() {
    if (this.synthesis.speaking) {
      this.synthesis.cancel();
    }
    this.isSpeaking = false;
    this.currentUtterance = null;
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}

export const speechService = new SpeechService();