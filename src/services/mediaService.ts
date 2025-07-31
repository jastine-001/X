// Media processing service for handling video and audio files
export class MediaService {
  /**
   * Extract frames from a video file for analysis
   * @param videoFile The video file to process
   * @param frameCount Number of frames to extract (default: 3)
   * @returns Promise with array of image data URLs
   */
  async extractVideoFrames(videoFile: File, frameCount: number = 3): Promise<string[]> {
    return new Promise((resolve, reject) => {
      try {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const frames: string[] = [];
        
        if (!ctx) {
          reject('Canvas context could not be created');
          return;
        }
        
        // Create object URL for the video
        const videoUrl = URL.createObjectURL(videoFile);
        video.src = videoUrl;
        
        // Set up video element
        video.crossOrigin = 'anonymous';
        video.muted = true;
        
        // When video metadata is loaded, set canvas dimensions
        video.onloadedmetadata = () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Calculate frame positions (beginning, middle, end)
          const duration = video.duration;
          const framePositions = Array.from({ length: frameCount }, (_, i) => 
            (duration / (frameCount + 1)) * (i + 1)
          );
          
          let framesProcessed = 0;
          
          // Process each frame position
          const processNextFrame = (index: number) => {
            if (index >= framePositions.length) {
              // All frames processed
              URL.revokeObjectURL(videoUrl);
              resolve(frames);
              return;
            }
            
            // Seek to the position
            video.currentTime = framePositions[index];
          };
          
          // When the video seeks to a time, capture the frame
          video.onseeked = () => {
            // Draw current frame to canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Get data URL from canvas
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            frames.push(dataUrl);
            
            framesProcessed++;
            
            // Process next frame or resolve if done
            if (framesProcessed < frameCount) {
              processNextFrame(framesProcessed);
            } else {
              URL.revokeObjectURL(videoUrl);
              resolve(frames);
            }
          };
          
          // Start processing the first frame
          processNextFrame(0);
        };
        
        // Handle errors
        video.onerror = () => {
          URL.revokeObjectURL(videoUrl);
          reject('Error loading video');
        };
        
        // Start loading the video
        video.load();
      } catch (error) {
        reject(`Error processing video: ${error}`);
      }
    });
  }
  
  /**
   * Convert audio file to base64 for processing
   * @param audioFile The audio file to process
   * @returns Promise with base64 data
   */
  async audioToBase64(audioFile: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject('Failed to convert audio to base64');
        }
      };
      
      reader.onerror = () => {
        reject('Error reading audio file');
      };
      
      reader.readAsDataURL(audioFile);
    });
  }
  
  /**
   * Get video thumbnail as data URL
   * @param videoFile The video file
   * @returns Promise with thumbnail data URL
   */
  async getVideoThumbnail(videoFile: File): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject('Canvas context could not be created');
          return;
        }
        
        // Create object URL for the video
        const videoUrl = URL.createObjectURL(videoFile);
        video.src = videoUrl;
        
        // Set up video element
        video.crossOrigin = 'anonymous';
        video.muted = true;
        
        // When video metadata is loaded, set canvas dimensions
        video.onloadedmetadata = () => {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Seek to 25% of the video for thumbnail
          video.currentTime = video.duration * 0.25;
        };
        
        // When the video seeks to a time, capture the frame
        video.onseeked = () => {
          // Draw current frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Get data URL from canvas
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          URL.revokeObjectURL(videoUrl);
          resolve(dataUrl);
        };
        
        // Handle errors
        video.onerror = () => {
          URL.revokeObjectURL(videoUrl);
          reject('Error loading video');
        };
        
        // Start loading the video
        video.load();
      } catch (error) {
        reject(`Error creating video thumbnail: ${error}`);
      }
    });
  }
}

export const mediaService = new MediaService();