// Metadata is a Next.js type that helps us describe the page for the browser
// tab, search previews, and social previews.
import type { Metadata } from "next";

// `next/font/google` downloads and optimizes fonts at build time, which avoids
// adding a separate font stylesheet request in the browser.
import { Geist, Geist_Mono } from "next/font/google";

// Global CSS is imported once in the root layout so every route gets the same
// Tailwind setup and base styles.
import "./globals.css";

// This configures the main interface font and exposes it as a CSS variable.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// This configures a monospace font for future code-like values such as IDs,
// timestamps, transcript timings, and metric labels.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Metadata is static in Phase 1. Later phases can add route-specific metadata
// for reports or teacher profile pages.
export const metadata: Metadata = {
  title: "Teacher Evaluation Studio",
  description:
    "A classroom observation and AI transcription prototype for teacher feedback.",
};

// RootLayout wraps every page in the App Router.
// Keep shared providers, fonts, and app-wide shells here.
export default function RootLayout({
  children,
}: Readonly<{
  // `children` is the active page that Next.js places inside this layout.
  children: React.ReactNode;
}>) {
  return (
    // Font variables live on `<html>` so all child elements can use them.
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* The body is a flex column so future dashboard pages can stretch full height. */}
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
