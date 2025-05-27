"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter, useParams } from "next/navigation";
import InvoiceForm from "@/components/ui/InvoiceForm";
import { InvoiceSessionProvider } from "@/lib/contexts/InvoiceSessionContext";
import { SubscriptionGate } from "@/components/ui/SubscriptionGate";

export default function CreateInvoice() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Validate sessionId is a valid UUID format
  useEffect(() => {
    if (sessionId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
      // Invalid sessionId format, redirect to create new session
      router.replace("/create-invoice");
    }
  }, [sessionId, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Render a loading state rather than showing page elements briefly
  if (!user) {
    return null;
  }

  // Don't render if sessionId is invalid (will redirect)
  if (!sessionId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Validating session...</p>
        </div>
      </div>
    );
  }

  return (
    <SubscriptionGate>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <InvoiceSessionProvider sessionId={sessionId}>
          <InvoiceForm />
        </InvoiceSessionProvider>
      </main>
    </SubscriptionGate>
  );
} 