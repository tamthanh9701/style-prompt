import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Style Prompt Library — AI-Powered Image Prompt Builder",
  description: "Build and refine structured image generation prompts based on style analysis. Supports OpenAI, Anthropic, OpenRouter, and LiteLLM.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
