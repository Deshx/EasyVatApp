import { NextRequest, NextResponse } from 'next/server';
import { onepayService } from '@/lib/services/onepayService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      );
    }

    const result = await onepayService.getTransactionStatus(transactionId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        transactionId,
        status: result.status,
        data: result.data,
        statusMessage: onepayService.getPaymentStatusMessage(result.data?.status || 0)
      });
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('OnePay status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check transaction status' },
      { status: 500 }
    );
  }
} 