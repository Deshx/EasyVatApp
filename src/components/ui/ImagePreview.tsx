import { useState, useEffect } from 'react';

interface ImagePreviewProps {
  imageSrc: string;
  onRetake: () => void;
  onNext: () => void;
}

export default function ImagePreview({ imageSrc, onRetake, onNext }: ImagePreviewProps) {
  const [extractedText, setExtractedText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function extractTextFromImage() {
      try {
        setLoading(true);
        setError(null);
        
        console.log("Sending image to OCR API...");
        // Call our dedicated API endpoint for image OCR
        const response = await fetch('/api/openai/image-ocr', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            base64Image: imageSrc,
            prompt: 'Extract the text'
          }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to extract text from image');
        }

        console.log("OCR response received successfully");
        setExtractedText(data.text || '');
        
      } catch (err: any) {
        console.error('Error extracting text:', err);
        setError(`Failed to extract text from image: ${err.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    }

    if (imageSrc) {
      extractTextFromImage();
    }
  }, [imageSrc]);

  return (
    <div className="bg-white rounded-lg shadow-md h-full flex flex-col">
      <div className="p-4 flex-grow flex flex-col">
        <h2 className="text-xl font-semibold mb-4">Review Bill</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow">
          {/* Image preview on left */}
          <div className="bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
            <img 
              src={imageSrc} 
              alt="Captured bill" 
              className="max-w-full max-h-[300px] md:max-h-[400px] object-contain" 
            />
          </div>
          
          {/* Extracted text on right */}
          <div className="border border-gray-200 rounded-lg p-4 flex flex-col">
            <h3 className="text-lg font-medium mb-2">Extracted Text</h3>
            
            <div className="flex-grow overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  <span className="ml-2">Processing...</span>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-400 text-red-700 p-3 rounded-lg">
                  {error}
                </div>
              ) : (
                <div className="h-full overflow-y-auto whitespace-pre-wrap text-sm">
                  {extractedText || "No text was extracted from the image."}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex justify-between mt-6">
          <button
            onClick={onRetake}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none w-full max-w-[160px]"
          >
            Retake
          </button>
          
          <button
            onClick={onNext}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none w-full max-w-[160px]"
            disabled={loading}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
} 