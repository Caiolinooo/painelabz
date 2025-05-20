import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Import the ClientProviders component
import ClientProviders from "@/components/ClientProviders";

// Global error handling is now moved to the GlobalErrorHandler component

// Define plusJakartaSans
const plusJakartaSans = localFont({
  src: [
    {
      path: '../../public/fonts/PlusJakartaSans-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/PlusJakartaSans-Italic.ttf',
      weight: '400',
      style: 'italic',
    },
    {
      path: '../../public/fonts/PlusJakartaSans-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../public/fonts/PlusJakartaSans-SemiBoldItalic.ttf',
      weight: '600',
      style: 'italic',
    },
    {
      path: '../../public/fonts/PlusJakartaSans-ExtraBold.ttf',
      weight: '800',
      style: 'normal',
    },
     {
      path: '../../public/fonts/PlusJakartaSans-ExtraBoldItalic.ttf',
      weight: '800',
      style: 'italic',
    },
  ],
  variable: '--font-plus-jakarta',
});

// Metadata is now handled dynamically by SiteHead component
export const metadata: Metadata = {
  title: "Painel ABZ Group", // Default title, will be overridden by SiteHead
  description: "Painel centralizado para colaboradores da ABZ Group", // Default description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={plusJakartaSans.variable} suppressHydrationWarning>
      <body className="bg-gray-50" suppressHydrationWarning>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
