import "./globals.css";
import type { Metadata } from "next";
import { ConditionalProviders } from "@/components/ConditionalProviders";

export const metadata: Metadata = {
  title: "EasyVat",
  description: "Your VAT management made easy",
  icons: {
    icon: "/fav.png",
    shortcut: "/fav.png",
    apple: "/fav.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ConditionalProviders>
          {children}
        </ConditionalProviders>
      </body>
    </html>
  );
}
