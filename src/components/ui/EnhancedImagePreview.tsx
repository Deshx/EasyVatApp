import { useState, useEffect, useRef } from 'react';
import { useFuelPriceHistory } from '@/lib/contexts/FuelPriceHistoryContext';
import { SlipResolver, SlipData, ResolvedSlip } from '@/lib/services/slipResolver';

interface EnhancedImagePreviewProps {
  imageSrc: string;
  onRetake: () => void;
  onNext: (extractedData: ResolvedSlip) => void;
  onComplete?: (extractedData: ResolvedSlip) => void;
}

export default function EnhancedImagePreview({ 
  imageSrc, 
  onRetake, 
  onNext, 
  onComplete 
}: EnhancedImagePreviewProps) {
  const [extractedData, setExtractedData] = useState<SlipData | null>(null);
  const [resolvedData, setResolvedData] = useState<ResolvedSlip | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [showResolutionDetails, setShowResolutionDetails] = useState<boolean>(false);
  const processingRef = useRef<boolean>(false);
  
  const { priceHistory, loading: historyLoading } = useFuelPriceHistory();

  useEffect(() => {
    async function processImage() {
      if (processingRef.current || historyLoading) return;
      processingRef.current = true;
      
      try {
        setLoading(true);
        setError(null);
        
        console.log("Processing receipt image...");
        
        // Call OCR API to extract data
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

        console.log("OCR extraction completed:", data);
        
        // Create slip data for resolver
        const slipData: SlipData = {
          rate: data.rate || '',
          volume: data.volume || '',
          amount: data.price || '',
          date: data.date || '',
          productText: data.productText || '',
          needsReview: data.needsReview || false
        };
        
        setExtractedData(slipData);
        
        // Use slip resolver to determine fuel type
        if (priceHistory.length > 0) {
          const resolver = new SlipResolver(priceHistory);
          const resolved = resolver.resolveSlip(slipData);
          console.log("Slip resolution completed:", resolved);
          setResolvedData(resolved);
        } else {
          // If no price history, create a basic resolved slip
          const basicResolved: ResolvedSlip = {
            ...slipData,
            confidence: 'flagged',
            resolutionMethod: 'manual-review'
          };
          setResolvedData(basicResolved);
        }
        
      } catch (err: any) {
        console.error('Error processing receipt:', err);
        setError(`Failed to process receipt: ${err.message || 'Unknown error'}`);
        
        // Fallback data
        const fallbackData: SlipData = {
          rate: "341.00",
          volume: "34.61",
          amount: "11802.01",
          date: new Date().toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: '2-digit', 
            year: '2-digit' 
          }).replace(/\//g, '-'),
          needsReview: true
        };
        
        setExtractedData(fallbackData);
        
        const fallbackResolved: ResolvedSlip = {
          ...fallbackData,
          confidence: 'flagged',
          resolutionMethod: 'manual-review'
        };
        setResolvedData(fallbackResolved);
      } finally {
        setLoading(false);
      }
    }

    if (imageSrc && !historyLoading) {
      processImage();
    }
    
    return () => {
      processingRef.current = false;
    };
  }, [imageSrc, priceHistory, historyLoading]);

  const validateField = (field: string, value: string): string | null => {
    if (!value.trim()) {
      return "This field is required";
    }
    
    if (field === 'date') {
      const datePattern = /^\d{2}-\d{2}-\d{2}$/;
      if (!datePattern.test(value)) {
        return "Date must be in DD-MM-YY format";
      }
      
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
    
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return "Must be a valid number";
    }
    
    if (numValue <= 0) {
      return "Value must be greater than zero";
    }
    
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

  const handleFieldChange = (field: keyof SlipData, value: string) => {
    if (!resolvedData) return;
    
    const error = validateField(field, value);
    
    setFieldErrors(prev => ({
      ...prev,
      [field]: error || ''
    }));
    
    const updatedData = {
      ...resolvedData,
      [field]: value
    };
    
    setResolvedData(updatedData);
    setIsEditing(true);
  };

  const handleFuelTypeChange = (fuelTypeId: string) => {
    if (!resolvedData) return;
    
    // Find the selected fuel type from price history
    const selectedEntry = priceHistory.find(entry => entry.id === fuelTypeId);
    
    if (selectedEntry) {
      setResolvedData({
        ...resolvedData,
        fuelType: fuelTypeId,
        fuelTypeName: `${selectedEntry.fuelType} (Rs. ${selectedEntry.price}/L)`,
        confidence: 'medium', // User selection is medium confidence
        resolutionMethod: 'manual-review'
      });
    }
    setIsEditing(true);
  };

  const rerunResolver = async () => {
    if (!extractedData || priceHistory.length === 0) return;
    
    setLoading(true);
    try {
      const resolver = new SlipResolver(priceHistory);
      const resolved = resolver.resolveSlip(extractedData);
      setResolvedData(resolved);
      setIsEditing(false);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (!resolvedData) return;
    
    const errors: {[key: string]: string} = {};
    let hasErrors = false;
    
    ['rate', 'volume', 'amount', 'date'].forEach(field => {
      const fieldError = validateField(field, resolvedData[field as keyof SlipData] as string);
      if (fieldError) {
        errors[field] = fieldError;
        hasErrors = true;
      }
    });
    
    setFieldErrors(errors);
    
    if (!hasErrors) {
      onNext(resolvedData);
    }
  };

  const handleComplete = () => {
    if (!resolvedData || !onComplete) return;
    
    const errors: {[key: string]: string} = {};
    let hasErrors = false;
    
    ['rate', 'volume', 'amount', 'date'].forEach(field => {
      const fieldError = validateField(field, resolvedData[field as keyof SlipData] as string);
      if (fieldError) {
        errors[field] = fieldError;
        hasErrors = true;
      }
    });
    
    setFieldErrors(errors);
    
    if (!hasErrors) {
      onComplete(resolvedData);
    }
  };

  const getConfidenceColor = (confidence: ResolvedSlip['confidence']) => {
    switch (confidence) {
      case 'high': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-orange-600 bg-orange-100';
      case 'flagged': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getConfidenceIcon = (confidence: ResolvedSlip['confidence']) => {
    switch (confidence) {
      case 'high': return '✓';
      case 'medium': return '⚠';
      case 'low': return '⚠';
      case 'flagged': return '⚠';
      default: return '?';
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
                <div className="absolute inset-0 bg-black bg-opacity-10"></div>
                <div className="absolute left-0 right-0 h-1 bg-blue-400 animate-scan">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400 to-transparent"></div>
                  <div className="absolute inset-0 blur-sm bg-blue-400 opacity-60"></div>
                </div>
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
                  <p className="text-sm">Analyzing image and matching fuel types</p>
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
            ) : resolvedData ? (
              <div className="h-full flex flex-col">
                {/* Resolution Status - Hidden behind info button */}
                <div className="mb-4 flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getConfidenceColor(resolvedData.confidence)}`}>
                    {getConfidenceIcon(resolvedData.confidence)} {resolvedData.confidence.toUpperCase()}
                  </span>
                  <button
                    onClick={() => setShowResolutionDetails(!showResolutionDetails)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    info
                  </button>
                </div>

                {/* Collapsible Resolution Details */}
                {showResolutionDetails && (
                  <div className="mb-4 p-3 rounded-lg border bg-gray-50">
                    <p className="text-xs text-gray-600 mb-2">
                      Method: {resolvedData.resolutionMethod.replace('-', ' ')}
                      {resolvedData.matchDetails?.priceMatchAccuracy && (
                        ` • Price match: ${(resolvedData.matchDetails.priceMatchAccuracy * 100).toFixed(0)}%`
                      )}
                      {resolvedData.matchDetails?.dateMatchAccuracy && (
                        ` • Date match: ${(resolvedData.matchDetails.dateMatchAccuracy * 100).toFixed(0)}%`
                      )}
                    </p>
                    {resolvedData.productText && (
                      <div className="mb-2">
                        <span className="text-xs font-medium text-gray-700">Detected Product Text:</span>
                        <div className="text-xs text-gray-600 mt-1">&quot;{resolvedData.productText}&quot;</div>
                      </div>
                    )}
                    {isEditing && (
                      <button
                        onClick={rerunResolver}
                        className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                      >
                        Re-run resolver
                      </button>
                    )}
                  </div>
                )}

                <div className="flex-grow overflow-y-auto">
                  <div className="space-y-4">
                    {/* Rate field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rate (Rs/L):
                      </label>
                      <input
                        type="text"
                        value={resolvedData.rate}
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
                        value={resolvedData.volume}
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
                        value={resolvedData.amount}
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
                        {resolvedData.needsReview && (
                          <span className="ml-2 text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded">
                            Needs Review
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={resolvedData.date}
                        onChange={(e) => handleFieldChange('date', e.target.value)}
                        placeholder="DD-MM-YY"
                        className={`w-full p-2 border rounded-md ${
                          fieldErrors.date 
                            ? 'border-red-500' 
                            : resolvedData.needsReview 
                              ? 'border-amber-300 bg-amber-50' 
                              : 'border-gray-300'
                        }`}
                      />
                      {fieldErrors.date && (
                        <p className="mt-1 text-sm text-red-600">{fieldErrors.date}</p>
                      )}
                      {resolvedData.needsReview && !fieldErrors.date && (
                        <p className="mt-1 text-sm text-amber-600">
                          Date could not be parsed from receipt. Please verify this date is correct.
                        </p>
                      )}
                    </div>
                    
                    {/* Fuel type dropdown */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fuel Type:
                        {resolvedData.confidence === 'flagged' && (
                          <span className="ml-2 text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                            Manual Selection Required
                          </span>
                        )}
                      </label>
                      <select
                        value={resolvedData.fuelType || ''}
                        onChange={(e) => handleFuelTypeChange(e.target.value)}
                        className={`w-full p-2 border rounded-md bg-white ${
                          resolvedData.confidence === 'flagged' ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select Fuel Type</option>
                        {priceHistory
                          .filter(entry => entry.isActive)
                          .map((entry) => (
                            <option key={entry.id} value={entry.id}>
                              {entry.fuelType} (Rs. {entry.price}/L)
                            </option>
                          ))}
                      </select>
                      {resolvedData.fuelTypeName && (
                        <p className="mt-1 text-sm text-gray-600">
                          Selected: {resolvedData.fuelTypeName}
                        </p>
                      )}
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