import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { UserSubscription, PaymentHistory, GlobalSettings, UserProfile } from '@/lib/types/payment';

class PaymentService {
  // Collections
  private readonly SUBSCRIPTIONS_COLLECTION = 'userSubscriptions';
  private readonly PAYMENT_HISTORY_COLLECTION = 'paymentHistory';
  private readonly GLOBAL_SETTINGS_COLLECTION = 'globalSettings';
  private readonly USER_PROFILES_COLLECTION = 'userProfiles';
  private readonly SETTINGS_DOC_ID = 'subscription_settings';

  /**
   * Get global subscription settings
   */
  async getGlobalSettings(): Promise<GlobalSettings> {
    try {
      const settingsDoc = await getDoc(doc(db, this.GLOBAL_SETTINGS_COLLECTION, this.SETTINGS_DOC_ID));
      
      if (settingsDoc.exists()) {
        const data = settingsDoc.data();
        return {
          subscriptionAmount: data.subscriptionAmount || 10000,
          currency: data.currency || 'LKR',
          interval: data.interval || 'MONTH',
          trialPeriodDays: data.trialPeriodDays || 0,
          gracePeriodDays: data.gracePeriodDays || 7,
          autoRenew: data.autoRenew || true,
          defaultAccountType: data.defaultAccountType || 'paid',
          updatedAt: data.updatedAt?.toDate() || new Date(),
          updatedBy: data.updatedBy || 'system'
        };
      } else {
        // Return default settings and create them
        const defaultSettings: GlobalSettings = {
          subscriptionAmount: 10000,
          currency: 'LKR',
          interval: 'MONTH',
          trialPeriodDays: 0,
          gracePeriodDays: 7,
          autoRenew: true,
          defaultAccountType: 'free', // New users should start as free
          updatedAt: new Date(),
          updatedBy: 'system'
        };
        await this.updateGlobalSettings(defaultSettings, 'system');
        return defaultSettings;
      }
    } catch (error) {
      console.error('Error getting global settings:', error);
      throw error;
    }
  }

  /**
   * Update global subscription settings
   */
  async updateGlobalSettings(settings: Partial<GlobalSettings>, updatedBy: string): Promise<void> {
    try {
      const updateData = {
        ...settings,
        updatedAt: serverTimestamp(),
        updatedBy
      };
      
      await setDoc(doc(db, this.GLOBAL_SETTINGS_COLLECTION, this.SETTINGS_DOC_ID), updateData, { merge: true });
    } catch (error) {
      console.error('Error updating global settings:', error);
      throw error;
    }
  }

  /**
   * Get user subscription status
   */
  async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      const subscriptionDoc = await getDoc(doc(db, this.SUBSCRIPTIONS_COLLECTION, userId));
      
      if (subscriptionDoc.exists()) {
        const data = subscriptionDoc.data();
        return {
          userId: data.userId,
          status: data.status,
          subscriptionId: data.subscriptionId,
          startDate: data.startDate?.toDate() || new Date(),
          endDate: data.endDate?.toDate() || new Date(),
          amount: data.amount,
          currency: data.currency,
          interval: data.interval,
          autoRenew: data.autoRenew,
          trialUsed: data.trialUsed,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user subscription:', error);
      throw error;
    }
  }

  /**
   * Create or update user subscription
   */
  async updateUserSubscription(subscription: Partial<UserSubscription> & { userId: string }): Promise<void> {
    try {
      const updateData = {
        ...subscription,
        updatedAt: serverTimestamp()
      };
      
      await setDoc(doc(db, this.SUBSCRIPTIONS_COLLECTION, subscription.userId), updateData, { merge: true });
    } catch (error) {
      console.error('Error updating user subscription:', error);
      throw error;
    }
  }

  /**
   * Record payment transaction
   */
  async recordPayment(payment: Omit<PaymentHistory, 'id' | 'createdAt'>): Promise<string> {
    try {
      const paymentData = {
        ...payment,
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, this.PAYMENT_HISTORY_COLLECTION), paymentData);
      return docRef.id;
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  }

