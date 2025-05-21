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
      const fuelPricesCollection = collection(db, "fuelPrices");
      const snapshot = await getDocs(fuelPricesCollection);
      
      const prices: FuelPrice[] = [];
      snapshot.forEach(doc => {
        prices.push({ id: doc.id, ...doc.data() } as FuelPrice);
      });
      
      setFuelPrices(prices);
    } catch (err) {
      console.error("Error fetching fuel prices:", err);
      setError("Failed to load fuel prices data");
    } finally {
      setLoading(false);
    }
  };

  // Function to get a fuel type based on the rate
  const getFuelTypeByRate = (rate: string): string | undefined => {
    if (!rate || fuelPrices.length === 0) return undefined;
    
    const parsedRate = parseFloat(rate);
    
    // Find the closest matching fuel price
    let closestFuel: FuelPrice | undefined;
    let smallestDifference = Number.MAX_VALUE;
    
    fuelPrices.forEach(fuel => {
      const fuelPrice = parseFloat(fuel.price);
      const difference = Math.abs(parsedRate - fuelPrice);
      
      if (difference < smallestDifference) {
        smallestDifference = difference;
        closestFuel = fuel;
      }
    });
    
    // If the difference is within a reasonable threshold (e.g., 5%)
    if (closestFuel && smallestDifference / parseFloat(closestFuel.price) <= 0.05) {
      return closestFuel.id;
    }
    
    return undefined;
  };

  // Fetch fuel prices on initial load
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
  if (context === undefined) {
    throw new Error('useFuelPrices must be used within a FuelPricesProvider');
  }
  return context;
} 