import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'AIzaSyDnptLsjysBxHlh7i7aayoJJYKYTkmYsy4';

const genAI = new GoogleGenerativeAI(API_KEY);

interface AIMode {
  id: string;
  name: string;
  systemPrompt: string;
}

const AI_MODE_PROMPTS: Record<string, string> = {
  beauty: `You are a professional beauty and style consultant AI. Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. Provide expert advice on skincare routines and product recommendations, makeup techniques and color matching, fashion styling and outfit coordination, hair care and styling tips, beauty trends and seasonal looks, and personal style development.

Respond in a friendly, encouraging tone with practical, actionable advice. Always consider different skin types, budgets, and personal preferences. Use natural language with clear structure. Format responses like ChatGPT with proper paragraphs and natural flow. Never use asterisks, hashtags, or markdown symbols. Use numbered points and natural emphasis. Provide current trends and up-to-date information for 2025.`,

  writing: `You are an expert writing assistant AI. Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. Help with creative writing and storytelling, academic and professional writing, grammar and style improvements, content structure and organization, editing and proofreading, and writing techniques and best practices.

Provide clear, constructive feedback and suggestions. Help users improve their writing skills while maintaining their unique voice. Format responses naturally like ChatGPT with proper paragraphs and conversational flow. Never use asterisks, hashtags, or markdown symbols. Use numbered points and natural emphasis. Include current writing trends and digital publishing insights for 2025.`,

  code: `You are a senior software developer and coding mentor AI. Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. Assist with programming in various languages, code review and optimization, debugging and troubleshooting, best practices and design patterns, algorithm and data structure guidance, and framework recommendations.

Provide clean, well-commented code examples with clear explanations. Focus on teaching good programming practices. Format responses naturally like ChatGPT with proper paragraphs and conversational explanations. Never use asterisks, hashtags, or markdown symbols. Use numbered steps and natural emphasis. Include current technology trends and best practices for 2025.`,

  general: `You are XLYGER AI, a helpful and knowledgeable general-purpose AI assistant. Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. Help with answering questions on a wide range of topics, problem-solving and analysis, research and information gathering, creative tasks and brainstorming, learning and education support, general conversation and advice, file analysis and processing, translation and transcription services, and professional content creation.

Be informative, accurate, and engaging. Adapt your communication style to match user needs and preferences. Format responses naturally like ChatGPT with proper paragraphs and conversational flow. Never use asterisks, hashtags, or markdown symbols. Use numbered points and natural emphasis. Always provide actionable insights and professional guidance with current information for 2025.`
};

export class GeminiService {
  private model: any;
  private currentMode: string = 'general';

  constructor() {
    this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
  }

  setMode(mode: string) {
    this.currentMode = mode;
  }

