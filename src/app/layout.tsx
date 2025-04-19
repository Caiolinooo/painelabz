import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { I18nProvider } from "@/contexts/I18nContext";
import LanguageDialog from "@/components/LanguageDialog";

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

export const metadata: Metadata = {
  title: "Painel ABZ Group",
  description: "Painel centralizado para colaboradores da ABZ Group",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={plusJakartaSans.variable}>
      <body className="bg-gray-50">
        <AuthProvider>
          <I18nProvider>
            <LanguageDialog />
            {children}
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
