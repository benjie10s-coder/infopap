// app/layout.tsx — Root layout with fonts, global styles, and auth provider
import type { Metadata } from "next";
import { Space_Grotesk, Fraunces } from "next/font/google";
import { AuthProvider } from "@/lib/hooks/AuthProvider";
import { SidebarProvider } from "@/lib/hooks/SidebarProvider";
import { ExpandedSidebarOverlay } from "@/components/LeftNavSidebar";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Invopap — Invoice & Receipt Generator for Kenya",
  description:
    "Create professional invoices, receipts, and quotes instantly. No signup required. Pay KSh 10 via M-Pesa to download. Built for Kenyan businesses.",
  openGraph: {
    title: "Invopap — Invoice & Receipt Generator",
    description:
      "Create and download professional business documents instantly via M-Pesa.",
    url: "https://invopap.com",
    siteName: "Invopap",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Invopap — Invoice Generator for Kenya",
    description: "Professional invoices in seconds. Pay KSh 10 via M-Pesa.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${fraunces.variable}`}>
      <body className="font-body antialiased text-ink bg-white">
        <AuthProvider>
          <SidebarProvider>
            <ExpandedSidebarOverlay />
            {children}
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
