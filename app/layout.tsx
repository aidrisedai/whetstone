import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Whetstone — sharpen your build",
  description:
    "A sharp CEO advisor that pushes teen builders to sharpen a project idea — through voice, text, and images — into a builder-ready prompt that ships itself to an AI builder.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {/* React 19 hoists these to <head>; layout falls back to the system stack if blocked. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router hoists <link> to <head> natively; the Pages-Router rule is a false positive here */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&family=Kalam:wght@400;700&family=Caveat:wght@500;700&display=swap"
        />
        {children}
      </body>
    </html>
  );
}
