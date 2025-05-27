"use client";

// Force recompilation - mobile-first design
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter, useParams } from "next/navigation";
import { BillData } from "@/lib/contexts/InvoiceSessionContext";
import { useFuelPrices } from "@/lib/contexts/FuelPricesContext";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogFooter, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Save, 
  ArrowLeft, 
  RotateCcw,
  Fuel,
  Calendar,
  DollarSign,
  Gauge,
  AlertTriangle
} from "lucide-react";

export default function RecheckBills() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;
  const { fuelPrices } = useFuelPrices();
  const [sessionBills, setSessionBills] = useState<BillData[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [editedBills, setEditedBills] = useState<BillData[]>([]);
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // Generate namespaced localStorage keys using sessionId
  const getStorageKey = (key: string) => `easyVat_${sessionId}_${key}`;
  const STORAGE_KEY_BILLS = getStorageKey('sessionBills');
  const STORAGE_KEY_INDEX = getStorageKey('currentIndex');

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    // Validate sessionId is a valid UUID format
    if (sessionId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
      // Invalid sessionId format, redirect to create new session
      router.replace("/create-invoice");
      return;
    }

    // Load bills from localStorage using session-specific keys
    if (typeof window !== 'undefined' && sessionId) {
      try {
        const storedBills = localStorage.getItem(STORAGE_KEY_BILLS);
        if (storedBills) {
          const bills = JSON.parse(storedBills);
          setSessionBills(bills);
          setEditedBills([...bills]);
        } else {
          // No bills found for this session, redirect back
          router.push(`/create-invoice/${sessionId}`);
        }
      } catch (error) {
        console.error('Error loading bills from localStorage:', error);
        router.push(`/create-invoice/${sessionId}`);
      }
    }
  }, [user, loading, router, sessionId]);

  // Function to validate field values
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

  // Function to handle editing data for the current bill
  const handleFieldChange = (field: keyof BillData['extractedData'], value: string) => {
    const error = validateField(field, value);
    
    setFieldErrors(prev => ({
      ...prev,
      [field]: error || ''
    }));
    
    setEditedBills(prev => {
      const newBills = [...prev];
      if (newBills[currentIndex]) {
        newBills[currentIndex] = {
          ...newBills[currentIndex],
          extractedData: {
            ...newBills[currentIndex].extractedData,
            [field]: value
          }
        };
      }
      return newBills;
    });
  };

  // Function to handle fuel type selection
  const handleFuelTypeChange = (fuelTypeId: string) => {
    const selectedFuelType = fuelPrices.find(f => f.id === fuelTypeId);
    
    if (selectedFuelType) {
      setEditedBills(prev => {
        const newBills = [...prev];
        if (newBills[currentIndex]) {
          newBills[currentIndex] = {
            ...newBills[currentIndex],
            extractedData: {
              ...newBills[currentIndex].extractedData,
              fuelType: fuelTypeId,
              fuelTypeName: `${selectedFuelType.name} (Rs. ${selectedFuelType.price}/L)`
            }
          };
        }
        return newBills;
      });
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < sessionBills.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSave = () => {
    // Save changes to localStorage using session-specific key
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(editedBills));
      // Set a flag to indicate we're returning from recheck mode
      localStorage.setItem(`easyVat_session_returnFromRecheck`, 'true');
    }
    // Navigate back to invoice creation for this session
    router.push(`/create-invoice/${sessionId}`);
  };

  const handleBack = () => {
    // Navigate back without saving changes
    router.push(`/create-invoice/${sessionId}`);
  };

  // Function to handle deleting the current bill
  const handleDeleteBill = () => {
    if (editedBills.length <= 1) {
      // If this is the last bill, redirect to create invoice
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY_BILLS);
        localStorage.removeItem(STORAGE_KEY_INDEX);
      }
      router.push(`/create-invoice/${sessionId}`);
      return;
    }

    // Remove the bill at current index
    const newBills = editedBills.filter((_, index) => index !== currentIndex);
    
    // Update states
    setEditedBills(newBills);
    setSessionBills(newBills);
    
    // Adjust current index if necessary
    let newIndex = currentIndex;
    if (currentIndex >= newBills.length) {
      newIndex = newBills.length - 1;
    }
    setCurrentIndex(newIndex);
    
    // Update localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(newBills));
      localStorage.setItem(STORAGE_KEY_INDEX, newIndex.toString());
    }
    
    // Close the confirmation dialog
    setShowDeleteConfirm(false);
  };

  // Function to open delete confirmation
  const openDeleteConfirmation = () => {
    setShowDeleteConfirm(true);
  };

  // Function to cancel delete
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (sessionBills.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="text-center max-w-md w-full">
          <CardContent className="pt-6">
            <p className="mb-4 text-gray-600">No bills found to review.</p>
            <Button
              onClick={() => router.push('/create-invoice')}
              className="w-full"
            >
              Create New Session
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentBill = editedBills[currentIndex];
  if (!currentBill) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="text-center max-w-md w-full">
          <CardContent className="pt-6">
            <p className="mb-4 text-gray-600">Error loading bill data.</p>
            <Button
              onClick={() => router.push('/create-invoice')}
              className="w-full"
            >
              Create New Session
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rate = currentBill?.extractedData?.rate || '';
  const volume = currentBill?.extractedData?.volume || '';
  const amount = currentBill?.extractedData?.amount || '';
  const date = currentBill?.extractedData?.date || '';
  const needsReview = currentBill?.extractedData?.needsReview || false;
  const fuelType = currentBill?.extractedData?.fuelType || '';
  const imageSrc = currentBill?.imageSrc || '';
  const confidence = currentBill?.extractedData?.confidence || 'medium';

  // Get confidence badge variant
  const getConfidenceBadgeVariant = (conf: string) => {
    switch (conf) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      case 'flagged': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleBack}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 text-center">
            <h1 className="text-lg font-semibold text-gray-900">Review Bill</h1>
            <p className="text-sm text-gray-500">{currentIndex + 1} of {sessionBills.length}</p>
          </div>

          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => router.push('/create-invoice')}
            className="h-10 w-10"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 h-1">
          <div 
            className="bg-blue-500 h-1 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / sessionBills.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="p-3 pb-20">
        {/* Receipt Image Section - Very Compact */}
        <div className="mb-2">
          {/* Confidence Badge */}
          <div className="flex justify-center mb-1">
            <Badge 
              variant={getConfidenceBadgeVariant(confidence)}
              className="text-xs font-medium"
            >
              ✓ {confidence.toUpperCase()}
            </Badge>
          </div>

          {/* Receipt Image - Very Small */}
          <div className="bg-gray-100 rounded overflow-hidden flex items-center justify-center relative h-20 mx-8">
            {imageSrc ? (
              <img 
                src={imageSrc} 
                alt={`Bill ${currentIndex + 1}`} 
                className="max-w-full max-h-full object-contain" 
              />
            ) : (
              <div className="text-gray-500 text-center text-xs">
                <p>Image not available</p>
              </div>
            )}
          </div>
        </div>

        {/* Form Fields Section - Optimized Spacing */}
        <div className="space-y-2">
          {/* Rate and Volume - Grid Row */}
          <div className="grid grid-cols-2 gap-2">
            {/* Rate Field */}
            <div className="bg-white rounded p-2 border">
              <label className="block text-xs font-medium text-gray-700 mb-1">Rate (Rs/L)</label>
              <input
                type="text"
                value={rate}
                onChange={(e) => handleFieldChange('rate', e.target.value)}
                className={`w-full p-2 text-sm border rounded ${
                  fieldErrors.rate ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {fieldErrors.rate && <p className="mt-1 text-xs text-red-600">{fieldErrors.rate}</p>}
            </div>
            
            {/* Volume Field */}
            <div className="bg-white rounded p-2 border">
              <label className="block text-xs font-medium text-gray-700 mb-1">Volume (L)</label>
              <input
                type="text"
                value={volume}
                onChange={(e) => handleFieldChange('volume', e.target.value)}
                className={`w-full p-2 text-sm border rounded ${
                  fieldErrors.volume ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {fieldErrors.volume && <p className="mt-1 text-xs text-red-600">{fieldErrors.volume}</p>}
            </div>
          </div>
          
          {/* Amount Field */}
          <div className="bg-white rounded p-2 border">
            <label className="block text-xs font-medium text-gray-700 mb-1">Amount (Rs)</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => handleFieldChange('amount', e.target.value)}
              className={`w-full p-2 text-sm border rounded ${
                fieldErrors.amount ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="0.00"
            />
            {fieldErrors.amount && <p className="mt-1 text-xs text-red-600">{fieldErrors.amount}</p>}
          </div>
          
          {/* Date Field */}
          <div className="bg-white rounded p-2 border">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Date (DD-MM-YY)
              {needsReview && (
                <span className="ml-1 text-xs text-amber-600 bg-amber-100 px-1 py-0.5 rounded">
                  Needs Review
                </span>
              )}
            </label>
            <input
              type="text"
              value={date}
              onChange={(e) => handleFieldChange('date', e.target.value)}
              placeholder="DD-MM-YY"
              className={`w-full p-2 text-sm border rounded ${
                fieldErrors.date ? 'border-red-500' : 
                needsReview ? 'border-amber-300 bg-amber-50' : 'border-gray-300'
              }`}
            />
            {fieldErrors.date && <p className="mt-1 text-xs text-red-600">{fieldErrors.date}</p>}
            {needsReview && !fieldErrors.date && (
              <p className="mt-1 text-xs text-amber-600">Date could not be parsed from receipt. Please verify.</p>
            )}
          </div>

          {/* Fuel Type Field */}
          <div className="bg-white rounded p-2 border">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Fuel Type
              {confidence === 'flagged' && (
                <span className="ml-1 text-xs text-red-600 bg-red-100 px-1 py-0.5 rounded">
                  Manual Selection Required
                </span>
              )}
            </label>
            <select
              value={fuelType}
              onChange={(e) => handleFuelTypeChange(e.target.value)}
              className={`w-full p-2 text-sm border rounded bg-white ${
                confidence === 'flagged' ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            >
              <option value="">Select fuel type</option>
              {fuelPrices.map((fuel) => (
                <option key={fuel.id} value={fuel.id}>
                  {fuel.name} (Rs. {fuel.price}/L)
                </option>
              ))}
            </select>
            {fuelType && (
              <p className="mt-1 text-xs text-green-600">
                Selected: {currentBill?.extractedData?.fuelTypeName || fuelPrices.find(f => f.id === fuelType)?.name}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Navigation - Icon Buttons Row */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3">
        {/* Page Counter */}
        <div className="flex justify-center mb-3">
          <span className="px-3 py-1 bg-gray-100 rounded text-xs font-medium">
            {currentIndex + 1} / {sessionBills.length}
          </span>
        </div>

        <div className="flex justify-center items-center gap-6">
          {/* Previous - Back Icon */}
          <button
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            className={`w-12 h-12 border border-gray-300 rounded-full flex items-center justify-center transition-colors ${
              currentIndex === 0 
                ? 'bg-gray-50 text-gray-300 cursor-not-allowed' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title="Previous"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          {/* Complete - Check Icon */}
          <button
            onClick={handleSave}
            className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors"
            title="Complete"
          >
            <Save className="w-5 h-5 text-white" />
          </button>
          
          {/* Next/Delete - Forward/Trash Icon */}
          {currentIndex === sessionBills.length - 1 ? (
            <button
              onClick={openDeleteConfirmation}
              className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
              title="Delete Bill"
            >
              <Trash2 className="w-5 h-5 text-white" />
            </button>
          ) : (
            <button
              onClick={goToNext}
              className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
              title="Next Bill"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle>Delete Bill</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this bill? This action cannot be undone.
              {editedBills.length <= 1 && (
                <span className="block mt-2 text-amber-600 font-medium">
                  This is the last bill. Deleting it will redirect you back to create a new invoice.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={cancelDelete} className="flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteBill} className="flex-1">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
} 