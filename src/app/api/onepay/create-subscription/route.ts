import { NextRequest, NextResponse } from 'next/server';
import { onepayService, OnePaySubscriptionData } from '@/lib/services/onepayService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'firstName', 'lastName', 'email', 'phone'
    ];
    
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Set up subscription data for 10K monthly billing
    const subscriptionData: OnePaySubscriptionData = {
      orderId: onepayService.generateOrderReference(body.userId),
      amount: 10000, // 10K as requested
      currency: 'LKR',
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      userId: body.userId || '',
      interval: 'MONTH',
      intervalCount: 1, // Every 1 month
      daysUntilDue: 5,
      trialPeriodDays: 0,
      additionalData: body.userId || ''
    };

    // Check if user wants to try direct API approach
    if (body.method === 'direct-api') {
      console.log('🔄 Trying OnePay Direct API approach...');
      
      const directResult = await onepayService.createSubscription(subscriptionData);
      
      return NextResponse.json({
        success: directResult.success,
        method: 'direct-api',
        subscriptionId: directResult.subscriptionId,
        checkoutUrl: directResult.checkoutUrl,
        orderId: subscriptionData.orderId,
        error: directResult.error,
        config: {
          appName: process.env.ONEPAY_APP_NAME,
          appId: process.env.ONEPAY_APP_ID,
          domain: process.env.APP_DOMAIN,
          amount: subscriptionData.amount
        }
      });
    }

    // Default: Prepare subscription data for OnePay JS
    const onePayData = onepayService.prepareSubscriptionData(subscriptionData);

    // Debug logging (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('OnePay Subscription Debug Info:');
      console.log('Subscription Data:', JSON.stringify(onePayData, null, 2));
    }

    return NextResponse.json({
      success: true,
      method: 'onepayjs',
      onePayData,
      orderId: subscriptionData.orderId,
      config: {
        appName: process.env.ONEPAY_APP_NAME,
        appId: process.env.ONEPAY_APP_ID,
        domain: process.env.APP_DOMAIN,
        amount: subscriptionData.amount
      }
    });

  } catch (error) {
    console.error('OnePay subscription creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
} 