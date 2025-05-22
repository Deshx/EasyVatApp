"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

// Define the structure of a fuel price
export interface FuelPrice {
  id?: string;
  name: string;
  price: string;
  updatedAt?: string;
}

// Define the context shape
interface FuelPricesContextType {
  fuelPrices: FuelPrice[];
  loading: boolean;
  error: string | null;
  refreshFuelPrices: () => Promise<void>;
  getFuelTypeByRate: (rate: string) => string | undefined;
}

// Create the context with default values
const FuelPricesContext = createContext<FuelPricesContextType>({
  fuelPrices: [],
  loading: true,
  error: null,
  refreshFuelPrices: async () => {},
  getFuelTypeByRate: () => undefined,
});

// localStorage key
const STORAGE_KEY_FUEL_PRICES = 'easyVat_fuelPrices';

// Provider component to wrap around components that need fuel prices data
export function FuelPricesProvider({ children }: { children: React.ReactNode }) {
  const [fuelPrices, setFuelPrices] = useState<FuelPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch fuel prices from Firestore
  const fetchFuelPrices = async () => {
    setLoading(true);
    setError(null);
    try {
      // Try to load from localStorage first
      if (typeof window !== 'undefined') {
        const cachedPrices = localStorage.getItem(STORAGE_KEY_FUEL_PRICES);
        if (cachedPrices) {
          const parsedPrices = JSON.parse(cachedPrices);
          setFuelPrices(parsedPrices);
          setLoading(false);
          return;
        }
      }
      
      // If not in localStorage, fetch from Firestore
      const fuelPricesCollection = collection(db, "fuelPrices");
      const snapshot = await getDocs(fuelPricesCollection);
      
      const prices: FuelPrice[] = [];
      snapshot.forEach(doc => {
        prices.push({ id: doc.id, ...doc.data() } as FuelPrice);
      });
      
      // Save to localStorage for offline use
      if (typeof window !== 'undefined' && prices.length > 0) {
        localStorage.setItem(STORAGE_KEY_FUEL_PRICES, JSON.stringify(prices));
      }
      
      setFuelPrices(prices);
    } catch (err) {
      console.error("Error fetching fuel prices:", err);
      setError("Failed to load fuel prices data");
    } finally {
      setLoading(false);
    }
  };

  // Function to get a fuel type ID based on its rate
  const getFuelTypeByRate = (rate: string): string | undefined => {
    // Clean up rate for comparison (remove trailing zeros)
    const cleanRate = parseFloat(rate).toString();
    
    for (const fuel of fuelPrices) {
      if (fuel.price === rate || fuel.price === cleanRate) {
        return fuel.id;
      }
    }
    
    return undefined;
  };

  // Initial fetch on component mount
  useEffect(() => {
    fetchFuelPrices();
  }, []);

  return (
    <FuelPricesContext.Provider
      value={{
        fuelPrices,
        loading,
        error,
        refreshFuelPrices: fetchFuelPrices,
        getFuelTypeByRate
      }}
    >
      {children}
    </FuelPricesContext.Provider>
  );
}

// Custom hook to use the fuel prices context
export function useFuelPrices() {
  const context = useContext(FuelPricesContext);
  if (!context) {
    throw new Error("useFuelPrices must be used within a FuelPricesProvider");
  }
  return context;
} 