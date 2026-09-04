import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import FloatingActions from "@/components/FloatingActions";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TaTekæTa",
  description: "TaTekæTa - 割り勘・精算最適化システム",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TaTekæTa",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50/90 text-slate-900 min-h-screen flex flex-col selection:bg-indigo-100 selection:text-indigo-900`}
      >
        <Header />
        <main className="flex-1 w-full max-w-6xl mx-auto px-3.5 py-4 sm:px-5 sm:py-6 md:p-8">
          {children}
        </main>
        <FloatingActions />
      </body>
    </html>
  );
}
