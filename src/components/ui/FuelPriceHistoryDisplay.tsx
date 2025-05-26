"use client";

import { useFuelPriceHistory } from '@/lib/contexts/FuelPriceHistoryContext';

export function FuelPriceHistoryDisplay() {
  const { priceHistory, loading, error } = useFuelPriceHistory();

  // Format date for display (DD-MM-YY)
  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  };

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-medium mb-3">Fuel Price History</h2>
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-medium mb-2">Fuel Price History</h2>
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (priceHistory.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-medium mb-2">Fuel Price History</h2>
        <p className="text-gray-500 text-sm">No fuel price history available</p>
      </div>
    );
  }

  // Group prices by fuel type
  const groupedPrices = priceHistory.reduce((acc, entry) => {
    if (!acc[entry.fuelType]) {
      acc[entry.fuelType] = [];
    }
    acc[entry.fuelType].push(entry);
    return acc;
  }, {} as Record<string, typeof priceHistory>);

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-lg font-medium mb-3">Fuel Price History</h2>
      
      <div className="space-y-4">
        {Object.entries(groupedPrices).map(([fuelType, prices]) => (
          <div key={fuelType} className="border rounded-lg p-3">
            <h3 className="font-semibold text-gray-800 mb-2">{fuelType}</h3>
            
            <div className="space-y-2">
              {prices.slice(0, 5).map((price) => (
                <div key={price.id} className="flex justify-between items-center text-sm">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">Rs. {price.price.toFixed(2)}/L</span>
                    {price.isActive && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="text-gray-500">
                    {formatDate(price.startDate)}
                    {price.endDate && ` - ${formatDate(price.endDate)}`}
                  </div>
                </div>
              ))}
              
              {prices.length > 5 && (
                <div className="text-xs text-gray-400 text-center pt-2">
                  ... and {prices.length - 5} more entries
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 