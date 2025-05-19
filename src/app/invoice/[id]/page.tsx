"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import Link from "next/link";

interface InvoiceData {
  id: string;
  companyName: string;
  companyAddress: string;
  companyVatNumber: string;
  invoiceDate: string;
  status: string;
  userId: string;
  createdAt: {
    toDate: () => Date;
  };
}

export default function InvoicePage({ params }: { params: { id: string } }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    const fetchInvoice = async () => {
      if (!user) return;
      
      try {
        setPageLoading(true);
        const invoiceDoc = await getDoc(doc(db, "invoices", params.id));
        
        if (!invoiceDoc.exists()) {
          setError("Invoice not found");
          return;
        }
        
        const invoiceData = invoiceDoc.data() as Omit<InvoiceData, "id">;
        
        // Check if the invoice belongs to the current user
        if (invoiceData.userId !== user.uid) {
          setError("You don't have permission to view this invoice");
          return;
        }
        
        setInvoice({
          id: invoiceDoc.id,
          ...invoiceData
        });
      } catch (err) {
        console.error("Error fetching invoice:", err);
        setError("Failed to load invoice. Please try again.");
      } finally {
        setPageLoading(false);
      }
    };

    if (!loading && user) {
      fetchInvoice();
    }
  }, [user, loading, params.id, router]);

  if (loading || pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-4 md:p-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6" role="alert">
            <p>{error}</p>
          </div>
          <Link 
            href="/dashboard" 
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold">Invoice Details</h1>
          <div className="space-x-2">
            <Link 
              href="/dashboard" 
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
            >
              Back
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-medium mb-2">Invoice Information</h2>
              <p className="text-gray-500 text-sm mb-1">Status: <span className="font-medium text-blue-600 capitalize">{invoice.status}</span></p>
              <p className="text-gray-500 text-sm">Date: <span className="font-medium">{new Date(invoice.invoiceDate).toLocaleDateString()}</span></p>
            </div>
            
            <div>
              <h2 className="text-lg font-medium mb-2">Client Information</h2>
              <p className="font-medium">{invoice.companyName}</p>
              <p className="text-sm text-gray-600 whitespace-pre-line">{invoice.companyAddress}</p>
              <p className="text-sm text-gray-600 mt-1">VAT: {invoice.companyVatNumber}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-medium mb-4">Invoice Items</h2>
          <p className="text-gray-500 italic">This is a placeholder for invoice items. The invoice edit functionality will be implemented in a future update.</p>
        </div>
      </div>
    </main>
  );
} 