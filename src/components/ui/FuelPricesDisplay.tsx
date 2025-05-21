"use client";

import { useFuelPrices } from '@/lib/contexts/FuelPricesContext';

export function FuelPricesDisplay() {
  const { fuelPrices, loading, error } = useFuelPrices();
  
  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-medium mb-3">Current Fuel Prices</h2>
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-medium mb-2">Current Fuel Prices</h2>
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
          {error}
        </div>
      </div>
    );
  }
  
  if (fuelPrices.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-medium mb-2">Current Fuel Prices</h2>
        <p className="text-gray-500 text-sm">No fuel prices available</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-lg font-medium mb-3">Current Fuel Prices</h2>
      <div className="grid grid-cols-2 gap-2">
        {fuelPrices.map(fuel => (
          <div key={fuel.id} className="bg-gray-50 p-3 rounded-md">
            <div className="text-sm font-medium">{fuel.name}</div>
            <div className="text-lg font-semibold">Rs. {fuel.price}/L</div>
            {fuel.updatedAt && (
              <div className="text-xs text-gray-500 mt-1">
                Updated: {new Date(fuel.updatedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 