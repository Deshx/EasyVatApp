import { SubscriptionForm } from '@/components/SubscriptionForm';

export default function SubscriptionPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            EasyVat Monthly Subscription
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Get unlimited access to all EasyVat features with our monthly subscription plan. 
            Manage your invoices, track expenses, and streamline your business operations.
          </p>
        </div>

        <SubscriptionForm />

        <div className="max-w-4xl mx-auto mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            What's Included
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Unlimited Invoices</h3>
              <p className="text-gray-600">Create and send unlimited invoices to your customers with professional templates.</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Expense Tracking</h3>
              <p className="text-gray-600">Track all your business expenses and get insights into your spending patterns.</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 11-9.75 9.75A9.75 9.75 0 0112 2.25z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI-Powered Features</h3>
              <p className="text-gray-600">Leverage AI for receipt scanning, data extraction, and automated categorization.</p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-lg shadow-md mt-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Billing Information</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Payment Schedule</h4>
                <ul className="text-gray-600 space-y-1">
                  <li>• Monthly billing cycle</li>
                  <li>• First payment due immediately</li>
                  <li>• Subsequent payments on the same date each month</li>
                  <li>• Automatic renewal unless cancelled</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Cancellation</h4>
                <ul className="text-gray-600 space-y-1">
                  <li>• Cancel anytime from account settings</li>
                  <li>• No cancellation fees</li>
                  <li>• Access continues until end of billing period</li>
                  <li>• Email notification of cancellation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 