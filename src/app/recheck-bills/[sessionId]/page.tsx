"use client";

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
      localStorage.setItem(`easyVat_${sessionId}_returnFromRecheck`, 'true');
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (sessionBills.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">No bills found to review.</p>
          <button
            onClick={() => router.push('/create-invoice')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create New Session
          </button>
        </div>
      </div>
    );
  }

  const currentBill = editedBills[currentIndex];
  if (!currentBill) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">Error loading bill data.</p>
          <button
            onClick={() => router.push('/create-invoice')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create New Session
          </button>
        </div>
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

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md h-full flex flex-col">
          <div className="p-4 flex-grow">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold">Review Bills ({currentIndex + 1}/{sessionBills.length})</h1>
              <button
                onClick={() => router.push('/create-invoice')}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Start Over
              </button>
            </div>

            <div className="flex flex-row gap-6">
              {/* Image preview - left side */}
              <div className="bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center relative w-1/2">
                {imageSrc ? (
                  <img 
                    src={imageSrc} 
                    alt={`Bill ${currentIndex + 1}`} 
                    className="max-w-full max-h-[500px] object-contain" 
                  />
                ) : (
                  <div className="p-4 text-gray-500">
                    <p>Image not available</p>
                  </div>
                )}
              </div>
              
              {/* Form - right side */}
              <div className="bg-white rounded-lg w-1/2">
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
                          value={rate}
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
                          value={volume}
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
                          value={amount}
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
                          {needsReview && (
                            <span className="ml-2 text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded">
                              Needs Review
                            </span>
                          )}
                        </label>
                        <input
                          type="text"
                          value={date}
                          onChange={(e) => handleFieldChange('date', e.target.value)}
                          placeholder="DD-MM-YY"
                          className={`w-full p-2 border rounded-md ${fieldErrors.date ? 'border-red-500' : needsReview ? 'border-amber-300 bg-amber-50' : 'border-gray-300'}`}
                        />
                        {fieldErrors.date && (
                          <p className="mt-1 text-sm text-red-600">{fieldErrors.date}</p>
                        )}
                        {needsReview && !fieldErrors.date && (
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
                          value={fuelType}
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
                  
                  {/* Navigation controls */}
                  <div className="mt-6 flex justify-center items-center space-x-4">
                    <button
                      onClick={goToPrevious}
                      disabled={currentIndex === 0}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Previous
                    </button>
                    
                    <span className="text-gray-600">
                      {currentIndex + 1} / {sessionBills.length}
                    </span>
                    
                    <button
                      onClick={goToNext}
                      disabled={currentIndex === sessionBills.length - 1}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 flex items-center"
                    >
                      Next
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="mt-6 flex space-x-3 pt-4 border-t">
                    <button
                      onClick={handleBack}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      Back
                    </button>
                    
                    <Button
                      onClick={openDeleteConfirmation}
                      variant="destructive"
                      className="px-4 py-2"
                    >
                      Delete Bill
                    </Button>
                    
                    <div className="flex-grow"></div>
                    
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent>
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
            <DialogFooter>
              <Button variant="outline" onClick={cancelDelete}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteBill}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
} 