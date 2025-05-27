'use client';

import { useState, useEffect } from 'react';
import Script from 'next/script';

// Declare global OnePay functions
declare global {
  interface Window {
    onePayData: any;
    onePaySubscription: () => void;
  }
}

export default function OnePaySubscriptionPage() {
  const [loading, setLoading] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [onePayLoaded, setOnePayLoaded] = useState(false);

  const customerData = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '0771234567',
    userId: 'customer_001'
  };

  useEffect(() => {
    // Listen for OnePay success events
    const handleSuccess = (event: any) => {
      console.log('OnePay Payment SUCCESS:', event.detail);
      alert('Payment successful! Transaction ID: ' + event.detail.transaction_id);
    };

    // Listen for OnePay failure events
    const handleFail = (event: any) => {
      console.log('OnePay Payment FAIL:', event.detail);
      alert('Payment failed! Transaction ID: ' + event.detail.transaction_id);
    };

    window.addEventListener('onePaySuccess', handleSuccess);
    window.addEventListener('onePayFail', handleFail);

    return () => {
      window.removeEventListener('onePaySuccess', handleSuccess);
      window.removeEventListener('onePayFail', handleFail);
    };
  }, []);

  const handleCreateSubscription = async () => {
    setLoading(true);
    setSubscriptionData(null);

    try {
      const response = await fetch('/api/onepay/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create subscription');
      }

      setSubscriptionData(data);
    } catch (error) {
      console.error('Subscription creation error:', error);
      alert('Error creating subscription: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleProcessSubscription = () => {
    if (!subscriptionData || !onePayLoaded) {
      alert('Please create subscription first and ensure OnePay is loaded');
      return;
    }

    try {
      // Set the global onePayData
      window.onePayData = subscriptionData.onePayData;
      
      // Trigger the subscription process
      if (window.onePaySubscription) {
        window.onePaySubscription();
      } else {
        alert('OnePay subscription function not available');
      }
    } catch (error) {
      console.error('OnePay subscription error:', error);
      alert('Error processing subscription');
    }
  };

  return (
    <>
      <Script 
        src="https://storage.googleapis.com/onepayjs/onepayjs.js"
        onLoad={() => {
          setOnePayLoaded(true);
        }}
        onError={() => {
          console.error('Failed to load OnePay JS script');
          setOnePayLoaded(false);
        }}
      />

      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            EasyVAT Subscription
          </h1>

          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Monthly Subscription - LKR 10,000</h2>
            
            <div className="mb-6">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                onePayLoaded 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {onePayLoaded ? '✓ Payment System Ready' : '⏳ Loading Payment System...'}
              </div>
            </div>
            
            {!subscriptionData ? (
              <button
                onClick={handleCreateSubscription}
                disabled={loading || !onePayLoaded}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {loading ? 'Setting up subscription...' : 'Subscribe Now'}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-900 mb-2">✅ Subscription Ready</h3>
                  <p className="text-green-700 text-sm">Your subscription has been prepared. Click below to complete payment.</p>
                </div>
                
                <button
                  onClick={handleProcessSubscription}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 font-medium"
                >
                  Complete Payment
                </button>
              </div>
            )}
          </div>

          {subscriptionData?.config && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Subscription Details</h2>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>Service:</strong> {subscriptionData.config.appName}</p>
                <p><strong>Amount:</strong> LKR {subscriptionData.config.amount?.toLocaleString()}</p>
                <p><strong>Billing:</strong> Monthly</p>
                <p><strong>Customer:</strong> {customerData.firstName} {customerData.lastName}</p>
                <p><strong>Email:</strong> {customerData.email}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
} 