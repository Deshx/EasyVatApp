"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { StationProfileForm } from "@/components/ui/StationProfileForm";

export default function ProfileSetup() {
  const { user, loading, error, profileStatus } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Safety checks for redirects
    if (!loading) {
      // If not logged in, go to login
      if (!user) {
        router.push("/login");
      }
      // If user has a complete profile, go to dashboard
      else if (profileStatus === "complete") {
        router.push("/dashboard");
      }
    }
  }, [user, loading, profileStatus, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Render nothing if not authenticated
  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-50">
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-4">Welcome to EasyVat!</h1>
          <p className="text-gray-600">
            Please provide your filling station details to get started.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6" role="alert">
            <p>{error}</p>
          </div>
        )}

        <StationProfileForm />
      </div>
    </main>
  );
} 