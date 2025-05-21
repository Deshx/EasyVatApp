import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import type { Metadata } from "next";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { FuelPricesProvider } from "@/lib/contexts/FuelPricesContext";
import { DebugPanel } from "@/components/ui/DebugPanel";

export const metadata: Metadata = {
  title: "EasyVat",
  description: "Your VAT management made easy",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AuthProvider>
          <FuelPricesProvider>
            {children}
            {process.env.NODE_ENV === 'development' && <DebugPanel />}
          </FuelPricesProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
