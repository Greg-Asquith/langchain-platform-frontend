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
  title: {
    default: "LangChain Platform",
    template: "%s | LangChain Platform"
  },
  description: "Build, deploy, and scale AI applications with LangChain Platform. Powerful tools for developers to create intelligent agents, chatbots, and AI-powered workflows with ease.",
  keywords: [
    "LangChain",
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
    url: "https://langchain.greagasquith.com",
    title: "LangChain Platform",
    description: "Build, deploy, and scale AI applications with LangChain Platform. Powerful tools for developers to create intelligent agents, chatbots, and AI-powered workflows with ease.",
    siteName: "LangChain Platform",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "LangChain Platform",
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
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
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

