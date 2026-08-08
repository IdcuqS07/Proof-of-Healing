import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/state/app-provider";
import { TopBar } from "@/components/top-bar";
import { Alerts } from "@/components/alerts";

export const metadata: Metadata = {
  title: "Proof of Healing — ZK Mental Health & Habit Tracker",
  description:
    "Pelacak kesehatan mental berbasis Zero-Knowledge Proof di Midnight Network. Jurnal tersimpan terenkripsi di perangkat, hanya bukti matematika yang dikirim ke blockchain.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-950 text-slate-200 antialiased">
        <AppProvider>
          <TopBar />
          <Alerts />
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
          <footer className="mx-auto max-w-5xl px-4 pb-10 text-xs text-slate-600">
            Apache License 2.0 · Midnight Buildathon · data jurnal tidak pernah meninggalkan perangkat Anda.
          </footer>
        </AppProvider>
      </body>
    </html>
  );
}
