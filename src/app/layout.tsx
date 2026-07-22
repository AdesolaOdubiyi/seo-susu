import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const bodyFace = DM_Sans({
  variable: "--font-body-face",
  subsets: ["latin"],
});

const displayFace = Fraunces({
  variable: "--font-display-face",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Susu",
  description: "Rotating group savings tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bodyFace.variable} ${displayFace.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-[family-name:var(--font-body)] text-[var(--ink)]">
        {children}
      </body>
    </html>
  );
}
