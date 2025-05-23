"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter, useParams } from "next/navigation";
import InvoiceForm from "@/components/ui/InvoiceForm";
import { InvoiceSessionProvider } from "@/lib/contexts/InvoiceSessionContext";

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
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Create Invoice</h1>
          <p className="text-sm text-gray-600 mt-1">Session ID: {sessionId}</p>
        </div>
        <InvoiceSessionProvider sessionId={sessionId}>
          <InvoiceForm />
        </InvoiceSessionProvider>
      </div>
    </main>
  );
} 