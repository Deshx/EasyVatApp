import { NextRequest, NextResponse } from 'next/server';
import { onepayService, OnePayCallbackData } from '@/lib/services/onepayService';

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
      
      // TODO: Update your database to record successful payment
      // Example:
      // await recordSuccessfulPayment({
      //   userId: userId,
      //   transactionId: data.transaction_id,
      //   amount: // You'll need to get this from your transaction record
      //   currency: 'LKR',
      //   status: 'success'
      // });
      
    } else {
      // Payment failed or pending
      console.log('Payment failed or pending:', {
        transactionId: data.transaction_id,
        userId: userId,
        status: data.status,
        statusMessage: data.status_message
      });
      
      // TODO: Handle failed/pending payment
      // await handleFailedPayment(userId, data.transaction_id, data.status_message);
    }
  } catch (error) {
    console.error('Error processing OnePay callback:', error);
    // Don't throw here as we want to return success to OnePay
    // You might want to implement a retry mechanism or dead letter queue
  }
} 