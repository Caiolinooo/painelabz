import type { Metadata } from "next";
import ErrorBoundary from "@/components/ErrorBoundary";
import ErrorFallback from "@/components/ErrorFallback";
import localFont from "next/font/local";
import "./globals.css";

// Import the ClientProviders component
import ClientProviders from "@/components/ClientProviders";
// Import the ThemeEnforcer component
import dynamic from "next/dynamic";

// Importar o ThemeEnforcer de forma dinâmica para garantir que ele seja executado apenas no cliente
const ThemeEnforcer = dynamic(() => import("@/components/ThemeEnforcer"), { ssr: false });

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
      <head>
        {/* Adicionar link para os ícones do Material Design */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          type="text/css"
        />
        {/* Adicionar link para o CSS do Material Icons */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          type="text/css"
        />
        {/* Meta tag para garantir o tipo MIME correto */}
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      </head>
      <body className="bg-gray-50" suppressHydrationWarning>
        <ClientProviders>
          <ErrorBoundary fallback={<ErrorFallback />}>
            {children}
          </ErrorBoundary>
          <ThemeEnforcer />
        </ClientProviders>
      </body>
    </html>
  );
}
