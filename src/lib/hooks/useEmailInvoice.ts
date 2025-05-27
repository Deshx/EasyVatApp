import { useState } from "react";
import { EmailService } from "@/lib/services/emailService";

interface UseEmailInvoiceParams {
  invoiceId: string;
  companyName: string;
  generatePdfBlob: () => Promise<Blob | null>;
}

export function useEmailInvoice({
  invoiceId,
  companyName,
  generatePdfBlob
}: UseEmailInvoiceParams) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendEmail = async (emails: string[]) => {
    try {
      setSending(true);
      setError(null);

      // Generate PDF blob
      const pdfBlob = await generatePdfBlob();
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

      // Send email
      const result = await EmailService.sendInvoiceEmail({
        emails,
        invoiceId,
        companyName,
        pdfBuffer
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send email";
      setError(errorMessage);
      throw err;
    } finally {
      setSending(false);
    }
  };

  return {
    sendEmail,
    sending,
    error,
    clearError: () => setError(null)
  };
} 