import { PageContainer } from "@/components/ui/page-container";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <PageContainer className="py-8">
        <div className="mb-6">
          <Button asChild variant="outline" className="mb-4">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-gray-900">Privacy Policy</h1>
          <div className="prose prose-gray max-w-none">
            <p className="text-lg mb-6">
              At EasyVat, we are committed to protecting the privacy and security of our customers&apos; personal information. 
              This Privacy Policy outlines how we collect, use, and safeguard your information when you visit or use our 
              VAT invoice management platform. By using our website, you consent to the practices described in this policy.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">Information We Collect</h2>
            <p className="mb-4">When you visit our website, we may collect certain information about you, including:</p>
            <ul className="list-disc list-inside mb-6 space-y-2">
              <li>Personal identification information (such as your name, email address, and phone number) provided voluntarily by you during the registration or account creation process.</li>
              <li>Business information including company name, VAT registration number, and billing address necessary to generate VAT-compliant invoices.</li>
              <li>Payment and billing information necessary to process subscription payments, including credit card details, which are securely handled by trusted third-party payment processors.</li>
              <li>Receipt and invoice data that you upload or scan through our platform for processing and storage.</li>
              <li>Browsing information, such as your IP address, browser type, and device information, collected automatically using cookies and similar technologies.</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">Use of Information</h2>
            <p className="mb-4">We may use the collected information for the following purposes:</p>
            <ul className="list-disc list-inside mb-6 space-y-2">
              <li>To process and manage your VAT invoices, including data extraction from receipts and invoice generation.</li>
              <li>To communicate with you regarding your account, provide customer support, and respond to inquiries or requests.</li>
              <li>To process subscription payments and manage your account billing.</li>
              <li>To personalize your experience and improve our invoice management features based on your usage patterns.</li>
              <li>To improve our website, products, and services based on your feedback and browsing patterns.</li>
              <li>To detect and prevent fraud, unauthorized activities, and abuse of our platform.</li>
              <li>To comply with legal obligations and VAT reporting requirements where applicable.</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">Information Sharing</h2>
            <p className="mb-4">We respect your privacy and do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except in the following circumstances:</p>
            <ul className="list-disc list-inside mb-6 space-y-2">
              <li><strong>Trusted service providers:</strong> We may share your information with third-party service providers who assist us in operating our website, processing payments, AI-powered receipt processing, and delivering services. These providers are contractually obligated to handle your data securely and confidentially.</li>
              <li><strong>Legal requirements:</strong> We may disclose your information if required to do so by law or in response to valid legal requests or orders.</li>
              <li><strong>Business transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the business transaction.</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">Data Security</h2>
            <p className="mb-6">
              We implement industry-standard security measures to protect your personal information from unauthorized access, 
              alteration, disclosure, or destruction. All data is encrypted in transit and at rest. However, please be aware 
              that no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee 
              absolute security.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">Data Retention</h2>
            <p className="mb-6">
              We retain your personal information for as long as necessary to provide our services and comply with legal 
              obligations. Invoice data may be retained for up to 7 years to comply with VAT record-keeping requirements.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">Cookies and Tracking Technologies</h2>
            <p className="mb-6">
              We use cookies and similar technologies to enhance your browsing experience, analyze website traffic, and 
              gather information about your preferences and interactions with our website. You have the option to disable 
              cookies through your browser settings, but this may limit certain features and functionality of our website.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">Your Rights</h2>
            <p className="mb-4">You have the right to:</p>
            <ul className="list-disc list-inside mb-6 space-y-2">
              <li>Access and review your personal information</li>
              <li>Correct or update your personal information</li>
              <li>Delete your account and associated data</li>
              <li>Export your data in a portable format</li>
              <li>Opt-out of marketing communications</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">Changes to the Privacy Policy</h2>
            <p className="mb-6">
              We reserve the right to update or modify this Privacy Policy at any time. Any changes will be posted on this 
              page with a revised &quot;last updated&quot; date. We encourage you to review this Privacy Policy periodically to stay 
              informed about how we collect, use, and protect your information.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">Contact Us</h2>
            <p className="mb-6">
              If you have any questions, concerns, or requests regarding our Privacy Policy or the handling of your personal 
              information, please contact us using the information provided on our website.
            </p>

            <p className="text-sm text-gray-500 mt-8">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </PageContainer>
    </main>
  );
} 