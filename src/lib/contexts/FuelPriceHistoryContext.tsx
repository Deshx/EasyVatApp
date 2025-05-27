"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';

export interface FuelPriceHistory {
  id?: string;
  fuelType: string;
  price: number;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
  editLog?: EditLogEntry[];
}

export interface EditLogEntry {
  timestamp: Date;
  userId: string;
  userEmail: string;
  action: 'created' | 'updated' | 'closed';
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  reason?: string;
}

interface FuelPriceHistoryContextType {
  priceHistory: FuelPriceHistory[];
  loading: boolean;
  error: string | null;
  refreshHistory: () => Promise<void>;
  addNewPrice: (fuelType: string, price: number, startDate: Date, reason?: string) => Promise<boolean>;
  updatePrice: (id: string, updates: Partial<FuelPriceHistory>, reason?: string) => Promise<boolean>;
  getCurrentPrices: () => FuelPriceHistory[];
}

const FuelPriceHistoryContext = createContext<FuelPriceHistoryContextType>({
  priceHistory: [],
  loading: true,
  error: null,
  refreshHistory: async () => {},
  addNewPrice: async () => false,
  updatePrice: async () => false,
  getCurrentPrices: () => [],
});

export function FuelPriceHistoryProvider({ children }: { children: React.ReactNode }) {
  const [priceHistory, setPriceHistory] = useState<FuelPriceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();



  // Function to fetch fuel price history
  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const fuelPricesCollection = collection(db, "fuelPriceHistory");
      const q = query(fuelPricesCollection, orderBy("startDate", "desc"));
      const snapshot = await getDocs(q);
      
      const priceHistory: FuelPriceHistory[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        priceHistory.push({
          id: doc.id,
          ...data,
          startDate: data.startDate.toDate(),
          endDate: data.endDate?.toDate(),
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          editLog: data.editLog?.map((entry: any) => ({
            ...entry,
            timestamp: entry.timestamp.toDate()
          }))
        } as FuelPriceHistory);
      });
      
      setPriceHistory(priceHistory);
    } catch (err) {
      console.error("Error fetching fuel price history:", err);
      setError("Failed to load fuel price history");
    } finally {
      setLoading(false);
    }
  };

  // Function to add new price
  const addNewPrice = async (
    fuelType: string, 
    price: number, 
    startDate: Date, 
    reason?: string
  ): Promise<boolean> => {
    if (!user) {
      setError("Authentication required");
      return false;
    }

    // Check if user is super admin
    if (user.email !== "oceans.deshan@gmail.com") {
      setError("Super admin access required");
      return false;
    }

    try {
      const now = new Date();
      const startDateObj = new Date(startDate);

      // First, close any active price for this fuel type
      const fuelPricesCollection = collection(db, "fuelPriceHistory");
      const activeQuery = query(
        fuelPricesCollection,
        where("fuelType", "==", fuelType),
        where("isActive", "==", true)
      );
      const activeSnapshot = await getDocs(activeQuery);

      // Close active prices
      for (const docSnapshot of activeSnapshot.docs) {
        const endDate = new Date(startDateObj.getTime() - 1); // End 1ms before new price starts
        await updateDoc(doc(db, "fuelPriceHistory", docSnapshot.id), {
          endDate: Timestamp.fromDate(endDate),
          isActive: false,
          updatedBy: user.uid,
          updatedAt: Timestamp.fromDate(now),
          editLog: [
            ...(docSnapshot.data().editLog || []),
            {
              timestamp: Timestamp.fromDate(now),
              userId: user.uid,
              userEmail: user.email,
              action: 'closed',
              reason: `Closed due to new price starting ${startDateObj.toLocaleDateString()}`
            }
          ]
        });
      }

      // Add new price entry
      const newPriceEntry = {
        fuelType,
        price: parseFloat(price.toString()),
        startDate: Timestamp.fromDate(startDateObj),
        isActive: true,
        createdBy: user.uid,
        createdAt: Timestamp.fromDate(now),
        editLog: [{
          timestamp: Timestamp.fromDate(now),
          userId: user.uid,
          userEmail: user.email!,
          action: 'created',
          reason: reason || 'New price entry'
        }]
      };

      await addDoc(fuelPricesCollection, newPriceEntry);

      await fetchHistory(); // Refresh the data
      return true;
    } catch (err) {
      console.error("Error adding fuel price:", err);
      setError(err instanceof Error ? err.message : "Failed to add fuel price");
      return false;
    }
  };

  // Function to update existing price
  const updatePrice = async (
    id: string, 
    updates: Partial<FuelPriceHistory>, 
    reason?: string
  ): Promise<boolean> => {
    if (!user) {
      setError("Authentication required");
      return false;
    }

    // Check if user is super admin
    if (user.email !== "oceans.deshan@gmail.com") {
      setError("Super admin access required");
      return false;
    }

    try {
      const now = new Date();
      const docRef = doc(db, "fuelPriceHistory", id);
      
      // Get current document to track changes
      const currentDoc = await getDocs(query(collection(db, "fuelPriceHistory"), where("__name__", "==", id)));
      const currentData = currentDoc.docs[0]?.data();
      
      if (!currentData) {
        setError("Price entry not found");
        return false;
      }

      // Track changes
      const changes: { field: string; oldValue: any; newValue: any }[] = [];
      Object.keys(updates).forEach(field => {
        if (currentData[field] !== updates[field]) {
          changes.push({
            field,
            oldValue: currentData[field],
            newValue: updates[field]
          });
        }
      });

      // Prepare update data
      const updateData: any = {
        ...updates,
        updatedBy: user.uid,
        updatedAt: Timestamp.fromDate(now),
        editLog: [
          ...(currentData.editLog || []),
          {
            timestamp: Timestamp.fromDate(now),
            userId: user.uid,
            userEmail: user.email,
            action: 'updated',
            changes,
            reason: reason || 'Price correction'
          }
        ]
      };

      // Convert dates to Timestamps if present
      if (updates.startDate) {
        updateData.startDate = Timestamp.fromDate(new Date(updates.startDate));
      }
      if (updates.endDate) {
        updateData.endDate = Timestamp.fromDate(new Date(updates.endDate));
      }

      await updateDoc(docRef, updateData);

      await fetchHistory(); // Refresh the data
      return true;
    } catch (err) {
      console.error("Error updating fuel price:", err);
      setError(err instanceof Error ? err.message : "Failed to update fuel price");
      return false;
    }
  };

  // Function to get current active prices
  const getCurrentPrices = (): FuelPriceHistory[] => {
    return priceHistory.filter(entry => entry.isActive);
  };

  // Initial fetch on component mount - only if user is authenticated
  useEffect(() => {
    if (user) {
      fetchHistory();
    } else {
      setLoading(false);
    }
  }, [user]);

  return (
    <FuelPriceHistoryContext.Provider
      value={{
        priceHistory,
        loading,
        error,
        refreshHistory: fetchHistory,
        addNewPrice,
        updatePrice,
        getCurrentPrices
      }}
    >
      {children}
    </FuelPriceHistoryContext.Provider>
  );
}

// Custom hook to use the fuel price history context
export function useFuelPriceHistory() {
  const context = useContext(FuelPriceHistoryContext);
  if (!context) {
    throw new Error("useFuelPriceHistory must be used within a FuelPriceHistoryProvider");
  }
  return context;
} 