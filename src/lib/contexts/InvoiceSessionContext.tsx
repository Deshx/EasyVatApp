"use client";

import { createContext, useContext, useState, ReactNode } from 'react';

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

// Provider component
export function InvoiceSessionProvider({ children }: { children: ReactNode }) {
  const [sessionBills, setSessionBills] = useState<BillData[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const addBill = (bill: BillData) => {
    console.log("Adding bill with fuel type name:", bill.extractedData.fuelTypeName);
    setSessionBills((prev) => [...prev, bill]);
  };

  const removeBill = (index: number) => {
    setSessionBills((prev) => prev.filter((_, i) => i !== index));
  };

  const clearSession = () => {
    setSessionBills([]);
    setCurrentIndex(0);
  };

  return (
    <InvoiceSessionContext.Provider
      value={{
        sessionBills,
        addBill,
        removeBill,
        clearSession,
        currentIndex,
        setCurrentIndex
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