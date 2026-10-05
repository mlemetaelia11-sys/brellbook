"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  Users,
  Scissors,
  LayoutDashboard,
  Globe2,
  CreditCard,
  Settings,
  LifeBuoy,
  Menu,
  X,
  LogOut,
  BarChart3,
  UserRound,
  Share2,
  UserCog,
  ReceiptText,
} from "lucide-react";
import { useState } from "react";
import { BrellBookLogo } from "./brand";
import { ProductSwitcher } from "./ui";

const nav = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/calendar", "Calendar", CalendarDays],
  ["/bookings", "Bookings", ClipboardList],
  ["/customers", "Customers", Users],
  ["/services", "Services", Scissors],
  ["/staff", "Staff", UserCog],
  ["/business-page", "Business Page", Globe2],
  ["/growth", "Grow", Share2],
  ["/reports", "Reports", ReceiptText],
  ["/analytics", "Analytics", BarChart3],
  ["/subscription", "Subscription", CreditCard],
  ["/settings", "Settings", Settings],
  ["/support", "Help & Support", LifeBuoy],
] as const;

export function AppShell({
  children,
  business,
  user,
}: {
  children: React.ReactNode;
  business: any;
  user: any;
}) {
  const [open, setOpen] = useState(true);
  const path = usePathname();

  return (
    <div className="min-h-screen bg-[#F7F8FC]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-[#1B1B3A] text-white transition-transform duration-300 md:flex ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <BrellBookLogo dark />

          <button
            type="button"
            aria-label="Close sidebar"
            className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="mx-4 mb-4 rounded-xl bg-white/5 p-3">
          <div className="text-xs text-slate-400">Business</div>
          <div className="truncate font-semibold">{business.name}</div>
        </div>

        <nav className="sidebar-scroll min-h-0 flex-1 space-y-1 overflow-y-hidden px-3 pb-4">
          {nav.map(([href, label, Icon]) => {
            const active =
              path === href || path.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-[#6C2BFF] text-white shadow-sm"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}

          {user.isPlatformAdmin && (
            <Link
              href="/admin"
              className="mt-4 flex items-center gap-3 rounded-xl border border-[#FFC838]/30 bg-[#FFC838]/10 px-3 py-2.5 text-sm font-semibold text-[#FFC838]"
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-white/10">
              <UserRound size={17} />
            </div>

            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {user.name}
              </div>
              <div className="truncate text-xs text-slate-400">
                {user.email}
              </div>
            </div>
          </div>

          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-400 hover:bg-white/5"
            >
              <LogOut size={16} />
              Logout
            </button>
          </form>
        </div>
      </aside>

      <main
        className={`min-h-screen transition-all duration-300 ${
          open ? "md:pl-64" : ""
        }`}
      >
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-white/90 px-5 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Open sidebar"
              className={`rounded-lg border bg-white p-2 ${
                open ? "hidden" : "block"
              }`}
              onClick={() => setOpen(true)}
            >
              <Menu size={18} />
            </button>

            <div className="md:hidden">
              <BrellBookLogo />
            </div>

            <div className="hidden md:block">
              <ProductSwitcher />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-medium text-slate-500 md:block">
              {business.name}
            </span>

            <div className="grid h-9 w-9 place-items-center rounded-full bg-purple-50 font-bold text-[#6C2BFF]">
              {user.name?.[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 border-t bg-white/95 backdrop-blur md:hidden">
        <Link
          href="/dashboard"
          className="p-2.5 text-center text-[10px]"
        >
          <LayoutDashboard className="mx-auto" size={19} />
          Home
        </Link>

        <Link
          href="/calendar"
          className="p-2.5 text-center text-[10px]"
        >
          <CalendarDays className="mx-auto" size={19} />
          Calendar
        </Link>

        <Link
          href="/bookings"
          className="p-2.5 text-center text-[10px]"
        >
          <ClipboardList className="mx-auto" size={19} />
          Bookings
        </Link>

        <Link
          href="/customers"
          className="p-2.5 text-center text-[10px]"
        >
          <Users className="mx-auto" size={19} />
          Customers
        </Link>

        <Link
          href="/growth"
          className="p-2.5 text-center text-[10px]"
        >
          <Share2 className="mx-auto" size={19} />
          Grow
        </Link>
      </nav>
    </div>
  );
}