import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "200: Career Found",
  description:
    "AI-powered career and learning assistant for people exploring a path into IT",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
