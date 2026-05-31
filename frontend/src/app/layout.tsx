import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/lib/wallet";
import Toaster from "@/components/Toaster";

export const metadata: Metadata = {
  title: "VeriFlip — Provably-Recomputable Coin Flip Casino",
  description:
    "Connect, deposit, flip. Every outcome is derived on-chain and you can recompute it yourself from public data. 50/50, 1.93x, fully verifiable.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-casino min-h-screen font-sans antialiased">
        <WalletProvider>{children}</WalletProvider>
        <Toaster />
      </body>
    </html>
  );
}
