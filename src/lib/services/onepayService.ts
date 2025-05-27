import crypto from 'crypto';

export interface OnePaySubscriptionData {
  orderId: string;
  amount: number;
  currency: 'LKR' | 'USD';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  additionalData?: string;
  userId?: string;
  interval?: 'MONTH' | 'YEAR';
  intervalCount?: number;
  daysUntilDue?: number;
  trialPeriodDays?: number;
}

export interface OnePayTransactionData {
  orderId: string;
  amount: number;
  currency: 'LKR' | 'USD';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  additionalData?: string;
  itemIds?: string[];
}

export interface OnePayCallbackData {
  transaction_id: string;
  status: number;
  status_message: string;
  additional_data?: string;
}

class OnePayService {
  private appId: string;
  private appToken: string;
  private hashSalt: string;
  private appName: string;
  private appDomain: string;

  constructor() {
    this.appId = process.env.ONEPAY_APP_ID!;
    this.appToken = process.env.ONEPAY_APP_TOKEN!;
    this.hashSalt = process.env.ONEPAY_HASH_SALT!;
    this.appName = process.env.ONEPAY_APP_NAME!;
    this.appDomain = process.env.APP_DOMAIN!;

    if (!this.appId || !this.appToken || !this.hashSalt || !this.appName || !this.appDomain) {
      throw new Error('OnePay configuration missing in environment variables');
    }
  }

  /**
   * Generate hash for OnePay transaction
   * Format: app_id + currency + amount + hash_salt
   */
  generateHash(amount: number, currency: string): string {
    const amountFormatted = amount.toFixed(2);
    const hashString = `${this.appId}${currency}${amountFormatted}${this.hashSalt}`;
    
    const hash = crypto
      .createHash('sha256')
      .update(hashString)
      .digest('hex');

    // Debug logging removed to prevent dev console auto-opening
    
    return hash;
  }

  /**
   * Generate unique order reference
   */
  generateOrderReference(userId?: string): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    const prefix = userId ? `SUB_${userId}` : 'TXN';
    return `${prefix}_${timestamp}_${randomSuffix}`;
  }

  /**
   * Get callback URLs
   */
  getCallbackUrls() {
    return {
      transactionRedirectUrl: `${this.appDomain}/payment/success`,
      callbackUrl: `${this.appDomain}/api/onepay/callback`
    };
  }

  /**
   * Create transaction via OnePay API
   */
  async createTransaction(data: OnePayTransactionData): Promise<{
    success: boolean;
    checkoutUrl?: string;
    transactionId?: string;
    error?: string;
  }> {
    try {
      const hash = this.generateHash(data.amount, data.currency);
      const urls = this.getCallbackUrls();

      const requestBody = {
        app_id: this.appId,
        amount: data.amount.toFixed(2),
        currency: data.currency,
        order_reference: data.orderId,
        customer_first_name: data.firstName,
        customer_last_name: data.lastName,
        customer_phone_number: data.phone,
        customer_email: data.email,
        transaction_redirect_url: urls.transactionRedirectUrl,
        additional_data: data.additionalData || '',
        hash: hash,
        ...(data.itemIds && { item_ids: data.itemIds })
      };

      const response = await fetch('https://api.onepay.lk/api/v1/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.appToken
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (response.ok && result.checkout_url) {
        return {
          success: true,
          checkoutUrl: result.checkout_url,
          transactionId: result.transaction_id
        };
      } else {
        console.error('OnePay API Error:', result);
        return {
          success: false,
          error: result.message || 'Failed to create transaction'
        };
      }

    } catch (error) {
      console.error('OnePay transaction creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check transaction status
   */
  async getTransactionStatus(transactionId: string): Promise<{
    success: boolean;
    status?: string;
    data?: any;
    error?: string;
  }> {
    try {
      const response = await fetch(`https://api.onepay.lk/api/v1/transactions/${transactionId}`, {
        headers: {
          'Authorization': this.appToken
        }
      });

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          status: result.status,
          data: result
        };
      } else {
        return {
          success: false,
          error: result.message || 'Failed to get transaction status'
        };
      }

    } catch (error) {
      console.error('OnePay status check error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Format phone number to international format for OnePay
   */
  formatPhoneNumber(phone: string): string {
    // Remove any leading zeros and add Sri Lanka country code
    const cleanPhone = phone.replace(/^0+/, '');
    return `+94${cleanPhone}`;
  }

  /**
   * Prepare subscription data for OnePay JS SDK
   * Based on OnePay subscription documentation - subscription-specific format only
   */
  prepareSubscriptionData(data: OnePaySubscriptionData) {
    const formattedPhone = this.formatPhoneNumber(data.phone);

    // Debug logging removed to prevent dev console auto-opening

    // OnePay JS SDK subscription format - as per documentation + required name field
    return {
      appid: this.appId,
      name: `${data.firstName} ${data.lastName} Subscription`, // Root level name field
      amount: data.amount,
      currency: data.currency,
      interval: data.interval || 'MONTH',
      interval_count: data.intervalCount || 1,
      days_until_due: data.daysUntilDue || 5,
      trial_period_days: data.trialPeriodDays || 0,
      customer_details: {
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone_number: formattedPhone
      },
      apptoken: this.appToken
    };
  }

  /**
   * Check if payment status is successful
   */
  isPaymentSuccessful(status: number): boolean {
    return status === 1;
  }

  /**
   * Get payment status message
   */
  getPaymentStatusMessage(status: number): string {
    switch (status) {
      case 1:
        return 'Payment successful';
      case 0:
        return 'Payment pending';
      case -1:
        return 'Payment failed';
      default:
        return 'Unknown payment status';
    }
  }

  /**
   * Create subscription via OnePay REST API (alternative to OnepayJS)
   */
  async createSubscription(data: OnePaySubscriptionData): Promise<{
    success: boolean;
    subscriptionId?: string;
    checkoutUrl?: string;
    error?: string;
  }> {
    try {
      const formattedPhone = this.formatPhoneNumber(data.phone);
      const urls = this.getCallbackUrls();

      const requestBody = {
        app_id: this.appId,
        name: `${data.firstName} ${data.lastName} Subscription`, // Root level name field
        amount: data.amount.toFixed(2),
        currency: data.currency,
        interval: data.interval || 'MONTH',
        interval_count: data.intervalCount || 1,
        days_until_due: data.daysUntilDue || 5,
        trial_period_days: data.trialPeriodDays || 0,
        customer_details: {
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          phone_number: formattedPhone
        },
        additional_data: data.additionalData || data.userId || '',
        callback_url: urls.callbackUrl,
        return_url: urls.transactionRedirectUrl
      };

      // Debug logging removed to prevent dev console auto-opening

      const response = await fetch('https://api.onepay.lk/v3/subscription/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.appToken
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          subscriptionId: result.subscription_id,
          checkoutUrl: result.checkout_url
        };
      } else {
        console.error('OnePay Direct Subscription API Error:', {
          status: response.status,
          statusText: response.statusText,
          result: result
        });
        return {
          success: false,
          error: result.message || `HTTP ${response.status}: ${response.statusText}`
        };
      }

    } catch (error) {
      console.error('OnePay direct subscription creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const onepayService = new OnePayService(); 