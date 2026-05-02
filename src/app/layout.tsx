import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LeadProspect — Plataforma de Prospecção Inteligente de Leads",
  description: "Encontre e gerencie leads qualificados com busca inteligente e CRM integrado. Powered by AI.",
  keywords: ["lead prospecting", "CRM", "sales pipeline", "AI search", "B2B leads", "prospecção"],
  authors: [{ name: "LeadProspect" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "LeadProspect — Prospecção Inteligente",
    description: "Encontre e gerencie leads qualificados com busca inteligente e CRM integrado",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LeadProspect — Prospecção Inteligente",
    description: "Encontre e gerencie leads qualificados com busca inteligente e CRM integrado",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
