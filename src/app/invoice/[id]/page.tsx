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
import { Download, MessageCircle, Mail } from "lucide-react";
import EmailModal from "@/components/ui/EmailModal";
import { EmailService } from "@/lib/services/emailService";
import { useToast } from "@/components/ui/Toast";

interface InvoiceItem {
  fuelType: string;
  fuelTypeName?: string;
  quantityLitres: number;
  marketRate: number;
  amount: number;
}

interface InvoiceData {
  id: string; // Firestore document ID
  invoiceId?: string; // Custom invoice ID (EV-XXX-YYYY-0001 format)
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
  const [sharingWhatsapp, setSharingWhatsapp] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const { showToast, ToastComponent } = useToast();

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

  const generatePDFBlob = async (): Promise<Blob | null> => {
    if (!invoice) return null;
    
    try {
      // Find the invoice element
      const invoiceElement = invoiceRef.current?.querySelector('.invoice-printable');
      if (!invoiceElement) {
        console.error("Invoice element not found for PDF generation");
        return null;
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
      
      // Return as blob instead of data URI
      return pdf.output('blob');
    } catch (err) {
      console.error("Error generating PDF blob:", err);
      return null;
    }
  };

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
  const handleDownloadPdf = async () => {
    // Generate and download PDF directly if no URL available
    if (!invoice?.pdfUrl) {
      const blob = await generatePDFBlob();
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoice-${invoice.invoiceId || invoice.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    }
  };

  const handleShareWhatsApp = async () => {
    if (!invoice || sharingWhatsapp) return;
    
    try {
      setSharingWhatsapp(true);
      
      // Generate PDF blob for sharing
      const pdfBlob = await generatePDFBlob();
      if (!pdfBlob) {
        throw new Error("Failed to generate PDF");
      }
      
      // Create File object for Web Share API
      const file = new File([pdfBlob], `invoice-${invoice.invoiceId || invoice.id}.pdf`, {
        type: 'application/pdf'
      });
      
      // Check if Web Share API Level 2 (with files) is supported
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'VAT Invoice',
            text: `Invoice ${invoice.invoiceId || invoice.id} from ${invoice.userProfile.companyName}`,
            files: [file]
          });
          console.log('PDF shared successfully via Web Share API!');
          return;
        } catch (shareError: any) {
          // User cancelled or share failed, continue to fallback
          console.log('Web Share API failed, trying fallback:', shareError.message);
        }
      }
      
      // Fallback: Share PDF URL if available, or upload and get URL
      let shareUrl = invoice.pdfUrl;
      
      if (!shareUrl) {
        // If no PDF URL exists, we'd need to upload the blob to get a shareable URL
        // For now, we'll use a text-only share with invoice details
        const invoiceText = `Invoice ${invoice.invoiceId || invoice.id} from ${invoice.userProfile.companyName}
Date: ${invoice.invoiceDate}
Total: Rs ${invoice.total.toFixed(2)}

Download PDF: ${window.location.href}`;
        
        // Try Web Share API Level 1 (text/URL only)
        if (navigator.share) {
          try {
            await navigator.share({
              title: 'VAT Invoice',
              text: invoiceText,
              url: window.location.href
            });
            console.log('Invoice details shared successfully!');
            return;
          } catch (shareError) {
            console.log('Web Share API Level 1 failed, using WhatsApp deep link');
          }
        }
        
        // Final fallback: WhatsApp deep link
        const whatsappText = encodeURIComponent(invoiceText);
        const whatsappUrl = `https://wa.me/?text=${whatsappText}`;
        window.open(whatsappUrl, '_blank');
        console.log('Opened WhatsApp deep link');
        return;
      }
      
