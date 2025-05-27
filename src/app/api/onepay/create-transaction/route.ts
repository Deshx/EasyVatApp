import { NextRequest, NextResponse } from 'next/server';
import { onepayService, OnePayTransactionData } from '@/lib/services/onepayService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'firstName', 'lastName', 'email', 'phone', 'amount'
    ];
    
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Set up transaction data
    const transactionData: OnePayTransactionData = {
      orderId: onepayService.generateOrderReference(body.userId),
      amount: parseFloat(body.amount),
      currency: body.currency || 'LKR',
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      additionalData: body.userId || '',
      itemIds: body.itemIds || []
    };

    // Create transaction via OnePay API
    const result = await onepayService.createTransaction(transactionData);

    if (result.success) {
      return NextResponse.json({
        success: true,
        checkoutUrl: result.checkoutUrl,
        transactionId: result.transactionId,
        orderId: transactionData.orderId
      });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('OnePay transaction creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
} 