  async generateResponse(message: string, conversationHistory: Array<{role: string, content: string}> = [], isVoiceMessage: boolean = false): Promise<string> {
    try {
      // Analyze question complexity to determine response length
      const questionComplexity = this.analyzeQuestionComplexity(message);
      
      const systemPrompt = AI_MODE_PROMPTS[this.currentMode] || AI_MODE_PROMPTS.general;
      
      // Build conversation context
      let conversationContext = systemPrompt;
      
      if (isVoiceMessage) {
        conversationContext += "\n\nNote: This is a voice message. Provide a comprehensive, professional response as if speaking to the user directly.";
      }
      
      // Add response length instruction based on complexity
      if (questionComplexity === 'simple') {
        conversationContext += "\n\nIMPORTANT: This is a simple question. Provide a SHORT, DIRECT answer (20-60 words). Be concise and to the point.";
      } else if (questionComplexity === 'complex') {
        conversationContext += "\n\nIMPORTANT: This is a complex question. Provide a DETAILED, COMPREHENSIVE response (100-400+ words) with step-by-step guidance.";
      } else {
        conversationContext += "\n\nIMPORTANT: Provide a BALANCED response (50-200 words). Include key details but stay focused.";
      }
      
      // Check if topic change might need new conversation
      if (this.shouldSuggestNewChat(message, conversationHistory)) {
        conversationContext += "\n\nNote: If this seems like a different topic from the current conversation, suggest starting a new chat to keep things organized.";
      }
      
      conversationContext += "\n\n";
      
      // Add recent conversation history (last 10 messages)
      const recentHistory = conversationHistory.slice(-10);
      recentHistory.forEach(msg => {
        conversationContext += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
      
      conversationContext += `User: ${message}\nAssistant:`;

      const result = await this.model.generateContent(conversationContext);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating AI response:', error);
      if (error instanceof Error && error.message.includes('The model is overloaded')) {
        return "The AI model is currently overloaded. Please try again in a few moments.";
      }
      return "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.";
    }
  }

  private analyzeQuestionComplexity(message: string): 'simple' | 'medium' | 'complex' {
    const lowerMessage = message.toLowerCase();
    
    // Simple question indicators
    const simpleIndicators = [
      'how to', 'how do i', 'what is', 'where is', 'when is', 'who is',
      'restart', 'turn on', 'turn off', 'enable', 'disable', 'fix',
      'quick', 'simple', 'basic', 'short answer'
    ];
    
    // Complex question indicators
    const complexIndicators = [
      'explain', 'tutorial', 'step by step', 'guide', 'complete',
      'business plan', 'strategy', 'analysis', 'comparison',
      'exam', 'study', 'learn', 'course', 'project',
      'code', 'programming', 'development', 'algorithm',
      'ai', 'machine learning', 'data science',
      'marketing', 'startup', 'investment'
    ];
    
    // Check for complex indicators first
    if (complexIndicators.some(indicator => lowerMessage.includes(indicator))) {
      return 'complex';
    }
    
    // Check for simple indicators
    if (simpleIndicators.some(indicator => lowerMessage.includes(indicator))) {
      return 'simple';
    }
    
    // Check message length as additional factor
    if (message.length < 30) {
      return 'simple';
    } else if (message.length > 100) {
      return 'complex';
    }
    
    return 'medium';
  }

  private shouldSuggestNewChat(message: string, conversationHistory: Array<{role: string, content: string}>): boolean {
    if (conversationHistory.length < 4) return false; // Don't suggest for short conversations
    
    const lowerMessage = message.toLowerCase();
    const topicChangeIndicators = [
      'now let\'s talk about', 'switching topics', 'different question',
      'new topic', 'change subject', 'something else',
      'by the way', 'also', 'another thing'
    ];
    
    return topicChangeIndicators.some(indicator => lowerMessage.includes(indicator));
  }

  async analyzeImage(imageFile: File, prompt: string = "Describe this image"): Promise<string> {
    try {
      console.log('Starting image analysis for:', imageFile.name, imageFile.type);
      const imageData = await this.fileToGenerativePart(imageFile);
      const systemPrompt = AI_MODE_PROMPTS[this.currentMode] || AI_MODE_PROMPTS.general;
      
      const fullPrompt = `${systemPrompt}\n\nAnalyze this image professionally and provide detailed insights. Focus on:
      1. What you see in the image (objects, people, scenes)
      2. Colors, lighting, and composition
      3. Any text or writing visible
      4. Technical quality and characteristics
      5. Potential uses or applications
      6. Professional recommendations
      
      ${prompt}`;
      
      console.log('Sending image to Gemini for analysis...');
      const result = await this.model.generateContent([fullPrompt, imageData]);
      const response = await result.response;
      const analysisText = response.text();
      console.log('Image analysis completed successfully');
      return analysisText;
    } catch (error) {
      console.error('Error analyzing image:', error);
      if (error instanceof Error && error.message.includes('The model is overloaded')) {
        return "The AI model is currently overloaded. Please try again in a few moments.";
      }
      if (error instanceof Error && error.message.includes('SAFETY')) {
        return "This image cannot be analyzed due to safety restrictions. Please try a different image.";
      }
      return "I'm having trouble analyzing this image right now. Please try again later.";
    }
  }

  private async fileToGenerativePart(file: File): Promise<any> {
    const base64EncodedDataPromise = new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]);
        }
      };
      reader.readAsDataURL(file);
    });

    return {
      inlineData: {
        data: await base64EncodedDataPromise,
        mimeType: file.type,
      },
    };
  }
}

export const geminiService = new GeminiService();