      // If PDF URL exists, share it
      const shareText = `Invoice ${invoice.invoiceId || invoice.id} from ${invoice.userProfile.companyName} - ${shareUrl}`;
      
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'VAT Invoice',
            text: `Invoice ${invoice.invoiceId || invoice.id} from ${invoice.userProfile.companyName}`,
            url: shareUrl
          });
          console.log('PDF URL shared successfully!');
          return;
        } catch (shareError) {
          console.log('Web Share API failed, using WhatsApp deep link');
        }
      }
      
      // Final fallback: WhatsApp deep link with PDF URL
      const whatsappText = encodeURIComponent(shareText);
      const whatsappUrl = `https://wa.me/?text=${whatsappText}`;
      window.open(whatsappUrl, '_blank');
      
    } catch (error) {
      console.error("Error sharing to WhatsApp:", error);
      alert("Failed to share invoice. Please try again.");
    } finally {
      setSharingWhatsapp(false);
    }
  };

  const handleEmailClient = () => {
    setEmailModalOpen(true);
  };

  const handleSendEmail = async (emails: string[]) => {
    try {
      if (!invoice) throw new Error("Invoice not found");

      // Generate PDF blob for email attachment
      const pdfBlob = await generatePDFBlob();
      if (!pdfBlob) {
        throw new Error("Failed to generate PDF");
      }

      // Convert blob to base64
      const reader = new FileReader();
      const pdfBuffer = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });

      // Send email using the email service
      const result = await EmailService.sendInvoiceEmail({
        emails,
        invoiceId: invoice.invoiceId || invoice.id, // Use custom invoice ID if available
        companyName: invoice.userProfile.companyName,
        pdfBuffer
      });

      // Show success toast
      showToast(
        result.message || `Email sent successfully to ${emails.length} recipient(s)!`,
        "success"
      );

      // Close modal after success
      setEmailModalOpen(false);

    } catch (error: any) {
      console.error("Error sending email:", error);
      
      // Show error toast
      const errorMessage = error.message || "Failed to send email";
      if (errorMessage.includes("only send testing emails")) {
        showToast(
          "⚠️ Development Mode: You can only send emails to thehowtofeed@gmail.com. To send to other recipients, verify a domain at resend.com/domains",
          "warning"
        );
      } else if (errorMessage.includes("domain is not verified")) {
        showToast(
          "⚠️ Domain not verified. Please verify your domain at resend.com/domains",
          "warning"
        );
      } else {
        showToast(errorMessage, "error");
      }
      
      // Re-throw error for EmailModal to handle
      throw error;
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="print:hidden p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold">Invoice</h1>
            <Link 
              href="/dashboard" 
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
            >
              Back
            </Link>
          </div>

          {/* Three Big Action Buttons */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8">
            {/* Download PDF Button */}
            {invoice.pdfUrl && !pdfGenerating ? (
              <a
                href={invoice.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={`invoice-${invoice.invoiceId || invoice.id}.pdf`}
                className="flex flex-col items-center justify-center p-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg transition-colors duration-200 no-underline"
              >
                <Download className="h-8 w-8 mb-3" />
                <span className="text-lg font-semibold">Download Invoice</span>
                <span className="text-sm opacity-90">Save as PDF</span>
              </a>
            ) : (
              <button
                onClick={handleDownloadPdf}
                disabled={pdfGenerating}
                className="flex flex-col items-center justify-center p-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg shadow-lg transition-colors duration-200 disabled:cursor-not-allowed"
              >
                {pdfGenerating ? (
                  <>
                    <svg className="animate-spin h-8 w-8 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-lg font-semibold">Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-8 w-8 mb-3" />
                    <span className="text-lg font-semibold">Download Invoice</span>
                    <span className="text-sm opacity-90">Save as PDF</span>
                  </>
                )}
              </button>
            )}

            {/* Share on WhatsApp Button */}
            <button
              onClick={handleShareWhatsApp}
              disabled={sharingWhatsapp || pdfGenerating}
              className="flex flex-col items-center justify-center p-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg shadow-lg transition-colors duration-200 disabled:cursor-not-allowed"
            >
              {sharingWhatsapp ? (
                <>
                  <svg className="animate-spin h-8 w-8 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-lg font-semibold">Sharing...</span>
                </>
              ) : (
                <>
                  <MessageCircle className="h-8 w-8 mb-3" />
                  <span className="text-lg font-semibold">Share on WhatsApp</span>
                  <span className="text-sm opacity-90">Send to client</span>
                </>
              )}
            </button>

            {/* Email to Client Button */}
            <button
              onClick={handleEmailClient}
              className="flex flex-col items-center justify-center p-6 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-lg transition-colors duration-200"
            >
              <Mail className="h-8 w-8 mb-3" />
              <span className="text-lg font-semibold">Email to Client</span>
              <span className="text-sm opacity-90">Send via email</span>
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex justify-center" ref={invoiceRef}>
        <InvoicePreview
          invoiceId={invoice.invoiceId || invoice.id} // Use custom invoice ID if available, fallback to document ID
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

      {/* Email Modal */}
      <EmailModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        onSend={handleSendEmail}
        invoiceId={invoice.invoiceId || invoice.id}
        companyName={invoice.userProfile.companyName}
      />

      {/* Toast Notifications */}
      <ToastComponent />
    </main>
  );
} 