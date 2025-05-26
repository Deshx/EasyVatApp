import { useState, useEffect, useRef } from 'react';
import { useFuelPrices, type FuelPrice } from '@/lib/contexts/FuelPricesContext';

interface ImagePreviewProps {
  imageSrc: string;
  onRetake: () => void;
  onNext: (extractedData: ExtractedData) => void;
  onComplete?: (extractedData: ExtractedData) => void;
}

interface ExtractedData {
  rate: string;
  volume: string;
  amount: string;
  date: string;
  needsReview?: boolean;
  fuelType?: string;
  fuelTypeName?: string;
}

export default function ImagePreview({ imageSrc, onRetake, onNext, onComplete }: ImagePreviewProps) {
  const [extractedText, setExtractedText] = useState<string>('');
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const processingRef = useRef<boolean>(false);
  
  // Use the fuel prices context
  const { fuelPrices, loading: fuelPricesLoading, getFuelTypeByRate } = useFuelPrices();

  useEffect(() => {
    async function processImage() {
      // Prevent duplicate calls in development mode (StrictMode)
      if (processingRef.current) return;
      processingRef.current = true;
      
      try {
        setLoading(true);
        setError(null);
        
        console.log("Sending image to parse-receipt API for direct extraction...");
        
        // Call our consolidated parse-receipt endpoint directly with the image
        const response = await fetch('/api/openai/parse-receipt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            base64Image: imageSrc
          }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to process receipt image');
        }

        console.log("Receipt parsing response received successfully:", data);
        
        // Check if the data has the expected structure
        if (data && data.rate && data.volume && data.price) {
          const extractedData: ExtractedData = {
            rate: data.rate,
            volume: data.volume,
            amount: data.price,
            date: data.date || '',
            needsReview: data.needsReview || false
          };
          
          // Detect fuel type based on rate
          const detectedFuelType = getFuelTypeByRate(data.rate);
          if (detectedFuelType) {
            extractedData.fuelType = detectedFuelType;
            // Add the fuel type name if found
            const fuelType = fuelPrices.find(f => f.id === detectedFuelType);
            if (fuelType) {
              extractedData.fuelTypeName = `${fuelType.name} (Rs. ${fuelType.price}/L)`;
            }
          }
          
          console.log("Final extracted data:", extractedData);
          setExtractedData(extractedData);
        } else {
          throw new Error("Missing required fields in extracted data");
        }
      } catch (err: any) {
        console.error('Error processing receipt:', err);
        setError(`Failed to process receipt: ${err.message || 'Unknown error'}`);
        
        // Last resort fallback - use hardcoded values from example
        const fallbackData: ExtractedData = {
          rate: "274.00",
          volume: "3.65",
          amount: "1000.00",
          date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-'),
          needsReview: true
        };
        
        // Detect fuel type based on fallback rate
        const detectedFuelType = getFuelTypeByRate(fallbackData.rate);
        if (detectedFuelType) {
          fallbackData.fuelType = detectedFuelType;
          // Add the fuel type name if found
          const fuelType = fuelPrices.find(f => f.id === detectedFuelType);
          if (fuelType) {
            fallbackData.fuelTypeName = `${fuelType.name} (Rs. ${fuelType.price}/L)`;
          }
        }
        
        setExtractedData(fallbackData);
      } finally {
        setLoading(false);
      }
    }

    if (imageSrc) {
      processImage();
    }
    
    // Cleanup function
    return () => {
      processingRef.current = false;
    };
  }, [imageSrc, getFuelTypeByRate, fuelPrices]);

  const validateField = (field: string, value: string): string | null => {
    if (!value.trim()) {
      return "This field is required";
    }
    
    // Date validation
    if (field === 'date') {
      const datePattern = /^\d{2}-\d{2}-\d{2}$/;
      if (!datePattern.test(value)) {
        return "Date must be in DD-MM-YY format";
      }
      
      // Validate the actual date
      const [day, month, year] = value.split('-').map(Number);
      const currentYear = new Date().getFullYear();
      const century = Math.floor(currentYear / 100) * 100;
      const fullYear = century + year;
      
      const date = new Date(fullYear, month - 1, day);
      if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== fullYear) {
        return "Invalid date";
      }
      
      return null;
    }
    
    // Number validation for other fields
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return "Must be a valid number";
    }
    
    if (numValue <= 0) {
      return "Value must be greater than zero";
    }
    
    // Additional field-specific validations
    switch(field) {
      case 'rate':
        if (numValue > 10000) {
          return "Rate seems too high";
        }
        break;
      case 'volume':
        if (numValue > 1000) {
          return "Volume seems too high";
        }
        break;
      case 'amount':
        if (numValue > 1000000) {
          return "Amount seems too high";
        }
        break;
    }
    
    return null;
  };

  const handleFieldChange = (field: keyof ExtractedData, value: string) => {
    if (!extractedData) return;
    
    // Validate the field
    const error = validateField(field, value);
    
    // Update field errors
    setFieldErrors(prev => ({
      ...prev,
      [field]: error || ''
    }));
    
    // Update the data
    setExtractedData({
      ...extractedData,
      [field]: value
    });
  };

  const handleFuelTypeChange = (fuelTypeId: string) => {
    if (!extractedData) return;
    
    const selectedFuelType = fuelPrices.find(f => f.id === fuelTypeId);
    
    if (selectedFuelType) {
      setExtractedData({
        ...extractedData,
        fuelType: fuelTypeId,
        fuelTypeName: `${selectedFuelType.name} (Rs. ${selectedFuelType.price}/L)`
      });
    }
  };

  const handleNext = () => {
    if (!extractedData) return;
    
    // Validate all fields
    const errors: {[key: string]: string} = {};
    let hasErrors = false;
    
    Object.entries(extractedData).forEach(([field, value]) => {
      if (field === 'fuelType' || field === 'fuelTypeName' || field === 'needsReview') return; // Skip optional fields
      
      const fieldError = validateField(field, value as string);
      if (fieldError) {
        errors[field] = fieldError;
        hasErrors = true;
      }
    });
    
    // Update errors and proceed if valid
    setFieldErrors(errors);
    
    if (!hasErrors) {
      onNext(extractedData);
    }
  };

  const handleComplete = () => {
    if (!extractedData || !onComplete) return;
    
    // Validate all fields
    const errors: {[key: string]: string} = {};
    let hasErrors = false;
    
    Object.entries(extractedData).forEach(([field, value]) => {
      if (field === 'fuelType' || field === 'fuelTypeName' || field === 'needsReview') return; // Skip optional fields
      
      const fieldError = validateField(field, value as string);
      if (fieldError) {
        errors[field] = fieldError;
        hasErrors = true;
      }
    });
    
    // Update errors and proceed if valid
    setFieldErrors(errors);
    
    if (!hasErrors) {
      onComplete(extractedData);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md h-full flex flex-col">
      <div className="p-4 flex-grow">
        <h2 className="text-xl font-semibold mb-4">Review Bill</h2>
        
        <div className="flex flex-row gap-6">
          {/* Image preview */}
          <div className="bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center relative w-1/2">
            <img 
              src={imageSrc} 
              alt="Captured bill" 
              className="max-w-full max-h-[500px] object-contain" 
            />
            
            {/* Scanning animation overlay */}
            {loading && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Semi-transparent overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-10"></div>
                
                {/* Scanning line */}
                <div className="absolute left-0 right-0 h-1 bg-blue-400 bg-opacity-70 shadow-[0_0_10px_2px_rgba(59,130,246,0.7)] animate-scan">
                  {/* Glow effect */}
                  <div className="absolute inset-0 blur-sm bg-blue-400"></div>
                </div>
                
                {/* Text overlay */}
                <div className="absolute bottom-2 left-0 right-0 text-center text-white text-sm font-medium bg-black bg-opacity-40 py-1">
                  Scanning receipt...
                </div>
              </div>
            )}
          </div>
          
          {/* Extracted data form */}
          <div className="bg-white rounded-lg w-1/2">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="text-gray-500 text-center">
                  <p className="mb-2">Processing receipt...</p>
                  <p className="text-sm">This may take a few seconds</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="text-red-500 text-center mb-4">
                  <p>{error}</p>
                </div>
                <button
                  onClick={onRetake}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Retake Photo
                </button>
              </div>
            ) : extractedData ? (
              <div className="h-full flex flex-col">
                <div className="flex-grow overflow-y-auto">
                  <div className="space-y-4">
                    {/* Rate field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rate (Rs/L):
                      </label>
                      <input
                        type="text"
                        value={extractedData.rate}
                        onChange={(e) => handleFieldChange('rate', e.target.value)}
                        className={`w-full p-2 border rounded-md ${fieldErrors.rate ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {fieldErrors.rate && (
                        <p className="mt-1 text-sm text-red-600">{fieldErrors.rate}</p>
                      )}
                    </div>
                    
                    {/* Volume field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Volume (L):
                      </label>
                      <input
                        type="text"
                        value={extractedData.volume}
                        onChange={(e) => handleFieldChange('volume', e.target.value)}
                        className={`w-full p-2 border rounded-md ${fieldErrors.volume ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {fieldErrors.volume && (
                        <p className="mt-1 text-sm text-red-600">{fieldErrors.volume}</p>
                      )}
                    </div>
                    
                    {/* Amount field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount (Rs):
                      </label>
                      <input
                        type="text"
                        value={extractedData.amount}
                        onChange={(e) => handleFieldChange('amount', e.target.value)}
                        className={`w-full p-2 border rounded-md ${fieldErrors.amount ? 'border-red-500' : 'border-gray-300'}`}
                      />
                      {fieldErrors.amount && (
                        <p className="mt-1 text-sm text-red-600">{fieldErrors.amount}</p>
                      )}
                    </div>
                    
                    {/* Date field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date (DD-MM-YY):
                        {extractedData.needsReview && (
                          <span className="ml-2 text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded">
                            Needs Review
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={extractedData.date}
                        onChange={(e) => handleFieldChange('date', e.target.value)}
                        placeholder="DD-MM-YY"
                        className={`w-full p-2 border rounded-md ${fieldErrors.date ? 'border-red-500' : extractedData.needsReview ? 'border-amber-300 bg-amber-50' : 'border-gray-300'}`}
                      />
                      {fieldErrors.date && (
                        <p className="mt-1 text-sm text-red-600">{fieldErrors.date}</p>
                      )}
                      {extractedData.needsReview && !fieldErrors.date && (
                        <p className="mt-1 text-sm text-amber-600">
                          Date could not be parsed from receipt. Please verify this date is correct.
                        </p>
                      )}
                    </div>
                    
                    {/* Fuel type dropdown */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fuel Type:
                      </label>
                      <select
                        value={extractedData.fuelType || ''}
                        onChange={(e) => handleFuelTypeChange(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md bg-white"
                      >
                        <option value="">Select Fuel Type</option>
                        {fuelPrices.map((fuel) => (
                          <option key={fuel.id} value={fuel.id}>
                            {fuel.name} (Rs. {fuel.price}/L)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 flex space-x-3 pt-2 border-t">
                  <button
                    onClick={onRetake}
                    className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Retake
                  </button>
                  
                  <div className="flex-grow"></div>
                  
                  {onComplete && (
                    <button
                      onClick={handleComplete}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Complete
                    </button>
                  )}
                  
                  <button
                    onClick={handleNext}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Next Bill
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-gray-500">No data extracted</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 