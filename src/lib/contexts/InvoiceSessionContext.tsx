"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// Define types for the extracted data
export interface ExtractedBillData {
  id: string;
  imageSrc: string;
  rate: string;
  volume: string;
  amount: string;
  date: string;
  needsReview?: boolean;
  fuelType?: string;
  fuelTypeName?: string;
}

export interface BillData {
  imageSrc: string;
  extractedData: {
    rate: string;
    volume: string;
    amount: string;
    date: string;
    needsReview?: boolean;
    fuelType?: string;
    fuelTypeName?: string;
    productText?: string;
    confidence?: 'high' | 'medium' | 'low' | 'flagged';
    resolutionMethod?: 'price-date-match' | 'product-text-match' | 'manual-review';
  };
}

// Define context type
interface InvoiceSessionContextType {
  sessionBills: BillData[];
  addBill: (bill: BillData) => void;
  removeBill: (index: number) => void;
  clearSession: () => void;
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  recheckModeActive: boolean;
  setRecheckModeActive: (active: boolean) => void;
  refreshFromLocalStorage: () => void;
  sessionId: string;
}

// Create context
const InvoiceSessionContext = createContext<InvoiceSessionContextType | undefined>(undefined);

// Provider component
export function InvoiceSessionProvider({ 
  children, 
  sessionId 
}: { 
  children: ReactNode;
  sessionId: string;
}) {
  const [sessionBills, setSessionBills] = useState<BillData[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [recheckModeActive, setRecheckModeActive] = useState<boolean>(false);

  // Generate namespaced localStorage keys using sessionId
  const getStorageKey = (key: string) => `easyVat_${sessionId}_${key}`;
  const STORAGE_KEY_BILLS = getStorageKey('sessionBills');
  const STORAGE_KEY_INDEX = getStorageKey('currentIndex');

  // Function to refresh data from localStorage
  const refreshFromLocalStorage = () => {
    if (typeof window !== 'undefined') {
      try {
        console.log(`Refreshing session bills from localStorage for session: ${sessionId}`);
        // Load session bills
        const storedBills = localStorage.getItem(STORAGE_KEY_BILLS);
        if (storedBills) {
          const parsedBills = JSON.parse(storedBills);
          console.log('Loaded bills from localStorage:', parsedBills);
          setSessionBills(parsedBills);
        }
        
        // Load current index
        const storedIndex = localStorage.getItem(STORAGE_KEY_INDEX);
        if (storedIndex) {
          setCurrentIndex(parseInt(storedIndex, 10));
        }
      } catch (error) {
        console.error('Error refreshing invoice session from localStorage:', error);
      }
    }
  };

  // Load data from localStorage on component mount or sessionId change
  useEffect(() => {
    refreshFromLocalStorage();
  }, [sessionId]);

  const addBill = (bill: BillData) => {
    console.log("Adding bill with fuel type name:", bill.extractedData.fuelTypeName);
    const updatedBills = [...sessionBills, bill];
    setSessionBills(updatedBills);
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(updatedBills));
    }
  };

  const removeBill = (index: number) => {
    const updatedBills = sessionBills.filter((_, i) => i !== index);
    setSessionBills(updatedBills);
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_BILLS, JSON.stringify(updatedBills));
    }
  };

  const clearSession = () => {
    setSessionBills([]);
    setCurrentIndex(0);
    
    // Clear from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_BILLS);
      localStorage.removeItem(STORAGE_KEY_INDEX);
    }
  };

  // Update index in localStorage whenever it changes
  const updateCurrentIndex = (index: number) => {
    setCurrentIndex(index);
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_INDEX, index.toString());
    }
  };

  return (
    <InvoiceSessionContext.Provider
      value={{
        sessionBills,
        addBill,
        removeBill,
        clearSession,
        currentIndex,
        setCurrentIndex: updateCurrentIndex,
        recheckModeActive,
        setRecheckModeActive,
        refreshFromLocalStorage,
        sessionId
      }}
    >
      {children}
    </InvoiceSessionContext.Provider>
  );
}

// Custom hook to use the context
export function useInvoiceSession() {
  const context = useContext(InvoiceSessionContext);
  if (context === undefined) {
    throw new Error('useInvoiceSession must be used within an InvoiceSessionProvider');
  }
  return context;
} 