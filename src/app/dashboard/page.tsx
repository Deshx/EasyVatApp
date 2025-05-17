"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Dashboard() {
  const { user, loading, error, signOut } = useAuth();
  const router = useRouter();
  const [signOutLoading, setSignOutLoading] = useState(false);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Render a loading state rather than showing dashboard elements briefly
  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            {user && (
              <>
                <div className="flex items-center gap-3">
                  {user.photoURL && (
                    <img 
                      src={user.photoURL} 
                      alt="Profile" 
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <div className="text-sm">
                    <p className="font-medium">{user.displayName || 'User'}</p>
                    <p className="text-gray-600 text-xs">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={signOutLoading}
                  className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {signOutLoading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-600"></div>
                  )}
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6" role="alert">
            <p>{error}</p>
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Your VAT Invoice Dashboard</h2>
          <p className="text-gray-600 mb-6">
            Welcome to EasyVat! Your platform for creating and managing VAT invoices with ease.
          </p>
          
          <div className="flex flex-wrap gap-4">
            <Link 
              href="#" 
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create New Invoice
            </Link>
            <Link 
              href="#" 
              className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              View All Invoices
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-medium text-lg mb-2">Recent Invoices</h3>
            <p className="text-gray-600 text-sm">No invoices yet. Create your first invoice to get started.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-medium text-lg mb-2">VAT Summary</h3>
            <p className="text-gray-600 text-sm">Track your VAT payments and submissions here.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-medium text-lg mb-2">Quick Actions</h3>
            <ul className="text-sm text-gray-600">
              <li className="mb-1">• Update your profile</li>
              <li className="mb-1">• Configure invoice settings</li>
              <li className="mb-1">• Export reports</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
} 