import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { emails, invoiceId, companyName, pdfBuffer } = await request.json();

    // Validate required fields
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: "Email addresses are required" },
        { status: 400 }
      );
    }

    if (!invoiceId || !companyName) {
      return NextResponse.json(
        { error: "Invoice ID and company name are required" },
        { status: 400 }
      );
    }

    if (!pdfBuffer) {
      return NextResponse.json(
        { error: "PDF buffer is required" },
        { status: 400 }
      );
    }

    // Use the base64 PDF buffer directly as per Resend docs
    const pdfData = pdfBuffer;

    // Email template content
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #7c3aed; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">VAT Invoice</h1>
          <p style="margin: 5px 0 0 0;">From ${companyName}</p>
        </div>
        
        <div style="padding: 30px 20px; background-color: #f9fafb;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            Dear Customer,
          </p>
          
          <p style="color: #374151; line-height: 1.6;">
            Please find attached your VAT invoice <strong>#${invoiceId}</strong> from ${companyName}.
          </p>
          
          <p style="color: #374151; line-height: 1.6;">
            If you have any questions about this invoice, please don't hesitate to contact us.
          </p>
          
          <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #374151;">Invoice Details</h3>
            <p style="margin: 5px 0; color: #6b7280;"><strong>Invoice ID:</strong> ${invoiceId}</p>
            <p style="margin: 5px 0; color: #6b7280;"><strong>From:</strong> ${companyName}</p>
          </div>
          
          <p style="color: #374151; line-height: 1.6;">
            Thank you for your business!
          </p>
          
          <p style="color: #374151; margin-top: 30px;">
            Best regards,<br/>
            <strong>${companyName}</strong>
          </p>
        </div>
        
        <div style="background-color: #374151; color: #9ca3af; padding: 20px; text-align: center; font-size: 14px;">
          <p style="margin: 0;">
            This is an automated email. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;

    // Send email using Resend - use verified domain
    const { data, error } = await resend.emails.send({
      from: `${companyName} <invoices@easyvat.lk>`,
      to: emails,
      subject: `VAT Invoice from ${companyName}`,
      html: emailContent,
      attachments: [
        {
          filename: `invoice-${invoiceId}.pdf`,
          content: pdfData,
        },
      ],
    });

    if (error) {
      console.error("Resend error:", error);
      
      // Return more specific error messages based on Resend error types
      let errorMessage = "Failed to send email";
      if (error.message?.includes("only send testing emails")) {
        errorMessage = error.message;
      } else if (error.message?.includes("domain is not verified")) {
        errorMessage = error.message;
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      messageId: data?.id,
      message: `Email sent successfully to ${emails.length} recipient(s)` 
    });

  } catch (error) {
    console.error("Email API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 