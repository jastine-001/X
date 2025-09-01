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
      const systemPrompt = AI_MODE_PROMPTS[this.currentMode] || AI_MODE_PROMPTS.general;
      
      // Build conversation context
      let conversationContext = systemPrompt;
      
      if (isVoiceMessage) {
        conversationContext += "\n\nNote: This is a voice message. Provide a comprehensive, professional response as if speaking to the user directly.";
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

  async analyzeImage(imageFile: File, prompt: string = "Describe this image"): Promise<string> {
    try {
      const imageData = await this.fileToGenerativePart(imageFile);
      const systemPrompt = AI_MODE_PROMPTS[this.currentMode] || AI_MODE_PROMPTS.general;
      
      const fullPrompt = `${systemPrompt}\n\nAnalyze this image professionally and provide detailed insights. ${prompt}`;
      
      const result = await this.model.generateContent([fullPrompt, imageData]);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error analyzing image:', error);
      if (error instanceof Error && error.message.includes('The model is overloaded')) {
        return "The AI model is currently overloaded. Please try again in a few moments.";
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