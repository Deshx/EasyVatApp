"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";

interface FuelPrice {
  id?: string;
  name: string;
  price: string;
  updatedAt?: string;
}

export default function FuelPricesManagement() {
  const { user, loading, error, isSuperAdmin } = useAuth();
  const router = useRouter();
  const [fuelPrices, setFuelPrices] = useState<FuelPrice[]>([
    { name: "", price: "" }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [fetchedPrices, setFetchedPrices] = useState<FuelPrice[]>([]);

  // Fetch existing fuel prices
  useEffect(() => {
    const fetchFuelPrices = async () => {
      if (!user) return;
      
      try {
        const fuelPricesCollection = collection(db, "fuelPrices");
        const snapshot = await getDocs(fuelPricesCollection);
        
        const prices: FuelPrice[] = [];
        snapshot.forEach(doc => {
          prices.push({ id: doc.id, ...doc.data() } as FuelPrice);
        });
        
        setFetchedPrices(prices);
        
        // If we have existing prices, use them as initial state
        if (prices.length > 0) {
          setFuelPrices(prices);
        }
      } catch (err) {
        console.error("Error fetching fuel prices:", err);
      }
    };

    fetchFuelPrices();
  }, [user]);

  // Redirect non-super admins
  useEffect(() => {
    if (!loading && (!user || !isSuperAdmin)) {
      router.push("/dashboard");
    }
  }, [user, loading, isSuperAdmin, router]);

  const handleAddField = () => {
    setFuelPrices([...fuelPrices, { name: "", price: "" }]);
  };

  const handleRemoveField = (index: number) => {
    if (fuelPrices.length === 1) return;
    const newFuelPrices = [...fuelPrices];
    newFuelPrices.splice(index, 1);
    setFuelPrices(newFuelPrices);
  };

  const handleChange = (index: number, field: "name" | "price", value: string) => {
    const newFuelPrices = [...fuelPrices];
    newFuelPrices[index][field] = value;
    setFuelPrices(newFuelPrices);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isSuperAdmin) return;

    // Validate inputs
    for (const price of fuelPrices) {
      if (!price.name.trim() || !price.price.trim()) {
        setSubmitError("All fields must be filled in");
        return;
      }
      
      if (isNaN(parseFloat(price.price))) {
        setSubmitError("Price must be a valid number");
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      // Clear existing fuel prices (by not deleting individual docs, 
      // we preserve historical data if needed, especially useful for auditing)
      const timestamp = new Date().toISOString();
      const batch = { updatedAt: timestamp, createdBy: user.uid };
      
      // Save each fuel price with unique ID
      for (const price of fuelPrices) {
        const priceId = price.id || crypto.randomUUID();
        await setDoc(doc(db, "fuelPrices", priceId), {
          ...price,
          ...batch
        });
      }
      
      setSubmitSuccess(true);
      // After 3 seconds, hide the success message
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving fuel prices:", err);
      setSubmitError("Failed to save fuel prices. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Prevent non-admin access
  if (!isSuperAdmin) {
    return null;
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Fuel Prices Management</h1>
          <Link 
            href="/dashboard" 
            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
          >
            Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Update Current Fuel Prices</h2>
          <p className="text-gray-600 mb-6">
            These prices will be visible to all users of the system.
          </p>

          {submitError && (
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6" role="alert">
              <p>{submitError}</p>
            </div>
          )}

          {submitSuccess && (
            <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6" role="alert">
              <p>Fuel prices updated successfully!</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {fuelPrices.map((price, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fuel Name
                  </label>
                  <input
                    type="text"
                    value={price.name}
                    onChange={(e) => handleChange(index, "name", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Petrol 95"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price per Liter (LKR)
                  </label>
                  <input
                    type="text"
                    value={price.price}
                    onChange={(e) => handleChange(index, "price", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 325.00"
                  />
                </div>
                <div className="pt-7">
                  <button
                    type="button"
                    onClick={() => handleRemoveField(index)}
                    disabled={fuelPrices.length === 1}
                    className="p-2 text-red-500 hover:text-red-700 disabled:text-gray-300"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddField}
              className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Another Fuel Type
            </button>

            <div className="pt-4 border-t">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                    Saving...
                  </>
                ) : (
                  "Save Fuel Prices"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
} 