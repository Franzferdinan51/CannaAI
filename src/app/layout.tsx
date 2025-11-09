import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import GlobalHeader from "@/components/layout/global-header";
import UnifiedAIAssistant from "@/components/ai/unified-assistant";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CannaAI - Cannabis Cultivation Management",
  description: "Advanced cannabis cultivation management system with AI-powered plant health analysis, real-time sensor monitoring, and comprehensive analytics.",
  keywords: ["CannaAI", "cannabis", "cultivation", "growing", "AI", "plant health", "sensors", "analytics", "management"],
  authors: [{ name: "CannaAI Team" }],
  icons: {
    icon: "/favicon.ico",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  openGraph: {
    title: "CannaAI - Cannabis Cultivation Management",
    description: "AI-powered cannabis cultivation management with real-time monitoring and analytics",
    url: "https://cannai.app",
    siteName: "CannaAI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CannaAI - Cannabis Cultivation Management",
    description: "AI-powered cannabis cultivation management with real-time monitoring and analytics",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <GlobalHeader />
        <main className="min-h-screen">
          {children}
        </main>
        <UnifiedAIAssistant />
        <Toaster />
      </body>
    </html>
  );
}
