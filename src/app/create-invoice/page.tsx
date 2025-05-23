"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreateInvoiceRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Generate a new UUID for the session
    const sessionId = crypto.randomUUID();
    
    // Redirect to the session-specific URL
    router.replace(`/create-invoice/${sessionId}`);
  }, [router]);

  // Show a loading state while redirecting
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
} 