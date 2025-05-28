"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, storage } from "@/lib/firebase/firebase";
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import jsPDF from 'jspdf';
import Link from "next/link";
import PDFViewer from "@/components/ui/PDFViewer";
import { PageContainer } from "@/components/ui/page-container";
import { Download, MessageCircle, Mail } from "lucide-react";
import EmailModal from "@/components/ui/EmailModal";
import { EmailService } from "@/lib/services/emailService";
import { useToast } from "@/components/ui/toast";

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
  const [pdfPreviewBlob, setPdfPreviewBlob] = useState<Blob | null>(null);
  const [sharingWhatsapp, setSharingWhatsapp] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    const fetchInvoice = async () => {
      if (!user) return;
      
      // Check if Firebase is properly initialized
      if (!db) {
        setError("Database connection error. Please try again later.");
        return;
      }
      
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

  // Generate PDF after invoice loads
  useEffect(() => {
    if (invoice && !pdfGenerating && !pdfGenerated && !pdfPreviewBlob) {
      // Always generate fresh preview blob to avoid CORS issues
      console.log("Generating preview blob for invoice:", invoice.invoiceId || invoice.id);
      generatePDFBlob().then(blob => {
        if (blob) {
          console.log("Preview blob generated successfully");
          setPdfPreviewBlob(blob);
          
          // If no Firebase URL exists, upload to Firebase using the same blob
          if (!invoice.pdfUrl) {
            console.log("No Firebase URL exists, uploading PDF...");
            generatePDF(blob);
          } else {
            console.log("Firebase URL exists, skipping upload. Preview blob ready.");
            setPdfGenerated(true); // Mark as generated since we have the blob for preview
          }
        }
      });
    }
  }, [invoice, pdfGenerating, pdfGenerated, pdfPreviewBlob]);

  const generatePDFBlob = async (): Promise<Blob | null> => {
    if (!invoice) return null;
    
    try {
      console.log("Starting direct PDF generation for invoice:", invoice.invoiceId || invoice.id);
      
      // Create PDF directly using jsPDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 20; // 20mm margin
      const contentWidth = pageWidth - (2 * margin);
      
      // Helper function to format numbers
      const formatNumber = (num: number) => num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      
      // Helper function to format date
      const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      };
      
      // Helper function to get fuel type name
      const getFuelTypeDisplayName = (item: InvoiceItem) => {
        if (item.fuelTypeName) {
          return item.fuelTypeName.replace(/\s*\(Rs\.\s*[\d.]+\/L\)\s*$/, '').trim();
        }
        return item.fuelType || "Unknown Fuel Type";
      };
      
      let yPosition = margin;
      
      // Header - Company Name
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      const companyName = invoice.userProfile.companyName;
      const companyNameWidth = pdf.getStringUnitWidth(companyName) * 20 / pdf.internal.scaleFactor;
      pdf.text(companyName, (pageWidth - companyNameWidth) / 2, yPosition);
      yPosition += 10;
      
      // Header - Address and Contact
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      const address = invoice.userProfile.address;
      const addressWidth = pdf.getStringUnitWidth(address) * 11 / pdf.internal.scaleFactor;
      pdf.text(address, (pageWidth - addressWidth) / 2, yPosition);
      yPosition += 6;
      
      const contact = `Tel: ${invoice.userProfile.phone} | ${invoice.userProfile.email}`;
      const contactWidth = pdf.getStringUnitWidth(contact) * 11 / pdf.internal.scaleFactor;
      pdf.text(contact, (pageWidth - contactWidth) / 2, yPosition);
      yPosition += 6;
      
      const vatInfo = `VAT No: ${invoice.userProfile.vatNumber}`;
      const vatInfoWidth = pdf.getStringUnitWidth(vatInfo) * 11 / pdf.internal.scaleFactor;
      pdf.text(vatInfo, (pageWidth - vatInfoWidth) / 2, yPosition);
      yPosition += 20;
      
      // Invoice Information Section
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Invoice ID:', margin, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(invoice.invoiceId || invoice.id, margin + 30, yPosition);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Bill To:', margin + 105, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(invoice.companyName, margin + 125, yPosition);
      yPosition += 6;
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Date:', margin, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(formatDate(invoice.invoiceDate), margin + 30, yPosition);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('VAT No:', margin + 105, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.text(invoice.companyVatNumber, margin + 125, yPosition);
      yPosition += 20;
      
      // Table Header
      const tableTop = yPosition;
      const colWidths = [70, 25, 35, 40]; // Column widths in mm - adjusted for better spacing
      const headers = ['Fuel Type', 'Qty (L)', 'Rate ex-VAT', 'Amount ex-VAT'];
      
      // Draw header background and borders
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, tableTop, contentWidth, 8, 'F');
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.rect(margin, tableTop, contentWidth, 8);
      
      // Header text
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      let xPos = margin + 2;
      headers.forEach((header, index) => {
        if (index === 0) {
          pdf.text(header, xPos, tableTop + 5.5);
        } else {
          // Right align numbers with proper padding
          const headerWidth = pdf.getStringUnitWidth(header) * 10 / pdf.internal.scaleFactor;
          pdf.text(header, xPos + colWidths[index] - headerWidth - 3, tableTop + 5.5);
        }
        if (index < headers.length - 1) {
          pdf.line(xPos + colWidths[index], tableTop, xPos + colWidths[index], tableTop + 8);
        }
        xPos += colWidths[index];
      });
      
      yPosition = tableTop + 8;
      
      // Table Rows
      pdf.setFont('helvetica', 'normal');
      invoice.items.forEach((item, index) => {
        // Draw row border
        pdf.rect(margin, yPosition, contentWidth, 7);
        
        // Row data
        xPos = margin + 2;
        const rowData = [
          getFuelTypeDisplayName(item),
          formatNumber(item.quantityLitres),
          formatNumber(item.marketRate),
          formatNumber(item.amount)
        ];
        
        rowData.forEach((data, colIndex) => {
          if (colIndex === 0) {
            pdf.text(data, xPos, yPosition + 4.5);
          } else {
            // Right align numbers with proper padding
            const dataWidth = pdf.getStringUnitWidth(data) * 10 / pdf.internal.scaleFactor;
            pdf.text(data, xPos + colWidths[colIndex] - dataWidth - 3, yPosition + 4.5);
          }
          
          // Draw column separator
          if (colIndex < rowData.length - 1) {
            pdf.line(xPos + colWidths[colIndex], yPosition, xPos + colWidths[colIndex], yPosition + 7);
          }
          xPos += colWidths[colIndex];
        });
        
        yPosition += 7;
      });
      
      yPosition += 15;
      
      // Totals Section - Aligned to right edge of table
      const tableRightEdge = margin + contentWidth;
      const totalsWidth = 50; // Width of totals section
      const totalsLeftStart = tableRightEdge - totalsWidth;
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Sub-total:', totalsLeftStart, yPosition);
      pdf.setFont('helvetica', 'normal');
      const subTotalText = formatNumber(invoice.subTotal);
      const subTotalWidth = pdf.getStringUnitWidth(subTotalText) * 10 / pdf.internal.scaleFactor;
      pdf.text(subTotalText, tableRightEdge - subTotalWidth, yPosition);
      yPosition += 6;
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('VAT 18%:', totalsLeftStart, yPosition);
      pdf.setFont('helvetica', 'normal');
      const vatText = formatNumber(invoice.vat18);
      const vatWidth = pdf.getStringUnitWidth(vatText) * 10 / pdf.internal.scaleFactor;
      pdf.text(vatText, tableRightEdge - vatWidth, yPosition);
      yPosition += 6;
      
      // Total line - aligned with totals section
      pdf.setLineWidth(1);
      pdf.line(totalsLeftStart, yPosition, tableRightEdge, yPosition);
      yPosition += 6;
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Total:', totalsLeftStart, yPosition);
      const totalText = formatNumber(invoice.total);
      const totalWidth = pdf.getStringUnitWidth(totalText) * 10 / pdf.internal.scaleFactor;
      pdf.text(totalText, tableRightEdge - totalWidth, yPosition);
      
      // Footer
      yPosition = pageHeight - 40;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'italic');
      const footerText = 'This is a computer generated invoice. No signature required. Thank you for choosing us!';
      const footerWidth = pdf.getStringUnitWidth(footerText) * 9 / pdf.internal.scaleFactor;
      pdf.text(footerText, (pageWidth - footerWidth) / 2, yPosition);
      
      console.log("Direct PDF generation completed successfully!");
      
      // Return as blob
      return pdf.output('blob');
      
    } catch (err) {
      console.error("Error generating PDF blob:", err);
      return null;
    }
  };

  const generatePDF = async (existingBlob?: Blob) => {
    if (!invoice || !user) return;
    
    // Check if Firebase is properly initialized
    if (!db || !storage) {
      console.error("Firebase services not available");
      setPdfGenerating(false);
      return;
    }
    
    try {
      setPdfGenerating(true);
      
      // Use existing blob if provided, otherwise generate new one
      const pdfBlob = existingBlob || await generatePDFBlob();
      if (!pdfBlob) {
        console.error("Failed to generate PDF blob");
        setPdfGenerating(false);
        return;
      }
      
      // Set preview blob for immediate viewing if not already set
      if (!pdfPreviewBlob) {
        setPdfPreviewBlob(pdfBlob);
      }
      
      // Convert blob to data URL for Firebase upload
      const reader = new FileReader();
      const pdfDataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });
      
      // Upload PDF to Firebase Storage
      const pdfFileName = `invoices/${user.uid}/${new Date().getTime()}_${invoice.id}.pdf`;
      const storageRef = ref(storage, pdfFileName);
      
      // Upload PDF as data URL
      await uploadString(storageRef, pdfDataUrl, 'data_url');
      
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
      <div className="min-h-screen bg-gray-50">
        <PageContainer className="py-4 md:py-8">
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6" role="alert">
            <p>{error}</p>
          </div>
          <Link 
            href="/dashboard" 
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Back to Dashboard
          </Link>
        </PageContainer>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

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
      <div className="print:hidden">
        <PageContainer size="xl" className="py-4 md:py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold">Invoice</h1>
            <Link 
              href="/dashboard" 
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
            >
              Back
            </Link>
          </div>

          {/* Three Sleek Action Buttons */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {/* Download PDF Button */}
            {invoice.pdfUrl && !pdfGenerating ? (
              <a
                href={invoice.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={`invoice-${invoice.invoiceId || invoice.id}.pdf`}
                className="flex flex-col items-center justify-center p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-colors duration-200 no-underline"
              >
                <Download className="h-5 w-5 mb-1" />
                <span className="text-sm font-medium">Download Invoice</span>
                <span className="text-xs opacity-90">Save as PDF</span>
              </a>
            ) : (
              <button
                onClick={handleDownloadPdf}
                disabled={pdfGenerating}
                className="flex flex-col items-center justify-center p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg shadow-md transition-colors duration-200 disabled:cursor-not-allowed"
              >
                {pdfGenerating ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mb-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm font-medium">Generating...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5 mb-1" />
                    <span className="text-sm font-medium">Download Invoice</span>
                    <span className="text-xs opacity-90">Save as PDF</span>
                  </>
                )}
              </button>
            )}

            {/* Share on WhatsApp Button */}
            <button
              onClick={handleShareWhatsApp}
              disabled={sharingWhatsapp || pdfGenerating}
              className="flex flex-col items-center justify-center p-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg shadow-md transition-colors duration-200 disabled:cursor-not-allowed"
            >
              {sharingWhatsapp ? (
                <>
                  <svg className="animate-spin h-5 w-5 mb-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm font-medium">Sharing...</span>
                </>
              ) : (
                <>
                  <MessageCircle className="h-5 w-5 mb-1" />
                  <span className="text-sm font-medium">Share on WhatsApp</span>
                  <span className="text-xs opacity-90">Send to client</span>
                </>
              )}
            </button>

            {/* Email to Client Button */}
            <button
              onClick={handleEmailClient}
              className="flex flex-col items-center justify-center p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-md transition-colors duration-200"
            >
              <Mail className="h-5 w-5 mb-1" />
              <span className="text-sm font-medium">Email to Client</span>
              <span className="text-xs opacity-90">Send via email</span>
            </button>
          </div>
        </PageContainer>
      </div>
      
      {/* PDF Viewer Container */}
      <PageContainer className="pb-8">
          <PDFViewer
            pdfUrl={invoice.pdfUrl}
            pdfBlob={pdfPreviewBlob || undefined}
            title={`Invoice ${invoice.invoiceId || invoice.id}`}
            loading={pdfGenerating}
          />
        </PageContainer>

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