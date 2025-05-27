import { NextRequest, NextResponse } from 'next/server';
import { onepayService, OnePayCallbackData } from '@/lib/services/onepayService';
import { paymentService } from '@/lib/services/paymentService';

export async function POST(request: NextRequest) {
  try {
    const callbackData: OnePayCallbackData = await request.json();

    console.log('OnePay callback received:', {
      transaction_id: callbackData.transaction_id,
      status: callbackData.status,
      status_message: callbackData.status_message,
      additional_data: callbackData.additional_data
    });

    // Process the payment based on status
    await processPaymentCallback(callbackData);

    // Return success response to OnePay
    return NextResponse.json({ status: 'OK' });

  } catch (error) {
    console.error('OnePay callback processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process callback' },
      { status: 500 }
    );
  }
}

async function processPaymentCallback(data: OnePayCallbackData) {
  const userId = data.additional_data; // We stored userId in additional_data
  
  console.log(`Processing OnePay callback for user ${userId}:`, {
    transactionId: data.transaction_id,
    status: data.status,
    statusMessage: data.status_message
  });

  try {
    if (onepayService.isPaymentSuccessful(data.status)) {
      // Payment successful
      console.log('Payment successful:', {
        transactionId: data.transaction_id,
        userId: userId,
        statusMessage: data.status_message
      });
      
      // Get global settings to determine amount
      const settings = await paymentService.getGlobalSettings();
      
      // Process successful payment using payment service
      await paymentService.processSuccessfulPayment(
        userId,
        data.transaction_id,
        settings.subscriptionAmount
      );
      
      console.log('Payment processed successfully for user:', userId);
      
    } else {
      // Payment failed or pending
      console.log('Payment failed or pending:', {
        transactionId: data.transaction_id,
        userId: userId,
        status: data.status,
        statusMessage: data.status_message
      });
      
      // Record failed payment
      await paymentService.recordPayment({
        userId: userId,
        transactionId: data.transaction_id,
        amount: 0, // Amount not available in failed callback
        currency: 'LKR',
        status: data.status === 0 ? 'pending' : 'failed',
        paymentMethod: 'onepay',
        description: `Payment ${data.status === 0 ? 'pending' : 'failed'}: ${data.status_message}`,
        metadata: { 
          onePayStatus: data.status,
          statusMessage: data.status_message 
        }
      });
    }
  } catch (error) {
    console.error('Error processing OnePay callback:', error);
    // Don't throw here as we want to return success to OnePay
    // Log the error for investigation
    try {
      await paymentService.recordPayment({
        userId: userId || 'unknown',
        transactionId: data.transaction_id,
        amount: 0,
        currency: 'LKR',
        status: 'failed',
        paymentMethod: 'onepay',
        description: 'Payment processing failed due to system error',
        metadata: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          onePayStatus: data.status,
          statusMessage: data.status_message 
        }
      });
    } catch (logError) {
      console.error('Failed to log payment error:', logError);
    }
  }
} 