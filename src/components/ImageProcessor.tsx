import React, { useState } from 'react';
import { Image, Eye, Zap, Download, Palette, Type } from 'lucide-react';
import { imageProcessingService, ImageProcessingResult } from '../services/imageProcessingService';

interface ImageProcessorProps {
  file: File;
  onAnalysisComplete: (analysis: string) => void;
}

export const ImageProcessor: React.FC<ImageProcessorProps> = ({ file, onAnalysisComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ImageProcessingResult | null>(null);
  const [activeTab, setActiveTab] = useState<'analysis' | 'enhancement' | 'text'>('analysis');

  const processImage = async () => {
    setIsProcessing(true);
    try {
      const processingResult = await imageProcessingService.processImage(file);
      setResult(processingResult);
      
      // Send analysis to chat
      const analysisText = `
Image Analysis Complete:

${processingResult.analysis.description}

Key Details:
• Objects detected: ${processingResult.analysis.objects.join(', ')}
• Dominant colors: ${processingResult.analysis.colors.join(', ')}
• Overall mood: ${processingResult.analysis.mood}
• File size: ${processingResult.metadata.size}
• Dimensions: ${processingResult.metadata.dimensions}

Suggestions:
${processingResult.analysis.suggestions.map(s => `• ${s}`).join('\n')}

Enhancement Recommendations:
${processingResult.enhancementSuggestions.map(s => `• ${s}`).join('\n')}
      `;
      
      onAnalysisComplete(analysisText);
    } catch (error) {
      onAnalysisComplete('Failed to process image. Please try again with a different image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const extractText = async () => {
    setIsProcessing(true);
    try {
      const extractedText = await imageProcessingService.extractTextFromImage(file);
      onAnalysisComplete(`Text extracted from image:\n\n${extractedText}`);
    } catch (error) {
      onAnalysisComplete('Failed to extract text from image. Please ensure the image contains readable text.');
    } finally {
      setIsProcessing(false);
    }
  };

  const enhanceImage = async (enhancement: string) => {
    setIsProcessing(true);
    try {
      const enhancedUrl = await imageProcessingService.enhanceImage(file, enhancement);
      onAnalysisComplete(`Image enhanced with ${enhancement}. Enhanced version ready for download.`);
    } catch (error) {
      onAnalysisComplete('Failed to enhance image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 mt-4">
      <div className="flex items-center space-x-2 mb-4">
        <Image className="w-5 h-5 text-pink-400" />
        <h3 className="text-white font-medium">Image Processing</h3>
      </div>

      {/* Image Preview */}
      <div className="mb-4">
        <img 
          src={URL.createObjectURL(file)} 
          alt="Uploaded image" 
          className="w-full max-w-sm h-32 object-cover rounded-lg"
        />
        <p className="text-xs text-gray-400 mt-1">
          {file.name} • {(file.size / 1024 / 1024).toFixed(2)} MB
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-4 bg-gray-700 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('analysis')}
          className={`flex-1 flex items-center justify-center space-x-1 p-2 rounded text-xs transition-colors ${
            activeTab === 'analysis' ? 'bg-pink-500 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Eye className="w-3 h-3" />
          <span>Analyze</span>
        </button>
        <button
          onClick={() => setActiveTab('enhancement')}
          className={`flex-1 flex items-center justify-center space-x-1 p-2 rounded text-xs transition-colors ${
            activeTab === 'enhancement' ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Zap className="w-3 h-3" />
          <span>Enhance</span>
        </button>
        <button
          onClick={() => setActiveTab('text')}
          className={`flex-1 flex items-center justify-center space-x-1 p-2 rounded text-xs transition-colors ${
            activeTab === 'text' ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white'
          }`}
        >
          <Type className="w-3 h-3" />
          <span>Extract Text</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-2">
        {activeTab === 'analysis' && (
          <div className="space-y-2">
            <button
              onClick={processImage}
              disabled={isProcessing}
              className="w-full p-2 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-600 text-white rounded text-sm transition-colors"
            >
              {isProcessing ? 'Analyzing...' : 'Analyze Image'}
            </button>
            
            {result && (
              <div className="text-xs text-gray-300 space-y-1">
                <p><strong>Objects:</strong> {result.analysis.objects.join(', ')}</p>
                <p><strong>Colors:</strong> {result.analysis.colors.join(', ')}</p>
                <p><strong>Mood:</strong> {result.analysis.mood}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'enhancement' && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => enhanceImage('brightness')}
              disabled={isProcessing}
              className="p-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 text-white rounded text-xs transition-colors"
            >
              Brighten
            </button>
            <button
              onClick={() => enhanceImage('contrast')}
              disabled={isProcessing}
              className="p-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 text-white rounded text-xs transition-colors"
            >
              Contrast
            </button>
            <button
              onClick={() => enhanceImage('saturation')}
              disabled={isProcessing}
              className="p-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 text-white rounded text-xs transition-colors"
            >
              Saturate
            </button>
            <button
              onClick={() => enhanceImage('sharpen')}
              disabled={isProcessing}
              className="p-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 text-white rounded text-xs transition-colors"
            >
              Sharpen
            </button>
          </div>
        )}

        {activeTab === 'text' && (
          <button
            onClick={extractText}
            disabled={isProcessing}
            className="w-full p-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-white rounded text-sm transition-colors"
          >
            {isProcessing ? 'Extracting...' : 'Extract Text (OCR)'}
          </button>
        )}
      </div>

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="flex items-center justify-center space-x-2 mt-3 text-xs text-gray-400">
          <div className="w-3 h-3 border-2 border-pink-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Processing image...</span>
        </div>
      )}
    </div>
  );
};