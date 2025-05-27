"use client";

import { usePathname } from 'next/navigation';
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { FuelPricesProvider } from "@/lib/contexts/FuelPricesContext";
import { FuelPriceHistoryProvider } from "@/lib/contexts/FuelPriceHistoryContext";
import { DebugPanel } from "@/components/ui/DebugPanel";

interface ConditionalProvidersProps {
  children: React.ReactNode;
}

export function ConditionalProviders({ children }: ConditionalProvidersProps) {
  const pathname = usePathname();
  
  // Pages that should not use Firebase providers
  const excludeFirebase = ['/test-onepay'];
  
  const shouldExcludeFirebase = excludeFirebase.includes(pathname);
  
  if (shouldExcludeFirebase) {
    // Return children without Firebase providers for specific pages
    return <>{children}</>;
  }
  
  // Return children with Firebase providers for all other pages
  return (
    <AuthProvider>
      <FuelPricesProvider>
        <FuelPriceHistoryProvider>
          {children}
          {process.env.NODE_ENV === 'development' && <DebugPanel />}
        </FuelPriceHistoryProvider>
      </FuelPricesProvider>
    </AuthProvider>
  );
} 