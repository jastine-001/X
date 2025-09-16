export interface ImageAnalysis {
  description: string;
  objects: string[];
  colors: string[];
  mood: string;
  suggestions: string[];
}

export interface ImageProcessingResult {
  analysis: ImageAnalysis;
  enhancementSuggestions: string[];
  metadata: {
    size: string;
    format: string;
    dimensions?: string;
  };
}

export class ImageProcessingService {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  async processImage(file: File): Promise<ImageProcessingResult> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        try {
          // Set canvas dimensions
          this.canvas.width = img.width;
          this.canvas.height = img.height;
          
          // Draw image on canvas
          this.ctx.drawImage(img, 0, 0);
          
          // Analyze image
          const analysis = this.analyzeImageData(img);
          const enhancementSuggestions = this.generateEnhancementSuggestions(analysis);
          
          const result: ImageProcessingResult = {
            analysis,
            enhancementSuggestions,
            metadata: {
              size: this.formatFileSize(file.size),
              format: file.type,
              dimensions: `${img.width}x${img.height}`
            }
          };

          URL.revokeObjectURL(url);
          resolve(result);
        } catch (error) {
          URL.revokeObjectURL(url);
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  private analyzeImageData(img: HTMLImageElement): ImageAnalysis {
    // Get image data for color analysis
    const imageData = this.ctx.getImageData(0, 0, img.width, img.height);
    const data = imageData.data;
    
    // Analyze dominant colors
    const colorMap = new Map<string, number>();
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const alpha = data[i + 3];
      
      if (alpha > 128) { // Only count non-transparent pixels
        const color = this.rgbToColorName(r, g, b);
        colorMap.set(color, (colorMap.get(color) || 0) + 1);
      }
    }

    // Get top 3 colors
    const sortedColors = Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([color]) => color);

    // Determine mood based on colors and brightness
    const mood = this.determineMood(sortedColors, this.calculateBrightness(data));

    // Generate basic object detection (simplified)
    const objects = this.detectBasicObjects(img.width, img.height, sortedColors);

    return {
      description: this.generateDescription(objects, sortedColors, mood),
      objects,
      colors: sortedColors,
      mood,
      suggestions: this.generateSuggestions(objects, sortedColors, mood)
    };
  }

  private rgbToColorName(r: number, g: number, b: number): string {
    // Simplified color naming
    const brightness = (r + g + b) / 3;
    
    if (brightness < 50) return 'Black';
    if (brightness > 200) return 'White';
    
    if (r > g && r > b) {
      if (r > 150) return 'Red';
      return 'Dark Red';
    }
    if (g > r && g > b) {
      if (g > 150) return 'Green';
      return 'Dark Green';
    }
    if (b > r && b > g) {
      if (b > 150) return 'Blue';
      return 'Dark Blue';
    }
    if (r > 100 && g > 100 && b < 100) return 'Yellow';
    if (r > 100 && b > 100 && g < 100) return 'Purple';
    if (g > 100 && b > 100 && r < 100) return 'Cyan';
    
    return 'Gray';
  }

  private calculateBrightness(data: Uint8ClampedArray): number {
    let totalBrightness = 0;
    let pixelCount = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha > 128) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        totalBrightness += brightness;
        pixelCount++;
      }
    }
    
    return pixelCount > 0 ? totalBrightness / pixelCount : 0;
  }

  private determineMood(colors: string[], brightness: number): string {
    if (brightness > 180) return 'Bright and Cheerful';
    if (brightness < 80) return 'Dark and Moody';
    
    if (colors.includes('Red')) return 'Energetic';
    if (colors.includes('Blue')) return 'Calm and Professional';
    if (colors.includes('Green')) return 'Natural and Fresh';
    if (colors.includes('Purple')) return 'Creative and Luxurious';
    if (colors.includes('Yellow')) return 'Warm and Inviting';
    
    return 'Balanced and Neutral';
  }

  private detectBasicObjects(width: number, height: number, colors: string[]): string[] {
    const objects: string[] = [];
    
    // Basic shape detection based on dimensions
    const aspectRatio = width / height;
    
    if (aspectRatio > 1.5) objects.push('Landscape');
    else if (aspectRatio < 0.7) objects.push('Portrait');
    else objects.push('Square Format');
    
    // Color-based object suggestions
    if (colors.includes('Green')) objects.push('Nature Elements');
    if (colors.includes('Blue')) objects.push('Sky or Water');
    if (colors.includes('Red')) objects.push('Warm Objects');
    if (colors.includes('White') && colors.includes('Black')) objects.push('High Contrast Elements');
    
    return objects;
  }

  private generateDescription(objects: string[], colors: string[], mood: string): string {
    return `This image features ${objects.join(', ').toLowerCase()} with dominant ${colors.join(', ').toLowerCase()} colors, creating a ${mood.toLowerCase()} atmosphere.`;
  }

  private generateSuggestions(objects: string[], colors: string[], mood: string): string[] {
    const suggestions: string[] = [];
    
    if (mood.includes('Dark')) {
      suggestions.push('Consider brightening the image for better visibility');
      suggestions.push('Add warm lighting effects to enhance mood');
    }
    
    if (colors.includes('Red')) {
      suggestions.push('Great for attention-grabbing content');
      suggestions.push('Perfect for energetic or passionate themes');
    }
    
    if (objects.includes('Portrait')) {
      suggestions.push('Ideal for profile pictures or personal branding');
      suggestions.push('Consider cropping for better focus on subject');
    }
    
    if (objects.includes('Landscape')) {
      suggestions.push('Perfect for banner images or backgrounds');
      suggestions.push('Great for showcasing wide scenes or environments');
    }
    
    suggestions.push('Use this image for social media posts');
    suggestions.push('Consider adding text overlay for marketing purposes');
    
    return suggestions;
  }

  private generateEnhancementSuggestions(analysis: ImageAnalysis): string[] {
    const suggestions: string[] = [];
    
    if (analysis.mood.includes('Dark')) {
      suggestions.push('Increase brightness and contrast');
      suggestions.push('Apply warm color grading');
    }
    
    if (analysis.colors.includes('Gray')) {
      suggestions.push('Add color saturation for more vibrant look');
      suggestions.push('Apply selective color enhancement');
    }
    
    suggestions.push('Sharpen details for better clarity');
    suggestions.push('Apply noise reduction if needed');
    suggestions.push('Consider cropping for better composition');
    
    return suggestions;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async extractTextFromImage(file: File): Promise<string> {
    // Simulate OCR functionality
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve('Text extraction from images is available. Upload an image with text to see this feature in action.');
      }, 1000);
    });
  }

  async enhanceImage(file: File, enhancement: string): Promise<string> {
    // Simulate image enhancement
    return new Promise((resolve) => {
      setTimeout(() => {
        const url = URL.createObjectURL(file);
        resolve(url);
      }, 1500);
    });
  }
}

export const imageProcessingService = new ImageProcessingService();