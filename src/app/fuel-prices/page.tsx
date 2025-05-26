"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useFuelPriceHistory, FuelPriceHistory } from "@/lib/contexts/FuelPriceHistoryContext";

interface AddPriceForm {
  fuelType: string;
  price: string;
  startDate: string;
  reason: string;
}

interface EditPriceForm {
  id: string;
  fuelType: string;
  price: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export default function FuelPricesAdmin() {
  const { user, loading, error, isSuperAdmin } = useAuth();
  const router = useRouter();
  const { 
    priceHistory, 
    loading: historyLoading, 
    error: historyError, 
    addNewPrice, 
    updatePrice,
    refreshHistory 
  } = useFuelPriceHistory();

  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const [addForm, setAddForm] = useState<AddPriceForm>({
    fuelType: "",
    price: "",
    startDate: new Date().toISOString().split('T')[0],
    reason: ""
  });

  const [editForm, setEditForm] = useState<EditPriceForm>({
    id: "",
    fuelType: "",
    price: "",
    startDate: "",
    endDate: "",
    reason: ""
  });

  // Redirect non-super admins
  useEffect(() => {
    if (!loading && (!user || !isSuperAdmin)) {
      router.push("/dashboard");
    }
  }, [user, loading, isSuperAdmin, router]);

  // Format date for display (DD-MM-YY)
  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  };

  // Handle add new price
  const handleAddPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.fuelType.trim() || !addForm.price.trim() || !addForm.startDate) {
      setSubmitError("All fields except reason are required");
      return;
    }

    if (isNaN(parseFloat(addForm.price))) {
      setSubmitError("Price must be a valid number");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const success = await addNewPrice(
        addForm.fuelType.trim(),
        parseFloat(addForm.price),
        new Date(addForm.startDate),
        addForm.reason.trim() || undefined
      );

      if (success) {
        setSubmitSuccess("Fuel price added successfully!");
        setShowAddForm(false);
        setAddForm({
          fuelType: "",
          price: "",
          startDate: new Date().toISOString().split('T')[0],
          reason: ""
        });
        setTimeout(() => setSubmitSuccess(null), 3000);
      }
    } catch (err) {
      setSubmitError("Failed to add fuel price. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit price
  const handleEditPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.fuelType.trim() || !editForm.price.trim() || !editForm.startDate) {
      setSubmitError("Fuel type, price, and start date are required");
      return;
    }

    if (isNaN(parseFloat(editForm.price))) {
      setSubmitError("Price must be a valid number");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const updates: Partial<FuelPriceHistory> = {
        fuelType: editForm.fuelType.trim(),
        price: parseFloat(editForm.price),
        startDate: new Date(editForm.startDate),
      };

      if (editForm.endDate) {
        updates.endDate = new Date(editForm.endDate);
        updates.isActive = false;
      }

      const success = await updatePrice(
        editForm.id,
        updates,
        editForm.reason.trim() || undefined
      );

      if (success) {
        setSubmitSuccess("Fuel price updated successfully!");
        setShowEditForm(null);
        setTimeout(() => setSubmitSuccess(null), 3000);
      }
    } catch (err) {
      setSubmitError("Failed to update fuel price. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start editing a price entry
  const startEdit = (entry: FuelPriceHistory) => {
    setEditForm({
      id: entry.id!,
      fuelType: entry.fuelType,
      price: entry.price.toString(),
      startDate: entry.startDate.toISOString().split('T')[0],
      endDate: entry.endDate ? entry.endDate.toISOString().split('T')[0] : "",
      reason: ""
    });
    setShowEditForm(entry.id!);
    setSubmitError(null);
  };

  if (loading || historyLoading) {
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
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Fuel Price History Admin</h1>
          <Link 
            href="/dashboard" 
            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
          >
            Back to Dashboard
          </Link>
        </div>

        {/* Success/Error Messages */}
        {submitError && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6" role="alert">
            <p>{submitError}</p>
          </div>
        )}

        {submitSuccess && (
          <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6" role="alert">
            <p>{submitSuccess}</p>
          </div>
        )}

        {historyError && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6" role="alert">
            <p>{historyError}</p>
          </div>
        )}

        {/* Add New Price Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            {showAddForm ? "Cancel" : "Add New Price"}
          </button>
        </div>

        {/* Add New Price Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Add New Fuel Price</h2>
            <p className="text-gray-600 mb-4">
              Adding a new price will automatically close the previous active price for this fuel type.
            </p>
            
            <form onSubmit={handleAddPrice} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fuel Type *
                  </label>
                  <input
                    type="text"
                    value={addForm.fuelType}
                    onChange={(e) => setAddForm({...addForm, fuelType: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Petrol 95"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price per Liter (LKR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={addForm.price}
                    onChange={(e) => setAddForm({...addForm, price: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 325.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={addForm.startDate}
                    onChange={(e) => setAddForm({...addForm, startDate: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason (Optional)
                  </label>
                  <input
                    type="text"
                    value={addForm.reason}
                    onChange={(e) => setAddForm({...addForm, reason: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Government price revision"
                  />
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  {isSubmitting ? "Adding..." : "Add Price"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Price History Table */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold">Price History</h2>
            <p className="text-gray-600 text-sm">All fuel price entries with start and end dates</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fuel Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price (LKR)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Start Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    End Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {priceHistory.map((entry) => (
                  <tr key={entry.id} className={entry.isActive ? "bg-green-50" : ""}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {entry.fuelType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Rs. {entry.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(entry.startDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {entry.endDate ? formatDate(entry.endDate) : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        entry.isActive 
                          ? "bg-green-100 text-green-800" 
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {entry.isActive ? "Active" : "Closed"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => startEdit(entry)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Edit
                      </button>
                      {entry.editLog && entry.editLog.length > 0 && (
                        <button
                          onClick={() => {/* TODO: Show edit log modal */}}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          History
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Form Modal */}
        {showEditForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">Edit Fuel Price</h2>
              
              <form onSubmit={handleEditPrice} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fuel Type *
                  </label>
                  <input
                    type="text"
                    value={editForm.fuelType}
                    onChange={(e) => setEditForm({...editForm, fuelType: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price per Liter (LKR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.price}
                    onChange={(e) => setEditForm({...editForm, price: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({...editForm, startDate: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date (Optional - leave empty for active)
                  </label>
                  <input
                    type="date"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm({...editForm, endDate: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for Change *
                  </label>
                  <input
                    type="text"
                    value={editForm.reason}
                    onChange={(e) => setEditForm({...editForm, reason: e.target.value})}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Price correction"
                    required
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                  >
                    {isSubmitting ? "Updating..." : "Update Price"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEditForm(null)}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
} 