import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "../context/CartContext";


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Akademiso - Pusat Pelatihan ISO Terpercaya",
  description: "Raih standar internasional dengan pelatihan ISO komprehensif.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
