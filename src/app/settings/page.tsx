"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import { StationProfileForm } from "@/components/ui/StationProfileForm";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PayHereButton from "@/components/ui/PayHereButton";

export default function Settings() {
  const { user, loading, error } = useAuth();
  const router = useRouter();
  const [formSubmitted, setFormSubmitted] = useState(false);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      router.push("/login");
    }
      }, [user, loading, router]);



  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Render nothing if not authenticated
  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <button 
            onClick={() => router.back()} 
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl md:text-3xl font-bold mt-4">Settings</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6" role="alert">
            <p>{error}</p>
          </div>
        )}

        {formSubmitted && (
          <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6" role="alert">
            <p>Station profile updated successfully!</p>
          </div>
        )}

        <div className="bg-white shadow rounded-xl p-6">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile" className="mt-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Station Profile</h2>
                <p className="text-gray-600 mb-6">
                  Update your filling station information below.
                </p>
                
                <StationProfileForm onComplete={() => setFormSubmitted(true)} />
              </div>
            </TabsContent>
            
            <TabsContent value="payments" className="mt-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Payments</h2>
                <p className="text-gray-600 mb-6">
                  Manage your payment settings and subscriptions.
                </p>
                
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h3 className="text-lg font-medium mb-2">Make a Payment</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Use the secure payment gateway below to make payments.
                  </p>
                  
                  <PayHereButton payId="o1d31073b" />
                  
                  <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
                    <p className="text-gray-600 mb-2">Payment Information:</p>
                    <p className="text-xs text-gray-500">Secure payments powered by PayHere</p>
                    <p className="text-xs text-gray-500">All transactions are encrypted and secure</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

    </main>
  );
} 