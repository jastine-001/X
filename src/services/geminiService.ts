import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = 'AIzaSyDzFJ1AqQVXfdNqUquh2WUk6ol9zH-tm4I';

const genAI = new GoogleGenerativeAI(API_KEY);

interface AIMode {
  id: string;
  name: string;
  systemPrompt: string;
}

const AI_MODE_PROMPTS: Record<string, string> = {
  beauty: `You are a professional beauty and style consultant AI. You provide expert advice on:
- Skincare routines and product recommendations
- Makeup techniques and color matching
- Fashion styling and outfit coordination
- Hair care and styling tips
- Beauty trends and seasonal looks
- Personal style development

Respond in a friendly, encouraging tone with practical, actionable advice. Always consider different skin types, budgets, and personal preferences.`,

  writing: `You are an expert writing assistant AI. You help with:
- Creative writing and storytelling
- Academic and professional writing
- Grammar, style, and clarity improvements
- Content structure and organization
- Editing and proofreading
- Writing techniques and best practices

Provide clear, constructive feedback and suggestions. Help users improve their writing skills while maintaining their unique voice.`,

  code: `You are a senior software developer and coding mentor AI. You assist with:
- Programming in various languages (JavaScript, Python, Java, C++, etc.)
- Code review and optimization
- Debugging and troubleshooting
- Best practices and design patterns
- Algorithm and data structure guidance
- Framework and library recommendations

Provide clean, well-commented code examples with explanations. Focus on teaching good programming practices.`,

  general: `You are XLYGER AI, a helpful and knowledgeable general-purpose AI assistant. You can help with:
- Answering questions on a wide range of topics
- Problem-solving and analysis
- Research and information gathering
- Creative tasks and brainstorming
- Learning and education support
- General conversation and advice

Be informative, accurate, and engaging. Adapt your communication style to match the user's needs and preferences.`
};

// Types of media that can be processed
export type MediaType = 'text' | 'image' | 'audio' | 'video';

// Interface for media content
export interface MediaContent {
  type: MediaType;
  content: string | File;
  description?: string;
}

export class GeminiService {
  private model: any;
  private visionModel: any;
  private currentMode: string = 'general';

  constructor() {
    this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    this.visionModel = genAI.getGenerativeModel({ model: "gemini-2.0-pro-vision-exp" });
  }

  setMode(mode: string) {
    this.currentMode = mode;
  }

  async generateResponse(message: string, conversationHistory: Array<{role: string, content: string}> = []): Promise<string> {
    try {
      const systemPrompt = AI_MODE_PROMPTS[this.currentMode] || AI_MODE_PROMPTS.general;
      
      // Build conversation context
      let conversationContext = systemPrompt + "\n\n";
      
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
      return "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.";
    }
  }

  async analyzeImage(imageFile: File, prompt: string = "Describe this image"): Promise<string> {
    try {
      const imageData = await this.fileToGenerativePart(imageFile);
      const systemPrompt = AI_MODE_PROMPTS[this.currentMode] || AI_MODE_PROMPTS.general;
      
      const fullPrompt = `${systemPrompt}\n\nUser has shared an image. ${prompt}`;
      
      const result = await this.visionModel.generateContent([fullPrompt, imageData]);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error analyzing image:', error);
      return "I'm having trouble analyzing this image right now. Please try again later.";
    }
  }

  /**
   * Analyze video frames extracted from a video file
   * @param videoFrames Array of image data URLs representing video frames
   * @param prompt Custom prompt for video analysis
   * @returns AI-generated analysis of the video
   */
  async analyzeVideo(videoFrames: string[], prompt: string = "Analyze this video based on these key frames"): Promise<string> {
    try {
      // Convert data URLs to generative parts
      const frameParts = await Promise.all(
        videoFrames.map(async (dataUrl) => {
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          const file = new File([blob], "frame.jpg", { type: "image/jpeg" });
          return this.fileToGenerativePart(file);
        })
      );

      const systemPrompt = AI_MODE_PROMPTS[this.currentMode] || AI_MODE_PROMPTS.general;
      
      const fullPrompt = `${systemPrompt}\n\nUser has shared a video. I'm showing you ${videoFrames.length} key frames from this video. ${prompt}`;
      
      // Combine prompt with frame parts for the API call
      const contentParts = [fullPrompt, ...frameParts];
      
      const result = await this.visionModel.generateContent(contentParts);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error analyzing video:', error);
      return "I'm having trouble analyzing this video right now. Please try again later.";
    }
  }

  /**
   * Analyze audio content (currently a placeholder as Gemini doesn't directly process audio)
   * @param audioFile Audio file to analyze
   * @param transcript Optional transcript of the audio
   * @returns AI-generated analysis of the audio
   */
  async analyzeAudio(audioFile: File, transcript?: string): Promise<string> {
    try {
      const systemPrompt = AI_MODE_PROMPTS[this.currentMode] || AI_MODE_PROMPTS.general;
      
      let prompt = `${systemPrompt}\n\nUser has shared an audio file named "${audioFile.name}".`;
      
      if (transcript) {
        prompt += ` The transcript of the audio is: "${transcript}". Please analyze this audio content based on the transcript.`;
      } else {
        prompt += ` I don't have a transcript of this audio. Please provide a general response about audio processing and how you might help with audio content in the current mode.`;
      }
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error analyzing audio:', error);
      return "I'm having trouble analyzing this audio right now. Please try again later.";
    }
  }

  /**
   * Process multiple media inputs together
   * @param mediaContents Array of media contents (text, images, etc.)
   * @param prompt Additional prompt text
   * @returns AI-generated response to the multimodal input
   */
  async processMultiModalInput(mediaContents: MediaContent[], prompt: string = ""): Promise<string> {
    try {
      const systemPrompt = AI_MODE_PROMPTS[this.currentMode] || AI_MODE_PROMPTS.general;
      
      // Start with system prompt
      let contentParts: any[] = [`${systemPrompt}\n\nUser has shared multiple types of content. ${prompt}`];
      
      // Process each media content
      for (const media of mediaContents) {
        switch (media.type) {
          case 'text':
            // Add text directly
            contentParts.push(media.content as string);
            break;
            
          case 'image':
            // Convert image file to generative part
            const imageData = await this.fileToGenerativePart(media.content as File);
            contentParts.push(imageData);
            break;
            
          case 'video':
          case 'audio':
            // For video and audio, we add a description since they can't be directly processed
            if (media.description) {
              contentParts.push(`[${media.type.toUpperCase()} DESCRIPTION: ${media.description}]`);
            }
            break;
        }
      }
      
      // Use vision model for multimodal content
      const result = await this.visionModel.generateContent(contentParts);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error processing multimodal input:', error);
      return "I'm having trouble processing these different types of content right now. Please try again later.";
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