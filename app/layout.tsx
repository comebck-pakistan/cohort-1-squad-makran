import type { Metadata } from "next";
import { fontDisplay, fontBody, fontMono } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agentic OS for Freelancers",
  description: "From job posting to merged PR, with a human approval gate at every meaningful step.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
