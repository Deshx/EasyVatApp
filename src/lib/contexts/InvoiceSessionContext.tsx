"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// Define types for the extracted data
export interface ExtractedBillData {
  id: string;
  imageSrc: string;
  rate: string;
  volume: string;
  amount: string;
  fuelType?: string;
  fuelTypeName?: string;
}

export interface BillData {
  imageSrc: string;
  extractedData: {
    rate: string;
    volume: string;
    amount: string;
    fuelType?: string;
    fuelTypeName?: string;
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
}

// Create context
const InvoiceSessionContext = createContext<InvoiceSessionContextType | undefined>(undefined);

// localStorage keys
const STORAGE_KEY_BILLS = 'easyVat_sessionBills';
const STORAGE_KEY_INDEX = 'easyVat_currentIndex';

// Provider component
export function InvoiceSessionProvider({ children }: { children: ReactNode }) {
  const [sessionBills, setSessionBills] = useState<BillData[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Load data from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // Load session bills
        const storedBills = localStorage.getItem(STORAGE_KEY_BILLS);
        if (storedBills) {
          setSessionBills(JSON.parse(storedBills));
        }
        
        // Load current index
        const storedIndex = localStorage.getItem(STORAGE_KEY_INDEX);
        if (storedIndex) {
          setCurrentIndex(parseInt(storedIndex, 10));
        }
      } catch (error) {
        console.error('Error loading invoice session from localStorage:', error);
      }
    }
  }, []);

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
        setCurrentIndex: updateCurrentIndex
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