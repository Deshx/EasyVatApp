"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Loader2, Shield, Zap, FileText } from "lucide-react";

export default function LoginPage() {
  const { user, signInWithGoogle, loading, error, clearError, profileStatus } = useAuth();
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(false);

  // Handle redirects based on auth state
  useEffect(() => {
    if (loading) return;
    
    if (user) {
      // User is logged in, check profile status
      if (profileStatus === "new") {
        // New users go to profile setup
        router.push("/profile-setup");
      } else if (profileStatus === "complete") {
        // Existing users go to dashboard
        router.push("/dashboard");
      }
    }
  }, [user, loading, router, profileStatus]);

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("Failed to initiate sign in:", err);
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-lg font-semibold text-gray-900">Sign In</h1>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      <div className="px-4 py-8">
        <div className="max-w-md mx-auto">
          {/* Welcome Card */}
          <Card className="mb-6 border-0 bg-white/80 backdrop-blur-sm shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-teal-500 rounded-full mb-4">
                <span className="text-white text-2xl font-bold">E</span>
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Welcome to EasyVat</CardTitle>
              <p className="text-gray-600 mt-2">Sign in to manage your VAT invoices</p>
            </CardHeader>

            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription className="flex items-center justify-between">
                    <span>{error}</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={clearError}
                      className="ml-2 h-auto p-1"
                    >
                      ✕
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleGoogleSignIn}
                disabled={authLoading || loading}
                className="w-full h-12 text-base font-medium bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 shadow-sm"
                variant="outline"
              >
                {(authLoading || loading) ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="mr-3 h-5 w-5">
                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
                  </svg>
                )}
                {authLoading || loading ? "Signing In..." : "Continue with Google"}
              </Button>

              <p className="text-center text-sm text-gray-500">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
            </CardContent>
          </Card>

          {/* Features Preview */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-4">
              What you can do with EasyVat
            </h3>
            
            <div className="space-y-3">
              <Card className="border-0 bg-white/60 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Zap className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">Quick Invoice Generation</p>
                      <p className="text-xs text-gray-600">Create invoices in seconds</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-white/60 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Shield className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">VAT Compliance</p>
                      <p className="text-xs text-gray-600">Automatic tax calculations</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 bg-white/60 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <FileText className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">Secure Storage</p>
                      <p className="text-xs text-gray-600">All invoices safely stored</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Button variant="ghost" asChild className="text-sm text-gray-600 hover:text-gray-800">
              <Link href="/">
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}