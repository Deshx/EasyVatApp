"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RecheckBillsRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Try to find the most recent session from localStorage
    if (typeof window !== 'undefined') {
      const allKeys = Object.keys(localStorage);
      const sessionKeys = allKeys.filter(key => key.startsWith('easyVat_') && key.endsWith('_sessionBills'));
      
      if (sessionKeys.length > 0) {
        // Extract sessionId from the most recent key
        // Format: easyVat_{sessionId}_sessionBills
        const latestKey = sessionKeys[sessionKeys.length - 1];
        const sessionId = latestKey.replace('easyVat_', '').replace('_sessionBills', '');
        
        // Check if this session has bills
        const billsData = localStorage.getItem(latestKey);
        if (billsData) {
          try {
            const bills = JSON.parse(billsData);
            if (bills.length > 0) {
              // Redirect to this session's recheck page
              router.replace(`/recheck-bills/${sessionId}`);
              return;
            }
          } catch (error) {
            console.error('Error parsing bills data:', error);
          }
        }
      }
    }
    
    // No valid session found, redirect to create invoice
    router.replace('/create-invoice');
  }, [router]);

  // Show a loading state while redirecting
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
} 