  /**
   * Get user payment history
   */
  async getUserPaymentHistory(userId: string, limitCount: number = 50): Promise<PaymentHistory[]> {
    try {
      const q = query(
        collection(db, this.PAYMENT_HISTORY_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        paidAt: doc.data().paidAt?.toDate()
      } as PaymentHistory));
    } catch (error) {
      console.error('Error getting payment history:', error);
      throw error;
    }
  }

  /**
   * Check if user subscription is active
   */
  async isSubscriptionActive(userId: string): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);
      
      if (!subscription) return false;
      
      const now = new Date();
      return subscription.status === 'active' && subscription.endDate > now;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  }

  /**
   * Create default subscription for new user
   * New users always start with inactive subscription - they must pay to activate
   */
  async createDefaultSubscription(userId: string, userEmail: string): Promise<void> {
    try {
      const settings = await this.getGlobalSettings();
      const now = new Date();
      
      // New users always start with inactive subscription
      // They need to make a payment to activate it
      const subscription: UserSubscription = {
        userId,
        status: 'inactive', // Always start inactive regardless of global settings
        startDate: now,
        endDate: now, // Set end date to current time for inactive subscriptions
        amount: settings.subscriptionAmount,
        currency: settings.currency,
        interval: settings.interval,
        autoRenew: settings.autoRenew,
        trialUsed: false,
        createdAt: now,
        updatedAt: now
      };

      await this.updateUserSubscription(subscription);

      // Also update user profile - new users start as free
      await this.updateUserProfile({
        uid: userId,
        email: userEmail,
        subscriptionStatus: 'inactive',
        accountType: 'free', // Always start as free - upgrade to paid after payment
        subscriptionEndDate: now
      });
    } catch (error) {
      console.error('Error creating default subscription:', error);
      throw error;
    }
  }

  /**
   * Process successful payment
   */
  async processSuccessfulPayment(
    userId: string, 
    transactionId: string, 
    amount: number,
    subscriptionId?: string
  ): Promise<void> {
    try {
      const settings = await this.getGlobalSettings();
      const now = new Date();
      
      // Record payment
      await this.recordPayment({
        userId,
        transactionId,
        subscriptionId,
        amount,
        currency: 'LKR',
        status: 'success',
        paymentMethod: 'onepay',
        description: 'Monthly subscription payment',
        paidAt: now
      });

      // Update subscription
      const currentSubscription = await this.getUserSubscription(userId);
      const startDate = currentSubscription?.endDate > now ? currentSubscription.endDate : now;
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);

      await this.updateUserSubscription({
        userId,
        status: 'active',
        subscriptionId,
        startDate,
        endDate,
        amount: settings.subscriptionAmount,
        currency: settings.currency,
        interval: settings.interval,
        autoRenew: settings.autoRenew
      });

      // Update user profile subscription status
      await this.updateUserProfile({
        uid: userId,
        subscriptionStatus: 'active',
        accountType: 'paid',
        subscriptionEndDate: endDate
      });
    } catch (error) {
      console.error('Error processing successful payment:', error);
      throw error;
    }
  }

  /**
   * Get all users for admin view
   */
  async getAllUsers(): Promise<UserProfile[]> {
    try {
      // Remove orderBy to handle documents without createdAt field
      const querySnapshot = await getDocs(collection(db, this.USER_PROFILES_COLLECTION));
      
      const users = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          uid: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          lastLoginAt: data.lastLoginAt?.toDate(),
          subscriptionEndDate: data.subscriptionEndDate?.toDate(),
          // Ensure required fields have defaults
          subscriptionStatus: data.subscriptionStatus || 'inactive',
          accountType: data.accountType || 'free',
          displayName: data.displayName || data.email || 'Unknown User',
          // Include additional profile fields
          telephone: data.telephone || '',
          address: data.address || '',
          vatNumber: data.vatNumber || '',
          stationName: data.stationName || ''
        } as UserProfile;
      });
      
      // Sort by createdAt in memory (newest first)
      users.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      return users;
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(profile: Partial<UserProfile> & { uid: string }): Promise<void> {
    try {
      const updateData = {
        ...profile,
        updatedAt: serverTimestamp()
      };
      
      await setDoc(doc(db, this.USER_PROFILES_COLLECTION, profile.uid), updateData, { merge: true });
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Update user subscription status (for admin)
   */
  async updateUserSubscriptionStatus(
    userId: string, 
    status: 'active' | 'inactive' | 'pending' | 'trial',
    adminUserId: string
  ): Promise<void> {
    try {
      const currentSubscription = await this.getUserSubscription(userId);
      const now = new Date();
      
      if (currentSubscription) {
        let endDate = currentSubscription.endDate;
        
        if (status === 'active' && currentSubscription.status !== 'active') {
          // Extending or activating subscription
          endDate = new Date();
          endDate.setMonth(endDate.getMonth() + 1);
        }
        
        await this.updateUserSubscription({
          userId,
          status,
          endDate
        });
      }

      // Update user profile
      await this.updateUserProfile({
        uid: userId,
        subscriptionStatus: status,
        accountType: status === 'active' ? 'paid' : 'free'
      });

      // Record admin action
      await this.recordPayment({
        userId,
        transactionId: `ADMIN_${adminUserId}_${Date.now()}`,
        amount: 0,
        currency: 'LKR',
        status: 'success',
        paymentMethod: 'onepay',
        description: `Admin changed subscription status to ${status}`,
        metadata: { changedBy: adminUserId, action: 'status_change' },
        paidAt: now
      });
    } catch (error) {
      console.error('Error updating user subscription status:', error);
      throw error;
    }
  }

  /**
   * Check for users with active subscriptions but no payment records
   * This helps identify users who were incorrectly given active status without payment
   */
  async getUsersWithActiveSubscriptionsButNoPayments(): Promise<UserProfile[]> {
    try {
      const users = await this.getAllUsers();
      const problematicUsers: UserProfile[] = [];

      for (const user of users) {
        if (user.subscriptionStatus === 'active') {
          // Check if this user has any actual payment records (not admin actions)
          const payments = await this.getUserPaymentHistory(user.uid);
          const actualPayments = payments.filter(p => 
            p.amount > 0 && 
            !p.transactionId.startsWith('ADMIN_') &&
            p.status === 'success'
          );

          if (actualPayments.length === 0) {
            problematicUsers.push(user);
          }
        }
      }

      return problematicUsers;
    } catch (error) {
      console.error('Error checking users with no payments:', error);
      throw error;
    }
  }

  /**
   * Fix users who have active subscriptions without payment records
   * Sets them to inactive status and free account type
   */
  async fixUsersWithActiveSubscriptionsButNoPayments(adminUserId: string): Promise<number> {
    try {
      const problematicUsers = await this.getUsersWithActiveSubscriptionsButNoPayments();
      let fixedCount = 0;

      for (const user of problematicUsers) {
        await this.updateUserSubscriptionStatus(user.uid, 'inactive', adminUserId);
        await this.updateUserProfile({
          uid: user.uid,
          accountType: 'free'
        });
        fixedCount++;
      }

      return fixedCount;
    } catch (error) {
      console.error('Error fixing users with no payments:', error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService(); 