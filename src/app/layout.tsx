import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../index.css";

export const metadata: Metadata = {
  title: "Work Due Calendar",
  description:
    "A read-only calendar of Cascade Web Solutions work due dates, synced from Airtable.",
  icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The theme class is set on <html> in the browser, after hydration.
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
