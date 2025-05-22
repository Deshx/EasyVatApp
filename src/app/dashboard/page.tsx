"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { FuelPricesDisplay } from "@/components/ui/FuelPricesDisplay";

export default function Dashboard() {
  const { user, loading, error, signOut, profileStatus, isSuperAdmin } = useAuth();
  const router = useRouter();
  const [signOutLoading, setSignOutLoading] = useState(false);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    // If user is flagged as new, redirect to profile setup
    if (!loading && user && profileStatus === "new") {
      router.push("/profile-setup");
    }
  }, [user, loading, router, profileStatus]);

  const handleSignOut = async () => {
    setSignOutLoading(true);
    try {
      await signOut();
      router.push("/login");
    } catch (err) {
      console.error("Failed to sign out:", err);
    } finally {
      setSignOutLoading(false);
    }
  };

  // Handle Create Invoice button click - clear any existing session first
  const handleCreateInvoice = () => {
    // Clear invoice session data from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('easyVat_sessionBills');
      localStorage.removeItem('easyVat_currentIndex');
    }
    // Navigate to create invoice page
    router.push('/create-invoice');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Render a loading state rather than showing dashboard elements briefly
  if (!user || profileStatus === "new") {
    return null;
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-xl mx-auto">
        <div className="flex flex-col items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-center">EasyVat</h1>
          
          {user && (
            <div className="flex items-center mt-4 gap-2">
              {user.photoURL && (
                <img 
                  src={user.photoURL} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-sm font-medium">{user.displayName || user.email || 'User'}</span>
              {isSuperAdmin && (
                <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
                  Super Admin
                </span>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6" role="alert">
            <p>{error}</p>
          </div>
        )}

        <div className="mb-6">
          <FuelPricesDisplay />
        </div>

        <div className="flex flex-col gap-4 mb-8">
          {isSuperAdmin && (
            <Link 
              href="/fuel-prices" 
              className="flex items-center justify-center py-4 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-colors shadow-md"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Manage Fuel Prices
            </Link>
          )}
          
          <button 
            onClick={handleCreateInvoice}
            className="flex items-center justify-center py-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Invoice
          </button>
          
          <Link 
            href="/invoices" 
            className="flex items-center justify-center py-4 bg-white text-gray-800 font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-md border border-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View Invoices
          </Link>
          
          <Link 
            href="/settings" 
            className="flex items-center justify-center py-4 bg-white text-gray-800 font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-md border border-gray-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Link>
        </div>
        
        <div className="flex justify-center mt-auto">
          <button
            onClick={handleSignOut}
            disabled={signOutLoading}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {signOutLoading && (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-600"></div>
            )}
            Sign Out
          </button>
        </div>
      </div>
    </main>
  );
} 