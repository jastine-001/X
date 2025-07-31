// Camera service for capturing photos directly from the device camera
export class CameraService {
  private videoElement: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  
  /**
   * Initialize the camera and return a video element
   * @returns Promise with HTMLVideoElement
   */
  async initCamera(): Promise<HTMLVideoElement> {
    try {
      // Create video element if it doesn't exist
      if (!this.videoElement) {
        this.videoElement = document.createElement('video');
        this.videoElement.autoplay = true;
        this.videoElement.playsInline = true; // Important for iOS
      }
      
      // Get user media
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      // Set video source
      this.videoElement.srcObject = this.stream;
      
      // Wait for video to be ready
      return new Promise((resolve) => {
        if (this.videoElement) {
          this.videoElement.onloadedmetadata = () => {
            resolve(this.videoElement as HTMLVideoElement);
          };
        }
      });
    } catch (error) {
      console.error('Error initializing camera:', error);
      throw error;
    }
  }
  
  /**
   * Capture a photo from the video stream
   * @returns Promise with captured image as data URL
   */
  async capturePhoto(): Promise<string> {
    if (!this.videoElement || !this.stream) {
      throw new Error('Camera not initialized');
    }
    
    try {
      // Create canvas with video dimensions
      const canvas = document.createElement('canvas');
      canvas.width = this.videoElement.videoWidth;
      canvas.height = this.videoElement.videoHeight;
      
      // Draw video frame to canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
      
      // Get data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      return dataUrl;
    } catch (error) {
      console.error('Error capturing photo:', error);
      throw error;
    }
  }
  
  /**
   * Convert data URL to File object
   * @param dataUrl Data URL of the image
   * @param filename Filename for the created file
   * @returns File object
   */
  dataUrlToFile(dataUrl: string, filename: string = 'camera-capture.jpg'): File {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], filename, { type: mime });
  }
  
  /**
   * Stop the camera stream
   */
  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }
  
  /**
   * Check if the device has a camera
   * @returns Promise<boolean> indicating if camera is available
   */
  async isCameraAvailable(): Promise<boolean> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.some(device => device.kind === 'videoinput');
    } catch (error) {
      console.error('Error checking camera availability:', error);
      return false;
    }
  }
}

export const cameraService = new CameraService();