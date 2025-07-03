// src/app/layout.tsx

import type { Metadata } from "next";

import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "Praxis AI",
    template: "%s | Praxis AI"
  },
  description: "Build, deploy, and scale AI applications with Praxis AI. Powerful tools for developers to create intelligent agents, chatbots, and AI-powered workflows with ease.",
  keywords: [
    "Praxis AI",
    "AI platform",
    "machine learning",
    "artificial intelligence",
    "chatbots",
    "AI agents",
    "developer tools",
    "AI applications",
    "language models",
    "LLM"
  ],
  authors: [{ name: "Gregory Asquith Ltd" }],
  creator: "Gregory Asquith Ltd",
  publisher: "Gregory Asquith Ltd",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://praxis.618technology.com/",
    title: "Praxis AI",
    description: "Build, deploy, and scale AI applications with Praxis AI. Powerful tools for developers to create intelligent agents, chatbots, and AI-powered workflows with ease.",
    siteName: "Praxis AI",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Praxis AI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "LangChain Platform",
    description: "Build, deploy, and scale AI applications with LangChain Platform. Powerful tools for developers to create intelligent agents, chatbots, and AI-powered workflows with ease.",
    images: ["/og-image.png"],
    creator: "@Greg_Asquith",
  },
  icons: {
    icon: "/icons/favicon-32x32.png",
    shortcut: "/icons/favicon-16x16.png",
    apple: "/icons/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}

