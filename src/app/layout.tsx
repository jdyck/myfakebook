import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

import { AppProviders } from "@/components/app-providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "MyFakebook — Online lead sheets",
  description: "Write, organize, hear, and export your lead sheets online.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="bg-[var(--canvas)]" lang="en">
      <body className="m-0 min-h-screen bg-[var(--canvas)] font-sans text-[var(--ink)] selection:bg-[#d9d6ff] selection:text-[#27235e] dark:selection:bg-[#4a4387] dark:selection:text-white">
        <AppProviders>{children}</AppProviders>
        <Analytics />
      </body>
    </html>
  );
}
