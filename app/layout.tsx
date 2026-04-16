import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WNBA Wage Tracker",
  description:
    "Browse, search and sort WNBA player salaries and contracts. A clean, modern sports analytics view of the league's pay.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
