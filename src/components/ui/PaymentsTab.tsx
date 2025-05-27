'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { paymentService } from '@/lib/services/paymentService';
import { UserSubscription, PaymentHistory, GlobalSettings } from '@/lib/types/payment';
import Script from 'next/script';

// Declare global OnePay functions
declare global {
  interface Window {
    onePayData: any;
    onePaySubscription: () => void;
  }
}

export function PaymentsTab() {
  const { user, hasActiveSubscription, subscriptionLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [onePayLoaded, setOnePayLoaded] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  // Add error boundary to catch any unhandled errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Unhandled error in PaymentsTab:', event.error);
      // Prevent the error from bubbling up and potentially opening dev console
      event.preventDefault();
      return true;
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection in PaymentsTab:', event.reason);
      // Prevent the error from bubbling up
      event.preventDefault();
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  useEffect(() => {
    // Listen for OnePay success events
    const handleSuccess = (event: any) => {
      try {
        alert('Payment successful! Your subscription has been renewed.');
        loadUserData(); // Refresh data
      } catch (error) {
        console.error('Error handling payment success:', error);
      }
    };

    // Listen for OnePay failure events
    const handleFail = (event: any) => {
      try {
        alert('Payment failed! Please try again or contact support.');
        loadUserData(); // Refresh data to show any recorded attempts
      } catch (error) {
        console.error('Error handling payment failure:', error);
      }
    };

    window.addEventListener('onePaySuccess', handleSuccess);
    window.addEventListener('onePayFail', handleFail);

    return () => {
      window.removeEventListener('onePaySuccess', handleSuccess);
      window.removeEventListener('onePayFail', handleFail);
    };
  }, []);

  const loadUserData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [subscriptionData, historyData, settingsData] = await Promise.all([
        paymentService.getUserSubscription(user.uid),
        paymentService.getUserPaymentHistory(user.uid, 20),
        paymentService.getGlobalSettings()
      ]);

      setSubscription(subscriptionData);
      setPaymentHistory(historyData);
      setGlobalSettings(settingsData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load user data';
      console.error('Error loading user data:', errorMessage);
      // Don't show alert for this as it's called automatically
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubscription = async () => {
    if (!user || !globalSettings) {
      alert('Please ensure you are logged in and try again.');
      return;
    }

    setLoading(true);
    setSubscriptionData(null);

    try {
      const customerData = {
        firstName: user.displayName?.split(' ')[0] || 'User',
        lastName: user.displayName?.split(' ').slice(1).join(' ') || 'Account',
        email: user.email || '',
        phone: '0771234567', // TODO: Get from user profile
        userId: user.uid
      };

      const response = await fetch('/api/onepay/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(customerData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create subscription');
      }

      setSubscriptionData(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Subscription creation error:', errorMessage);
      alert('Error creating subscription: ' + errorMessage);
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
      // Ensure OnePay data is valid
      if (!subscriptionData.onePayData) {
        throw new Error('Invalid subscription data received');
      }

      // Set the global onePayData
      window.onePayData = subscriptionData.onePayData;
      
      // Trigger the subscription process
      if (typeof window.onePaySubscription === 'function') {
        window.onePaySubscription();
      } else {
        throw new Error('OnePay subscription function not available. Please refresh the page and try again.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error processing subscription';
      console.error('OnePay subscription error:', errorMessage);
      alert('Error processing subscription: ' + errorMessage);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      trial: 'bg-blue-100 text-blue-800'
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusBadge = (status: string) => {
    const badges = {
      success: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-LK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (subscriptionLoading || loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <>
      <Script 
        src="https://storage.googleapis.com/onepayjs/onepayjs.js"
        onLoad={() => {
          console.log('OnePay script loaded successfully');
          setOnePayLoaded(true);
        }}
        onError={(e) => {
          console.error('Failed to load OnePay script:', e);
          setOnePayLoaded(false);
        }}
        strategy="lazyOnload"
      />

      <div className="space-y-6">
        {/* Subscription Status */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Subscription Status</h3>
          
          {subscription ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(subscription.status)}`}>
                  {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Plan:</span>
                <span className="text-sm">LKR {subscription.amount.toLocaleString()} / {subscription.interval.toLowerCase()}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Valid Until:</span>
                <span className="text-sm">{formatDate(subscription.endDate)}</span>
              </div>
              
              {subscription.status !== 'active' && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">
                    Your subscription is not active. Please make a payment to continue using the service.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700">
                No subscription found. A default subscription will be created when you make your first payment.
              </p>
            </div>
          )}
        </div>

        {/* Payment Section */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Make Payment</h3>
          
          {globalSettings && (
            <div className="mb-6">
              <div className="text-2xl font-bold text-gray-900">
                LKR {globalSettings.subscriptionAmount.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Monthly Subscription</div>
            </div>
          )}

          <div className="mb-4">
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
              onClick={(e) => {
                e.preventDefault();
                handleCreateSubscription();
              }}
              disabled={loading || !onePayLoaded}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
            >
              {loading ? 'Setting up payment...' : 'Pay Now'}
            </button>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">✅ Payment Ready</h4>
                <p className="text-green-700 text-sm">Your payment has been prepared. Click below to complete the transaction.</p>
              </div>
              
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleProcessSubscription();
                }}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 font-medium transition-colors"
              >
                Complete Payment
              </button>
            </div>
          )}
        </div>

        {/* Payment History */}
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Payment History</h3>
          
          {paymentHistory.length > 0 ? (
            <div className="space-y-3">
              {paymentHistory.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-medium text-sm">{payment.description}</div>
                    <div className="text-xs text-gray-500">
                      {formatDate(payment.createdAt)} • {payment.transactionId}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-sm">
                      {payment.amount > 0 ? `LKR ${payment.amount.toLocaleString()}` : '-'}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadge(payment.status)}`}>
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No payment history found.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
} 