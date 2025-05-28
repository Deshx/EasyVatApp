import { PageContainer } from "@/components/ui/page-container";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsAndConditions() {
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
          <h1 className="text-3xl font-bold mb-8 text-gray-900">Terms and Conditions</h1>
          <div className="prose prose-gray max-w-none">
            <p className="text-lg mb-6">
              Welcome to EasyVat. These Terms and Conditions govern your use of our VAT invoice management platform and 
              the services we provide. By accessing and using our website, you agree to comply with these terms. 
              Please read them carefully before proceeding with any transactions or using our services.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">1. Use of the Platform</h2>
            <ul className="list-disc list-inside mb-6 space-y-2">
              <li>You must be at least 18 years old to use our platform or create an account.</li>
              <li>You are responsible for maintaining the confidentiality of your account information, including your username and password.</li>
              <li>You agree to provide accurate and current information during the registration and account setup process.</li>
              <li>You may not use our platform for any unlawful or unauthorized purposes.</li>
              <li>You are responsible for all activities that occur under your account.</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">2. Service Description</h2>
            <p className="mb-4">EasyVat provides the following services:</p>
            <ul className="list-disc list-inside mb-6 space-y-2">
              <li>VAT invoice creation and management</li>
              <li>Receipt scanning and data extraction using AI technology</li>
              <li>Secure storage of invoice and receipt data</li>
              <li>VAT compliance assistance and reporting features</li>
              <li>Integration with payment processing systems</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">3. Subscription and Payments</h2>
            <ul className="list-disc list-inside mb-6 space-y-2">
              <li>Access to our platform requires a valid subscription plan.</li>
              <li>Subscription fees are charged in advance on a recurring basis (monthly or annually as selected).</li>
              <li>You agree to provide valid and up-to-date payment information and authorize us to charge subscription fees to your chosen payment method.</li>
              <li>We use trusted third-party payment processors to handle your payment information securely.</li>
              <li>We reserve the right to modify subscription pricing with 30 days advance notice.</li>
              <li>Failed payments may result in suspension or termination of your account.</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">4. Data and Content</h2>
            <ul className="list-disc list-inside mb-6 space-y-2">
              <li>You retain ownership of all data and content you upload to our platform.</li>
              <li>You grant us a license to process, store, and analyze your data to provide our services.</li>
              <li>You are responsible for ensuring the accuracy of data you input into the system.</li>
              <li>We are not liable for any errors in VAT calculations resulting from incorrect input data.</li>
              <li>You agree not to upload any content that violates applicable laws or infringes on third-party rights.</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">5. Service Availability</h2>
            <ul className="list-disc list-inside mb-6 space-y-2">
              <li>We strive to maintain 99.9% uptime but cannot guarantee uninterrupted service availability.</li>
              <li>We may perform scheduled maintenance with advance notice when possible.</li>
              <li>We reserve the right to modify, suspend, or discontinue services with reasonable notice.</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">6. User Responsibilities</h2>
            <ul className="list-disc list-inside mb-6 space-y-2">
              <li>You are responsible for compliance with all applicable VAT laws and regulations in your jurisdiction.</li>
              <li>You must maintain backup copies of important data and cannot rely solely on our platform for data storage.</li>
              <li>You agree to use the platform in accordance with all applicable laws and regulations.</li>
              <li>You will not attempt to reverse engineer, hack, or compromise the security of our platform.</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">7. Intellectual Property</h2>
            <ul className="list-disc list-inside mb-6 space-y-2">
              <li>All content and materials on our platform, including but not limited to text, images, logos, and software, are protected by intellectual property rights and are the property of EasyVat or its licensors.</li>
              <li>You may not use, reproduce, distribute, or modify any content from our platform without our prior written consent.</li>
              <li>Our trademarks and service marks may not be used without permission.</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">8. Limitation of Liability</h2>
            <ul className="list-disc list-inside mb-6 space-y-2">
              <li>In no event shall EasyVat, its directors, employees, or affiliates be liable for any direct, indirect, incidental, special, or consequential damages arising out of or in connection with your use of our platform.</li>
              <li>We make no warranties or representations, express or implied, regarding the accuracy, completeness, or suitability of the services offered on our platform.</li>
              <li>Our total liability shall not exceed the amount you have paid for the services in the 12 months preceding the claim.</li>
              <li>We are not responsible for any tax penalties or legal issues arising from incorrect use of our platform.</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">9. Termination</h2>
            <ul className="list-disc list-inside mb-6 space-y-2">
              <li>You may terminate your account at any time by contacting customer support.</li>
              <li>We may suspend or terminate your account for violation of these terms or non-payment.</li>
              <li>Upon termination, you will lose access to your account and data stored on our platform.</li>
              <li>We will provide a reasonable opportunity to export your data before account termination.</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">10. Governing Law</h2>
            <p className="mb-6">
              These Terms and Conditions shall be governed by and construed in accordance with the laws of the jurisdiction 
              in which EasyVat operates. Any disputes arising from these terms shall be subject to the exclusive jurisdiction 
              of the courts in that jurisdiction.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">11. Amendments and Updates</h2>
            <p className="mb-6">
              We reserve the right to modify, update, or revise these Terms and Conditions at any time. Material changes 
              will be communicated to users with at least 30 days advance notice. Continued use of the platform after 
              changes take effect constitutes acceptance of the revised terms.
            </p>

            <h2 className="text-2xl font-semibold mt-8 mb-4 text-gray-900">12. Contact Information</h2>
            <p className="mb-6">
              If you have any questions or concerns regarding these Terms and Conditions, please contact our customer 
              support team using the information provided on our website.
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