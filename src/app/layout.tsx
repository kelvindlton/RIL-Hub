import type { Metadata } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import QueryProvider from "@/providers/QueryProvider";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "RIL Family - Community & Operational Hub",
  description: "The digital home and operational platform for Renaissance Innovation Labs (RIL) community members, staff, and alumni.",
  icons: {
    icon: "/favicon.ico",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${openSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-gray-50 text-brand-black flex flex-col font-sans">
        <QueryProvider>
          <AppProvider>
            {children}
          </AppProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
