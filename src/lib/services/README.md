# Email Service

This module provides reusable email functionality for sending invoices with PDF attachments using Resend.

## Components

### EmailModal
A reusable modal component for collecting email addresses and sending invoices.

**Props:**
- `isOpen: boolean` - Controls modal visibility
- `onClose: () => void` - Callback when modal is closed
- `onSend: (emails: string[]) => Promise<void>` - Callback when send button is clicked
- `invoiceId: string` - The invoice ID to display
- `companyName: string` - Company name for the subject line

### EmailService
A static service class for email operations.

**Methods:**
- `sendInvoiceEmail(params)` - Send invoice email with PDF attachment
- `validateEmails(emails)` - Validate array of email addresses
- `parseEmailString(emailString)` - Parse comma-separated email string

### useEmailInvoice Hook
A React hook that simplifies email sending for invoices.

**Parameters:**
- `invoiceId: string` - The invoice ID
- `companyName: string` - Company name
- `generatePdfBlob: () => Promise<Blob | null>` - Function to generate PDF blob

**Returns:**
- `sendEmail: (emails: string[]) => Promise<EmailResponse>` - Function to send email
- `sending: boolean` - Loading state
- `error: string | null` - Error message if any
- `clearError: () => void` - Function to clear error

## Usage Examples

### Basic Usage with Modal
```tsx
import { useState } from "react";
import EmailModal from "@/components/ui/EmailModal";

function InvoicePage() {
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  
  const handleSendEmail = async (emails: string[]) => {
    // Your email sending logic
  };

  return (
    <>
      <button onClick={() => setEmailModalOpen(true)}>
        Email Invoice
      </button>
      
      <EmailModal
        isOpen={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        onSend={handleSendEmail}
        invoiceId="INV-001"
        companyName="My Company"
      />
    </>
  );
}
```

### Using the Hook
```tsx
import { useEmailInvoice } from "@/lib/hooks/useEmailInvoice";

function InvoiceComponent() {
  const { sendEmail, sending, error } = useEmailInvoice({
    invoiceId: "INV-001",
    companyName: "My Company",
    generatePdfBlob: async () => {
      // Your PDF generation logic
      return pdfBlob;
    }
  });

  const handleSend = async () => {
    try {
      await sendEmail(["client@example.com"]);
      // Success handling
    } catch (err) {
      // Error handling
    }
  };

  return (
    <button onClick={handleSend} disabled={sending}>
      {sending ? "Sending..." : "Send Email"}
    </button>
  );
}
```

### Direct Service Usage
```tsx
import { EmailService } from "@/lib/services/emailService";

async function sendInvoiceDirectly() {
  try {
    const result = await EmailService.sendInvoiceEmail({
      emails: ["client@example.com", "admin@example.com"],
      invoiceId: "INV-001",
      companyName: "My Company",
      pdfBuffer: "base64-encoded-pdf-data"
    });
    
    console.log("Email sent:", result.message);
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}
```

## Environment Variables

Make sure to set the following environment variable in your `.env.local`:

```
RESEND_API_KEY=your_resend_api_key_here
```

## API Endpoint

The service uses the `/api/email/send-invoice` endpoint which:
- Accepts POST requests with email data
- Validates input parameters
- Sends emails using Resend with PDF attachments
- Returns success/error responses

## Email Template

The email includes:
- Professional HTML template with company branding
- Invoice details in a formatted layout
- PDF attachment with filename `invoice-{invoiceId}.pdf`
- Subject line: "VAT Invoice from {companyName}"
- Sender: Uses Resend's verified domain `onboarding@resend.dev` with company name

**Note:** The sender email uses Resend's default verified domain to avoid domain verification issues. The company name will appear as the sender name.

## Attachment Format

The email attachment follows Resend's official documentation format:
- Uses base64 encoded content directly (not converted to Buffer)
- Only requires `filename` and `content` parameters
- Supports PDF files up to 40MB (including base64 encoding overhead)

## Notifications

The email system provides comprehensive user feedback:

### Toast Notifications
- **Success**: Shows when email is sent successfully
- **Error**: Shows when email fails with specific error messages
- **Warning**: Shows for development mode limitations (domain verification)
- Auto-dismisses after 5 seconds or can be manually closed

### Modal Notifications
- **In-modal feedback**: Shows validation errors and sending states
- **Success banner**: Displays confirmation within the modal
- **Error banner**: Shows detailed error information

### Development Mode Limitations
- Free Resend accounts can only send to verified email addresses
- Default sends to: `thehowtofeed@gmail.com`
- To send to other recipients, verify a domain at resend.com/domains 