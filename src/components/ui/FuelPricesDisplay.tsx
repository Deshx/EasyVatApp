"use client";

import { useFuelPriceHistory } from '@/lib/contexts/FuelPriceHistoryContext';

export function FuelPricesDisplay() {
  const { priceHistory, loading, error } = useFuelPriceHistory();
  
  // Filter to get only currently active prices
  const activePrices = priceHistory.filter(entry => entry.isActive);
  
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
  
  if (activePrices.length === 0) {
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
        {activePrices.map(fuel => (
          <div key={fuel.id} className="bg-gray-50 p-3 rounded-md">
            <div className="text-sm font-medium">{fuel.fuelType}</div>
            <div className="text-lg font-semibold">Rs. {fuel.price}/L</div>
            <div className="text-xs text-gray-500 mt-1">
              Since: {fuel.startDate.toLocaleDateString('en-GB', { 
                day: '2-digit', 
                month: '2-digit', 
                year: '2-digit' 
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 