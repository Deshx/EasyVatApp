"use client";

import { useState } from "react";
import { X, Mail, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (emails: string[]) => Promise<void>;
  invoiceId: string;
  companyName: string;
}

export default function EmailModal({ 
  isOpen, 
  onClose, 
  onSend, 
  invoiceId, 
  companyName 
}: EmailModalProps) {
  const [emailInput, setEmailInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);

  if (!isOpen) return null;

  const handleSend = async () => {
    setError(null);
    setSuccess(null);
    setShowNotification(false);
    
    // Validate email input
    const emailString = emailInput.trim();
    if (!emailString) {
      setError("Please enter at least one email address");
      return;
    }

    // Split emails by comma and validate
    const emails = emailString
      .split(",")
      .map(email => email.trim())
      .filter(email => email.length > 0);

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter(email => !emailRegex.test(email));
    
    if (invalidEmails.length > 0) {
      setError(`Invalid email addresses: ${invalidEmails.join(", ")}`);
      return;
    }

    try {
      setSending(true);
      await onSend(emails);
      
      // Show success notification
      setSuccess(`Email sent successfully to ${emails.length} recipient(s)!`);
      setShowNotification(true);
      setEmailInput("");
      
      // Note: Modal will be closed by parent component after showing toast
      
    } catch (err: any) {
      console.error("Error sending email:", err);
      
      // Handle specific Resend validation errors
      const errorMessage = err.message;
      if (errorMessage.includes("only send testing emails to your own email address")) {
        setError("⚠️ Development Mode: You can only send emails to thehowtofeed@gmail.com. To send to other recipients, verify a domain at resend.com/domains");
      } else if (errorMessage.includes("domain is not verified")) {
        setError("⚠️ Domain not verified. Please verify your domain at resend.com/domains");
      } else {
        setError("Failed to send email. Please try again.");
      }
      setShowNotification(true);
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      setEmailInput("");
      setError(null);
      setSuccess(null);
      setShowNotification(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Mail className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Email Invoice</h2>
              <p className="text-sm text-gray-500">Send invoice #{invoiceId}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={sending}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Notification Banner */}
        {showNotification && (success || error) && (
          <div className={`mx-6 mt-4 p-4 rounded-lg border ${
            success 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-start gap-3">
              {success ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {success ? 'Success!' : 'Error'}
                </p>
                <p className="text-sm mt-1">
                  {success || error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="p-6">
          <div className="mb-4">
            <label htmlFor="emails" className="block text-sm font-medium text-gray-700 mb-2">
              Email addresses
            </label>
            <textarea
              id="emails"
              rows={3}
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Enter email addresses separated by commas
e.g., client@example.com, another@example.com"
              disabled={sending}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-purple-500 focus:border-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">
              Separate multiple email addresses with commas
            </p>
          </div>

          {error && !showNotification && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Email Preview</h3>
            <p className="text-sm text-gray-600">
              <strong>Subject:</strong> VAT Invoice from {companyName}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Attachment:</strong> invoice-{invoiceId}.pdf
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-lg">
          <button
            onClick={handleClose}
            disabled={sending}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !emailInput.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4" />
                Send Email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 