interface SendInvoiceEmailParams {
  emails: string[];
  invoiceId: string;
  companyName: string;
  pdfBuffer: string; // base64 encoded PDF
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  message?: string;
  error?: string;
}

export class EmailService {
  private static apiEndpoint = '/api/email/send-invoice';

  /**
   * Send invoice email with PDF attachment
   * Note: Attachments must be under 40MB (including base64 encoding)
   */
  static async sendInvoiceEmail(params: SendInvoiceEmailParams): Promise<EmailResponse> {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      return data;
    } catch (error) {
      console.error('Email service error:', error);
      throw error;
    }
  }

  /**
   * Validate email addresses
   */
  static validateEmails(emails: string[]): { valid: string[]; invalid: string[] } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const valid: string[] = [];
    const invalid: string[] = [];

    emails.forEach(email => {
      const trimmedEmail = email.trim();
      if (emailRegex.test(trimmedEmail)) {
        valid.push(trimmedEmail);
      } else if (trimmedEmail.length > 0) {
        invalid.push(trimmedEmail);
      }
    });

    return { valid, invalid };
  }

  /**
   * Parse comma-separated email string into array
   */
  static parseEmailString(emailString: string): string[] {
    return emailString
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0);
  }
} 