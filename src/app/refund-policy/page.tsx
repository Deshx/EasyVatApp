import { PageContainer } from "@/components/ui/page-container";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RefundPolicy() {
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
          <h1 className="text-3xl font-bold mb-8 text-gray-900">Refund Policy</h1>
          <div className="prose prose-gray max-w-none">
            <p className="text-lg mb-6">
              Thank you for choosing EasyVat for your VAT invoice management needs. We value your satisfaction and strive 
              to provide you with the best service possible. If, for any reason, you are not completely satisfied with 
              your subscription, we are here to help.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">Subscription Cancellations</h2>
            <p className="mb-4">You may cancel your subscription at any time through your account settings or by contacting our customer support team. The following terms apply:</p>
            <ul className="list-disc list-inside mb-6 space-y-2">
              <li>Monthly subscriptions can be cancelled at any time and will remain active until the end of the current billing period.</li>
              <li>Annual subscriptions can be cancelled at any time and will remain active until the end of the current billing year.</li>
              <li>No partial refunds are provided for unused portions of monthly or annual subscriptions under normal circumstances.</li>
              <li>Upon cancellation, you will retain access to all features until your current billing period expires.</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">Refund Eligibility</h2>
            <p className="mb-4">We offer refunds under the following circumstances:</p>
            <ul className="list-disc list-inside mb-6 space-y-2">
              <li><strong>New Subscriptions:</strong> Full refund available within 14 days of initial subscription if you have used less than 10% of your monthly invoice limit.</li>
              <li><strong>Service Unavailability:</strong> Pro-rated refunds for extended service outages exceeding 48 consecutive hours.</li>
              <li><strong>Billing Errors:</strong> Full refund for any charges made in error, including duplicate charges or incorrect pricing.</li>
              <li><strong>Technical Issues:</strong> Refund consideration for substantial service defects that prevent normal platform usage.</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">Refund Process</h2>
            <p className="mb-4">To request a refund, please follow these steps:</p>
            <ol className="list-decimal list-inside mb-6 space-y-2">
              <li>Contact our customer support team with your refund request within the applicable timeframe.</li>
              <li>Provide your account information and reason for the refund request.</li>
              <li>Allow our team to review your request and attempt to resolve any issues.</li>
              <li>If approved, refunds will be processed to your original payment method within 5-10 business days.</li>
            </ol>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">Non-Refundable Items</h2>
            <p className="mb-4">The following are not eligible for refunds:</p>
            <ul className="list-disc list-inside mb-6 space-y-2">
              <li>Subscriptions that have been active for more than 14 days (except in cases of service unavailability or billing errors)</li>
              <li>Accounts that have exceeded the usage limits for refund eligibility</li>
              <li>Custom enterprise plans and professional services</li>
              <li>Third-party add-on services or integrations</li>
              <li>Refunds requested due to changes in business requirements or financial circumstances</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">Data Export and Account Closure</h2>
            <p className="mb-4">Before processing any refund that results in account closure:</p>
            <ul className="list-disc list-inside mb-6 space-y-2">
              <li>We will provide you with the opportunity to export your data within 30 days of refund approval.</li>
              <li>All data stored on our platform will be permanently deleted after the export period expires.</li>
              <li>You are responsible for downloading and securing your invoice and receipt data before account closure.</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">Subscription Modifications</h2>
            <p className="mb-6">
              As an alternative to refunds, we offer subscription modifications including plan downgrades, upgrades, 
              or temporary suspensions. Please contact our customer support team to discuss available options that 
              may better meet your needs.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">Chargeback Policy</h2>
            <p className="mb-6">
              If you initiate a chargeback or dispute through your payment provider instead of contacting us directly, 
              your account will be immediately suspended. We encourage you to contact our customer support team first 
              to resolve any billing concerns, as this often leads to faster resolution.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">Fair Usage Policy</h2>
            <p className="mb-6">
              Refund requests will be evaluated based on fair usage principles. Accounts showing patterns of 
              subscription abuse, including repeated subscription and refund cycles, may be denied refunds and 
              banned from future use of the platform.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">Processing Time</h2>
            <p className="mb-6">
              Refund requests will be reviewed and processed within 5-7 business days after we receive your request. 
              Approved refunds will be credited to your original payment method within 5-10 business days, though 
              actual processing time may vary depending on your payment provider.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">Currency and International Payments</h2>
            <p className="mb-6">
              Refunds will be processed in the same currency as the original payment. Please note that currency 
              exchange rates may have changed between the time of payment and refund, and any differences are 
              the responsibility of the customer.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">Contact Us</h2>
            <p className="mb-6">
              If you have any questions or concerns regarding our refund policy, or if you would like to request 
              a refund, please contact our customer support team. We are committed to working with you to ensure 
              your satisfaction and will make every effort to resolve any issues you may have.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">Policy Updates</h2>
            <p className="mb-6">
              We reserve the right to update this Refund Policy at any time. Any changes will be posted on this 
              page with a revised date. We encourage you to review this policy periodically to stay informed 
              about our refund procedures.
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