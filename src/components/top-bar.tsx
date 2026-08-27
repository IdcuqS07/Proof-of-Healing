"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/state/app-provider";
import { Badge, Button } from "./ui";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/badges", label: "ZK Badge" },
  { href: "/group", label: "Peer Group" },
];

export function TopBar() {
  const pathname = usePathname();
  const { wallet, connect, busy, account } = useApp();

  return (
    <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/" className="mr-auto flex items-center gap-2">
          <span className="text-lg font-semibold text-emerald-400">Proof of Healing</span>
          <Badge>Midnight testnet</Badge>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-1.5 transition ${
                pathname === link.href
                  ? "bg-slate-800 text-slate-100"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {wallet ? (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Badge tone={account ? "emerald" : "amber"}>
              {account ? "Registered" : "Not registered"}
            </Badge>
            <span className="font-mono">{`${wallet.address.slice(0, 14)}…`}</span>
          </div>
        ) : (
          <Button onClick={() => void connect()} disabled={busy === "connect"}>
            {busy === "connect" ? "Connecting…" : "Connect Wallet"}
          </Button>
        )}
      </div>
    </header>
  );
}
