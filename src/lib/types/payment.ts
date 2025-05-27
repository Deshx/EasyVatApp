export interface UserSubscription {
  userId: string;
  status: 'active' | 'inactive' | 'pending' | 'trial';
  subscriptionId?: string;
  startDate: Date;
  endDate: Date;
  amount: number;
  currency: 'LKR';
  interval: 'MONTH' | 'YEAR';
  autoRenew: boolean;
  trialUsed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentHistory {
  id: string;
  userId: string;
  transactionId: string;
  subscriptionId?: string;
  amount: number;
  currency: 'LKR';
  status: 'success' | 'failed' | 'pending';
  paymentMethod: 'onepay';
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  paidAt?: Date;
}

export interface GlobalSettings {
  subscriptionAmount: number;
  currency: 'LKR';
  interval: 'MONTH' | 'YEAR';
  trialPeriodDays: number;
  gracePeriodDays: number;
  autoRenew: boolean;
  defaultAccountType: 'free' | 'paid';
  updatedAt: Date;
  updatedBy: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  stationName?: string;
  telephone?: string;
  address?: string;
  vatNumber?: string;
  subscriptionStatus: 'active' | 'inactive' | 'pending' | 'trial';
  accountType: 'free' | 'paid';
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  subscriptionEndDate?: Date;
} 