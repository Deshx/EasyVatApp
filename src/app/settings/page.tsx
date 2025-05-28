"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { StationProfileForm } from "@/components/ui/StationProfileForm";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageContainer } from "@/components/ui/page-container";
import { PaymentsTab } from "@/components/ui/PaymentsTab";

export default function Settings() {
  const { user, loading, error } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Check for tab parameter in URL
    const tab = searchParams.get('tab');
    if (tab && (tab === 'profile' || tab === 'payments')) {
      setActiveTab(tab);
    }
  }, [searchParams]);



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
    <main className="min-h-screen bg-gray-50">
      <PageContainer size="md" className="py-4 md:py-8">
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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
                
                <StationProfileForm />
              </div>
            </TabsContent>
            
            <TabsContent value="payments" className="mt-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">Payments</h2>
                <p className="text-gray-600 mb-6">
                  Manage your subscription and payment history.
                </p>
                
                <PaymentsTab />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </PageContainer>
    </main>
  );
} 