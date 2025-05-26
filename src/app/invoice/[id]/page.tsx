"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, storage } from "@/lib/firebase/firebase";
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
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
  pdfUrl?: string;
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
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfGenerated, setPdfGenerated] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

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
        
        console.log("Invoice loaded:", {
          id: invoiceDoc.id,
          pdfUrl: invoiceData.pdfUrl,
          hasUserProfile: !!invoiceData.userProfile
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

  // Generate PDF after invoice loads if it doesn't exist
  useEffect(() => {
    if (invoice && !invoice.pdfUrl && !pdfGenerating && !pdfGenerated) {
      generatePDF();
    }
  }, [invoice, pdfGenerating, pdfGenerated]);

  const generatePDF = async () => {
    if (!invoice || !user) return;
    
    try {
      setPdfGenerating(true);
      
      // Wait a moment for the component to render
      setTimeout(async () => {
        try {
          // Find the invoice element
          const invoiceElement = invoiceRef.current?.querySelector('.invoice-printable');
          if (!invoiceElement) {
            console.error("Invoice element not found for PDF generation");
            return;
          }
          
          // Generate PDF from the element
          const canvas = await html2canvas(invoiceElement as HTMLElement, {
            scale: 2, // Higher scale for better quality
            useCORS: true,
            logging: false,
            backgroundColor: 'white'
          });
          
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          const pdf = new jsPDF('p', 'mm', 'a4');
          const imgWidth = 210; // A4 width in mm
          const imgHeight = canvas.height * imgWidth / canvas.width;
          
          pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
          const pdfBlob = pdf.output('datauristring');
          
          // Upload PDF to Firebase Storage
          const pdfFileName = `invoices/${user.uid}/${new Date().getTime()}_${invoice.id}.pdf`;
          const storageRef = ref(storage, pdfFileName);
          
          // Upload PDF as data URL
          await uploadString(storageRef, pdfBlob, 'data_url');
          
          // Get the download URL for the PDF
          const pdfUrl = await getDownloadURL(storageRef);
          
          // Update the invoice document with the PDF URL
          await updateDoc(doc(db, "invoices", invoice.id), { pdfUrl });
          
          // Update local state
          setInvoice(prev => prev ? { ...prev, pdfUrl } : null);
          setPdfGenerated(true);
          
          console.log("PDF generated and uploaded successfully");
          console.log("PDF URL saved:", pdfUrl);
          
        } catch (err) {
          console.error("Error generating PDF:", err);
        } finally {
          setPdfGenerating(false);
        }
      }, 1000); // Wait 1 second for component to render
      
    } catch (err) {
      console.error("Error in PDF generation setup:", err);
      setPdfGenerating(false);
    }
  };

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
  
  // Function to handle downloading PDF if available
  const handleDownloadPdf = () => {
    if (invoice?.pdfUrl) {
      console.log("PDF URL:", invoice.pdfUrl);
      console.log("Attempting to open new tab...");
      
      try {
        // Try window.open first
        const newWindow = window.open(invoice.pdfUrl, '_blank');
        console.log("window.open result:", newWindow);
        
        // If window.open failed (blocked by popup blocker), try alternative method
        if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
          console.log("Popup blocked, trying alternative method...");
          
          // Create a temporary link and click it
          const link = document.createElement('a');
          link.href = invoice.pdfUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          console.log("Alternative method executed");
        } else {
          console.log("New tab opened successfully");
        }
      } catch (error) {
        console.error("Error opening PDF:", error);
        
        // Fallback: just navigate to the URL
        window.location.href = invoice.pdfUrl;
      }
    } else {
      console.log("No PDF URL available");
    }
  };
  
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="print:hidden p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold">Invoice</h1>
            <div className="space-x-2">
              <Link 
                href="/dashboard" 
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
              >
                Back
              </Link>
              {pdfGenerating && (
                <button
                  disabled
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-400 cursor-not-allowed"
                >
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating PDF...
                </button>
              )}
              {invoice.pdfUrl && !pdfGenerating && (
                <a
                  href={invoice.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 no-underline"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-center" ref={invoiceRef}>
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