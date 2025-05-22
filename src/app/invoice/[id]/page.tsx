"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import Link from "next/link";
import InvoicePreview from "@/components/ui/InvoicePreview";

interface InvoiceItem {
  fuelType: string;
  fuelTypeName?: string;
  quantityLitres: number;
  marketRate: number;
  amount: number;
}

interface InvoiceData {
  id: string;
  companyName: string;
  companyAddress: string;
  companyVatNumber: string;
  invoiceDate: string;
  status: string;
  userId: string;
  items: InvoiceItem[];
  subTotal: number;
  vat18: number;
  total: number;
  userProfile: {
    companyName: string;
    address: string;
    phone: string;
    email: string;
    vatNumber: string;
  };
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

  const handlePrintInvoice = () => {
    window.print();
  };
  
  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto print:max-w-full">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <h1 className="text-2xl md:text-3xl font-bold">Invoice</h1>
          <div className="space-x-2">
            <Link 
              href="/dashboard" 
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
            >
              Back
            </Link>
          </div>
        </div>
        
        <InvoicePreview
          invoiceId={invoice.id}
          invoiceDate={invoice.invoiceDate}
          companyName={invoice.companyName}
          companyVatNumber={invoice.companyVatNumber}
          stationName={invoice.userProfile.companyName}
          stationAddress={invoice.userProfile.address}
          stationPhone={invoice.userProfile.phone}
          stationEmail={invoice.userProfile.email}
          stationVatNumber={invoice.userProfile.vatNumber}
          items={invoice.items}
          subTotal={invoice.subTotal}
          vat18={invoice.vat18}
          total={invoice.total}
          onPrint={handlePrintInvoice}
        />
      </div>
    </main>
  );
} 