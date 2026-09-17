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
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
        <Analytics />
      </body>
    </html>
  );
}
