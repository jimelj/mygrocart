import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { ApolloWrapper } from "@/lib/apollo-provider";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MyGroCart - Weekly Grocery Flyers & Deals",
  description: "Browse weekly grocery flyers, discover the best deals near you, and save money on your shopping list. Compare prices across stores and never miss a sale.",
  keywords: "grocery deals, weekly flyers, grocery coupons, supermarket sales, price comparison, shopping list, grocery savings",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "MyGroCart - Weekly Grocery Flyers & Deals",
    description: "Browse weekly grocery flyers, discover the best deals near you, and save money on your shopping list.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {/* Skip to main content link for accessibility (WCAG 2.1 AA) */}
        <a
          href="#main-content"
          className="skip-to-main"
          aria-label="Skip to main content"
        >
          Skip to main content
        </a>
        <ApolloWrapper>
          <AuthProvider>
            <Navigation />
            <main id="main-content">
              {children}
            </main>
            <Toaster />
          </AuthProvider>
        </ApolloWrapper>
      </body>
    </html>
  );
}
