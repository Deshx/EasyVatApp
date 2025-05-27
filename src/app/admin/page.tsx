'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { paymentService } from '@/lib/services/paymentService';
import { UserProfile, PaymentHistory, GlobalSettings } from '@/lib/types/payment';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function AdminPanel() {
  const { user, loading, isSuperAdmin } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userPayments, setUserPayments] = useState<PaymentHistory[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: '',
    stationName: '',
    telephone: '',
    address: '',
    vatNumber: ''
  });
  const [auditResults, setAuditResults] = useState<any>(null);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    subscriptionAmount: 10000,
    trialPeriodDays: 0,
    gracePeriodDays: 7,
    defaultAccountType: 'paid' as 'free' | 'paid'
  });

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      router.push('/dashboard');
      return;
    }
    
    if (isSuperAdmin) {
      loadData();
    }
  }, [isSuperAdmin, loading, router]);

  const loadData = async () => {
    try {
      setDataLoading(true);
      const [usersData, settingsData] = await Promise.all([
        paymentService.getAllUsers(),
        paymentService.getGlobalSettings()
      ]);
      
      setUsers(usersData);
      setGlobalSettings(settingsData);
      setSettingsForm({
        subscriptionAmount: settingsData.subscriptionAmount,
        trialPeriodDays: settingsData.trialPeriodDays,
        gracePeriodDays: settingsData.gracePeriodDays,
        defaultAccountType: settingsData.defaultAccountType
      });
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const loadUserPayments = async (userId: string) => {
    try {
      const payments = await paymentService.getUserPaymentHistory(userId);
      setUserPayments(payments);
    } catch (error) {
      console.error('Error loading user payments:', error);
    }
  };

  const handleUserSelect = async (selectedUser: UserProfile) => {
    setSelectedUser(selectedUser);
    setEditingProfile(false);
    
    // Populate the profile form with current user data
    setProfileForm({
      displayName: selectedUser.displayName || '',
      stationName: selectedUser.stationName || '',
      telephone: selectedUser.telephone || '',
      address: selectedUser.address || '',
      vatNumber: selectedUser.vatNumber || ''
    });
    
    await loadUserPayments(selectedUser.uid);
  };

  const handleUpdateSubscriptionStatus = async (
    userId: string,
    status: 'active' | 'inactive' | 'pending' | 'trial'
  ) => {
    if (!user) return;
    
    try {
      setUpdating(true);
      await paymentService.updateUserSubscriptionStatus(userId, status, user.uid);
      
      // Refresh data
      await loadData();
      if (selectedUser?.uid === userId) {
        await loadUserPayments(userId);
      }
      
      alert(`User subscription status updated to ${status}`);
    } catch (error) {
      console.error('Error updating subscription status:', error);
      alert('Error updating subscription status');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateAccountType = async (
    userId: string,
    accountType: 'free' | 'paid'
  ) => {
    if (!user) return;
    
    try {
      setUpdating(true);
      await paymentService.updateUserProfile({
        uid: userId,
        accountType
      });
      
      // Refresh data
      await loadData();
      if (selectedUser?.uid === userId) {
        await loadUserPayments(userId);
      }
      
      alert(`User account type updated to ${accountType}`);
    } catch (error) {
      console.error('Error updating account type:', error);
      alert('Error updating account type');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user || !selectedUser) return;
    
    try {
      setUpdating(true);
      await paymentService.updateUserProfile({
        uid: selectedUser.uid,
        displayName: profileForm.displayName,
        stationName: profileForm.stationName,
        telephone: profileForm.telephone,
        address: profileForm.address,
        vatNumber: profileForm.vatNumber
      });
      
      // Refresh data
      await loadData();
      if (selectedUser?.uid) {
        await loadUserPayments(selectedUser.uid);
      }
      
      setEditingProfile(false);
      alert('User profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile');
    } finally {
      setUpdating(false);
    }
  };

  const handleAuditSubscriptions = async () => {
    if (!user) return;
    
    try {
      setUpdating(true);
      const problematicUsers = await paymentService.getUsersWithActiveSubscriptionsButNoPayments();
      setAuditResults(problematicUsers);
      
      if (problematicUsers.length === 0) {
        alert('✅ No issues found! All users with active subscriptions have payment records.');
      } else {
        alert(`⚠️ Found ${problematicUsers.length} users with active subscriptions but no payment records.`);
      }
    } catch (error) {
      console.error('Error auditing subscriptions:', error);
      alert('Error performing audit');
    } finally {
      setUpdating(false);
    }
  };

  const handleFixProblematicUsers = async () => {
    if (!user || !auditResults || auditResults.length === 0) return;
    
    const confirmFix = confirm(
      `This will set ${auditResults.length} users to inactive subscription status and free account type. Continue?`
    );
    
    if (!confirmFix) return;
    
    try {
      setUpdating(true);
      const fixedCount = await paymentService.fixUsersWithActiveSubscriptionsButNoPayments(user.uid);
      
      // Refresh data
      await loadData();
      setAuditResults(null);
      
      alert(`✅ Successfully fixed ${fixedCount} users. They now have inactive subscriptions and free account types.`);
    } catch (error) {
      console.error('Error fixing users:', error);
      alert('Error fixing users');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateGlobalSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setUpdating(true);
      await paymentService.updateGlobalSettings(settingsForm, user.uid);
      await loadData();
      alert('Global settings updated successfully');
    } catch (error) {
      console.error('Error updating global settings:', error);
      alert('Error updating global settings');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      trial: 'bg-blue-100 text-blue-800',
      free: 'bg-gray-100 text-gray-800',
      paid: 'bg-green-100 text-green-800'
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

  if (loading || dataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button 
            onClick={() => router.back()} 
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold">Super Admin Panel</h1>
          <p className="text-gray-600 mt-2">Manage users, subscriptions, and global settings</p>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="settings">Global Settings</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* User Management Tab */}
          <TabsContent value="users" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Users List */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">All Users ({users.length})</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {users.map((user) => (
                      <div 
                        key={user.uid}
                        onClick={() => handleUserSelect(user)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedUser?.uid === user.uid 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium text-sm truncate">{user.displayName || user.email}</div>
                        <div className="text-xs text-gray-500 truncate">{user.email}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(user.subscriptionStatus)}`}>
                            {user.subscriptionStatus}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(user.accountType)}`}>
                            {user.accountType}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* User Details */}
              <div className="lg:col-span-2">
                {selectedUser ? (
                  <div className="space-y-6">
                    {/* User Info */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">User Details</h3>
                        <div className="flex gap-2 flex-wrap">
                          {!editingProfile ? (
                            <>
                              <button
                                onClick={() => setEditingProfile(true)}
                                disabled={updating}
                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                              >
                                Edit Profile
                              </button>
                              <button
                                onClick={() => handleUpdateSubscriptionStatus(selectedUser.uid, 'active')}
                                disabled={updating}
                                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                Activate Sub
                              </button>
                              <button
                                onClick={() => handleUpdateSubscriptionStatus(selectedUser.uid, 'inactive')}
                                disabled={updating}
                                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                              >
                                Deactivate Sub
                              </button>
                              <button
                                onClick={() => handleUpdateAccountType(selectedUser.uid, selectedUser.accountType === 'paid' ? 'free' : 'paid')}
                                disabled={updating}
                                className={`px-3 py-1 text-white text-sm rounded disabled:opacity-50 ${
                                  selectedUser.accountType === 'paid' 
                                    ? 'bg-orange-600 hover:bg-orange-700' 
                                    : 'bg-purple-600 hover:bg-purple-700'
                                }`}
                              >
                                Make {selectedUser.accountType === 'paid' ? 'Free' : 'Paid'}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={handleUpdateProfile}
                                disabled={updating}
                                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                Save Changes
                              </button>
                              <button
                                onClick={() => setEditingProfile(false)}
                                disabled={updating}
                                className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-600">Name</label>
                          {editingProfile ? (
                            <input
                              type="text"
                              value={profileForm.displayName}
                              onChange={(e) => setProfileForm(prev => ({ ...prev, displayName: e.target.value }))}
                              className="w-full px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter full name"
                            />
                          ) : (
                            <p className="text-sm">{selectedUser.displayName || 'Not provided'}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Email</label>
                          <p className="text-sm">{selectedUser.email}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Station Name</label>
                          {editingProfile ? (
                            <input
                              type="text"
                              value={profileForm.stationName}
                              onChange={(e) => setProfileForm(prev => ({ ...prev, stationName: e.target.value }))}
                              className="w-full px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter station name"
                            />
                          ) : (
                            <p className="text-sm">{selectedUser.stationName || 'Not provided'}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Telephone</label>
                          {editingProfile ? (
                            <input
                              type="text"
                              value={profileForm.telephone}
                              onChange={(e) => setProfileForm(prev => ({ ...prev, telephone: e.target.value }))}
                              className="w-full px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter telephone number"
                            />
                          ) : (
                            <p className="text-sm">{selectedUser.telephone || 'Not provided'}</p>
                          )}
                        </div>
                        <div className="col-span-2">
                          <label className="text-sm font-medium text-gray-600">Address</label>
                          {editingProfile ? (
                            <textarea
                              value={profileForm.address}
                              onChange={(e) => setProfileForm(prev => ({ ...prev, address: e.target.value }))}
                              className="w-full px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter full address"
                              rows={2}
                            />
                          ) : (
                            <p className="text-sm">{selectedUser.address || 'Not provided'}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">VAT Number</label>
                          {editingProfile ? (
                            <input
                              type="text"
                              value={profileForm.vatNumber}
                              onChange={(e) => setProfileForm(prev => ({ ...prev, vatNumber: e.target.value }))}
                              className="w-full px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Enter VAT number"
                            />
                          ) : (
                            <p className="text-sm">{selectedUser.vatNumber || 'Not provided'}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Subscription Status</label>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedUser.subscriptionStatus)}`}>
                            {selectedUser.subscriptionStatus}
                          </span>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Account Type</label>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedUser.accountType)}`}>
                            {selectedUser.accountType}
                          </span>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Last Login</label>
                          <p className="text-sm">{selectedUser.lastLoginAt ? formatDate(selectedUser.lastLoginAt) : 'Never'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Subscription End Date</label>
                          <p className="text-sm">{selectedUser.subscriptionEndDate ? formatDate(selectedUser.subscriptionEndDate) : 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-600">Member Since</label>
                          <p className="text-sm">{formatDate(selectedUser.createdAt)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Payment History */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold mb-4">Payment History</h3>
                      {userPayments.length > 0 ? (
                        <div className="space-y-3">
                          {userPayments.map((payment) => (
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
                                  {payment.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center py-4 text-gray-500">No payment history found.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-center text-gray-500">Select a user to view details</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Global Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-6">Global Subscription Settings</h3>
                
                <form onSubmit={handleUpdateGlobalSettings} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monthly Subscription Amount (LKR)
                    </label>
                    <input
                      type="number"
                      value={settingsForm.subscriptionAmount}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, subscriptionAmount: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Trial Period (Days)
                    </label>
                    <input
                      type="number"
                      value={settingsForm.trialPeriodDays}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, trialPeriodDays: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Grace Period (Days)
                    </label>
                    <input
                      type="number"
                      value={settingsForm.gracePeriodDays}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, gracePeriodDays: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Account Type for New Users
                    </label>
                    <select
                      value={settingsForm.defaultAccountType}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, defaultAccountType: e.target.value as 'free' | 'paid' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="paid">Paid (Active Subscription)</option>
                      <option value="free">Free (Inactive Subscription)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={updating}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
                  >
                    {updating ? 'Updating...' : 'Update Settings'}
                  </button>
                </form>
              </div>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="mt-6">
            <div className="space-y-6">
              {/* Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-2">Total Users</h3>
                  <div className="text-3xl font-bold text-blue-600">{users.length}</div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-2">Active Subscriptions</h3>
                  <div className="text-3xl font-bold text-green-600">
                    {users.filter(u => u.subscriptionStatus === 'active').length}
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-2">Inactive Subscriptions</h3>
                  <div className="text-3xl font-bold text-red-600">
                    {users.filter(u => u.subscriptionStatus === 'inactive').length}
                  </div>
                </div>
              </div>

              {/* Subscription Audit */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Subscription Audit</h3>
                <p className="text-gray-600 mb-4">
                  Check for users who have active subscriptions but no payment records. 
                  This can happen due to system bugs or manual admin changes.
                </p>
                
                <div className="flex gap-3 mb-4">
                  <button
                    onClick={handleAuditSubscriptions}
                    disabled={updating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
                  >
                    {updating ? 'Auditing...' : 'Audit Subscriptions'}
                  </button>
                  
                  {auditResults && auditResults.length > 0 && (
                    <button
                      onClick={handleFixProblematicUsers}
                      disabled={updating}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium transition-colors"
                    >
                      Fix Issues ({auditResults.length})
                    </button>
                  )}
                </div>

                {auditResults && (
                  <div className="mt-4">
                    {auditResults.length === 0 ? (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-700 font-medium">✅ No issues found!</p>
                        <p className="text-green-600 text-sm">All users with active subscriptions have payment records.</p>
                      </div>
                    ) : (
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-orange-700 font-medium">⚠️ Found {auditResults.length} problematic users:</p>
                        <div className="mt-2 space-y-1">
                          {auditResults.slice(0, 5).map((user: any) => (
                            <div key={user.uid} className="text-sm text-orange-600">
                              • {user.displayName} ({user.email}) - Active subscription, no payments
                            </div>
                          ))}
                          {auditResults.length > 5 && (
                            <div className="text-sm text-orange-600">
                              ... and {auditResults.length - 5} more users
                            </div>
                          )}
                        </div>
                        <p className="text-orange-600 text-sm mt-2">
                          Click "Fix Issues" to set these users to inactive subscriptions.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
} 