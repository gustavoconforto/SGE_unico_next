import type { Metadata } from "next";
import { createTheme, ThemeProvider } from "flowbite-react";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeInit } from "../../.flowbite-react/init";
import "./globals.css";

// Secondary buttons darken on hover instead of turning navy: the action color is for the primary action only (DESIGN.md)
const THEME = createTheme({ button: { color: { alternative: "hover:text-gray-900" } } });

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Gestão Escolar", template: "%s | Gestão Escolar" },
  description: "Único Educacional — gestão escolar",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        {/* Same icon font the Django templates use; axes pinned to the defaults (nothing varies them), so a static font instead of the full variable one */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20,400,0,0&display=block"
        />
      </head>
      <body className="min-h-full bg-gray-50 font-sans text-gray-900 dark:bg-gray-900 dark:text-gray-100">
        <ThemeInit />
        <ThemeProvider theme={THEME}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
