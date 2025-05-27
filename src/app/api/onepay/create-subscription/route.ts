import { NextRequest, NextResponse } from 'next/server';
import { onepayService, OnePaySubscriptionData } from '@/lib/services/onepayService';
import { paymentService } from '@/lib/services/paymentService';

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

    // Get global settings for subscription amount
    const globalSettings = await paymentService.getGlobalSettings();

    // Set up subscription data
    const subscriptionData: OnePaySubscriptionData = {
      orderId: onepayService.generateOrderReference(body.userId),
      amount: globalSettings.subscriptionAmount,
      currency: globalSettings.currency,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      userId: body.userId || '',
      interval: globalSettings.interval,
      intervalCount: 1,
      daysUntilDue: globalSettings.gracePeriodDays,
      trialPeriodDays: globalSettings.trialPeriodDays,
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