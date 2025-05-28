'use client';

import Link from 'next/link';

export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Cancel Icon */}
        <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Payment Cancelled
        </h1>

        <p className="text-gray-600 mb-6">
          Your payment was cancelled and no charges were made. Your subscription was not activated.
        </p>

        <div className="space-y-4">
          <div className="bg-yellow-50 rounded-lg p-4 text-left">
            <h3 className="font-semibold text-yellow-900 mb-2">Need help?</h3>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Try the payment process again</li>
              <li>• Contact support if you&apos;re experiencing issues</li>
              <li>• Check your payment method details</li>
              <li>• Ensure your card has sufficient funds</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/subscription"
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-center"
            >
              Try Again
            </Link>
            <Link
              href="/dashboard"
              className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 font-medium text-center"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            If you continue to experience payment issues, please contact our support team for assistance.
          </p>
        </div>
      </div>
    </div>
  );
} 