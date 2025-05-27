"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { FuelPricesDisplay } from "@/components/ui/FuelPricesDisplay";
import { SubscriptionGate } from "@/components/ui/SubscriptionGate";
import { PageContainer } from "@/components/ui/page-container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  FileText, 
  Settings, 
  LogOut, 
  Fuel, 
  Crown,
  User,
  Shield,
  BarChart3,
  Zap
} from "lucide-react";

export default function Dashboard() {
  const { user, loading, error, signOut, profileStatus } = useAuth();
  const router = useRouter();
  const [signOutLoading, setSignOutLoading] = useState(false);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!loading && !user) {
      router.push("/login");
      return;
    }

    // If user is flagged as new, redirect to profile setup
    if (!loading && user && profileStatus === "new") {
      router.push("/profile-setup");
    }
  }, [user, loading, router, profileStatus]);

  const handleSignOut = async () => {
    setSignOutLoading(true);
    try {
      await signOut();
      router.push("/login");
    } catch (err) {
      console.error("Failed to sign out:", err);
    } finally {
      setSignOutLoading(false);
    }
  };

  // Handle Create Invoice button click - clear any existing session first
  const handleCreateInvoice = () => {
    // Clear all invoice session data from localStorage
    if (typeof window !== 'undefined') {
      // Find and remove all session-related keys
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('easyVat_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
    // Navigate to create invoice page (which will generate a new session)
    router.push('/create-invoice');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Render a loading state rather than showing dashboard elements briefly
  if (!user || profileStatus === "new") {
    return null;
  }

  return (
    <SubscriptionGate>
      <DashboardContent 
        user={user}
        error={error}
        handleCreateInvoice={handleCreateInvoice}
        handleSignOut={handleSignOut}
        signOutLoading={signOutLoading}
      />
    </SubscriptionGate>
  );
}

function DashboardContent({ 
  user, 
  error, 
  handleCreateInvoice, 
  handleSignOut, 
  signOutLoading 
}: {
  user: any;
  error: string | null;
  handleCreateInvoice: () => void;
  handleSignOut: () => Promise<void>;
  signOutLoading: boolean;
}) {
  const { isSuperAdmin } = useAuth();

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <PageContainer>
          <div className="py-4">
            <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">EasyVat</h1>
              <p className="text-sm text-gray-500">Dashboard</p>
            </div>
            
            {user && (
              <div className="flex items-center gap-3">
                {user.photoURL && (
                  <img 
                    src={user.photoURL} 
                    alt="Profile" 
                    className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                  />
                )}
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {user.displayName || user.email || 'User'}
                  </p>
                  {isSuperAdmin && (
                    <Badge variant="outline" className="text-xs">
                      <Crown className="h-3 w-3 mr-1" />
                      Super Admin
                    </Badge>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>
        </PageContainer>
      </div>

      <div className="pb-20">
        <PageContainer>
          {error && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <CardContent className="p-4">
                <p className="text-red-700 text-sm">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {/* Create Invoice - Primary Action */}
            <Card className="bg-gradient-to-r from-blue-600 to-blue-700 border-0 hover:shadow-lg transition-all duration-200">
              <CardContent className="p-0">
                <Button 
                  onClick={handleCreateInvoice}
                  className="w-full h-auto p-6 bg-transparent hover:bg-white/10 text-white font-medium rounded-lg flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Plus className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">Create Invoice</p>
                      <p className="text-blue-100 text-sm">Scan bills and generate invoices</p>
                    </div>
                  </div>
                  <Zap className="h-5 w-5 text-blue-200" />
                </Button>
              </CardContent>
            </Card>

            {/* View Invoices */}
            <Card className="hover:shadow-md transition-all duration-200">
              <CardContent className="p-0">
                <Button 
                  asChild
                  variant="ghost"
                  className="w-full h-auto p-6 text-gray-800 font-medium rounded-lg flex items-center justify-between text-left hover:bg-gray-50"
                >
                  <Link href="/invoices">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <FileText className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold">View Invoices</p>
                        <p className="text-gray-500 text-sm">Browse your invoice history</p>
                      </div>
                    </div>
                    <div className="text-gray-400">→</div>
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Settings */}
            <Card className="hover:shadow-md transition-all duration-200">
              <CardContent className="p-0">
                <Button 
                  asChild
                  variant="ghost"
                  className="w-full h-auto p-6 text-gray-800 font-medium rounded-lg flex items-center justify-between text-left hover:bg-gray-50"
                >
                  <Link href="/settings">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Settings className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-semibold">Settings</p>
                        <p className="text-gray-500 text-sm">Manage your account</p>
                      </div>
                    </div>
                    <div className="text-gray-400">→</div>
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Fuel Prices */}
        <div className="mb-6">
          <FuelPricesDisplay />
        </div>

        {/* Admin Actions */}
        {isSuperAdmin && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Panel</h2>
            <div className="space-y-3">
              {/* Super Admin Panel */}
              <Card className="hover:shadow-md transition-all duration-200 border-amber-200 bg-amber-50">
                <CardContent className="p-0">
                  <Button 
                    asChild
                    variant="ghost"
                    className="w-full h-auto p-6 text-amber-800 font-medium rounded-lg flex items-center justify-between text-left hover:bg-amber-100"
                  >
                    <Link href="/admin">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-amber-200 rounded-lg">
                          <Shield className="h-6 w-6 text-amber-700" />
                        </div>
                        <div>
                          <p className="font-semibold">Super Admin Panel</p>
                          <p className="text-amber-600 text-sm">Manage users and system</p>
                        </div>
                      </div>
                      <div className="text-amber-400">→</div>
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Manage Fuel Prices */}
              <Card className="hover:shadow-md transition-all duration-200">
                <CardContent className="p-0">
                  <Button 
                    asChild
                    variant="ghost"
                    className="w-full h-auto p-6 text-gray-800 font-medium rounded-lg flex items-center justify-between text-left hover:bg-gray-50"
                  >
                    <Link href="/fuel-prices">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <Fuel className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                          <p className="font-semibold">Manage Fuel Prices</p>
                          <p className="text-gray-500 text-sm">Update current fuel rates</p>
                        </div>
                      </div>
                      <div className="text-gray-400">→</div>
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
        </PageContainer>
      </div>
      
      {/* Fixed Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <Button
          onClick={handleSignOut}
          disabled={signOutLoading}
          variant="outline"
          className="w-full h-12 text-gray-600 hover:text-gray-800 flex items-center justify-center gap-2"
        >
          {signOutLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-gray-600"></div>
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          Sign Out
        </Button>
      </div>
    </main>
  );
} 
