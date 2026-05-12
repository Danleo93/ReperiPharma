"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Building2,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  Database,
  Menu,
  PhoneCall,
  Pill,
  Settings,
  Stethoscope,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const mainNav = [
  { href: "/calendari", label: "Calendari annuali", icon: CalendarRange },
  { href: "/calendario-mensile", label: "Calendario mensile", icon: CalendarDays },
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/chiamate", label: "Chiamate", icon: PhoneCall },
];

const dataNav = [
  { href: "/dati/farmacisti", label: "Farmacisti", icon: Users },
  { href: "/dati/presidi", label: "Presidi", icon: Building2 },
  { href: "/dati/festivi", label: "Festivi", icon: Stethoscope },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [dataOpen, setDataOpen] = useState(true);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-slate-200 bg-white/95 shadow-sm backdrop-blur md:flex md:flex-col",
          collapsed ? "w-20" : "w-72",
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-4">
          <div className="flex size-10 items-center justify-center rounded-md bg-teal-700 text-white">
            <Pill className="size-5" />
          </div>
          {!collapsed && (
            <div>
              <div className="text-sm font-semibold tracking-wide">ReperiPharma</div>
              <div className="text-xs text-slate-500">Farmacia ospedaliera</div>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-2 p-3">
          {mainNav.map((item) => (
            <NavItem key={item.href} {...item} active={pathname.startsWith(item.href)} collapsed={collapsed} />
          ))}

          <Separator className="my-3" />

          <button
            type="button"
            onClick={() => setDataOpen((value) => !value)}
            className={cn(
              "flex h-10 w-full items-center rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-slate-100",
              collapsed ? "justify-center" : "justify-between",
            )}
          >
            <span className="flex items-center gap-3">
              <Database className="size-4" />
              {!collapsed && "Dati"}
            </span>
            {!collapsed && <ChevronDown className={cn("size-4 transition", dataOpen && "rotate-180")} />}
          </button>

          {dataOpen &&
            dataNav.map((item) => (
              <NavItem key={item.href} {...item} active={pathname.startsWith(item.href)} collapsed={collapsed} nested />
            ))}
        </nav>

        <div className="border-t border-slate-200 p-3">
          <NavItem href="/impostazioni" label="Impostazioni" icon={Settings} active={pathname === "/impostazioni"} collapsed={collapsed} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mt-3 w-full rounded-md"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Espandi menu" : "Comprimi menu"}
          >
            <Menu className="size-4" />
          </Button>
        </div>
      </aside>

      <div className={cn("min-h-screen transition-[padding]", collapsed ? "md:pl-20" : "md:pl-72")}>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-6">
          <div>
            <div className="text-lg font-semibold">ReperiPharma</div>
            <div className="text-xs text-slate-500">Gestione reperibilita e chiamate</div>
          </div>
          <div className="hidden items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 md:flex">
            <Stethoscope className="size-4" />
            Presidi multipli
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  nested,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  collapsed: boolean;
  nested?: boolean;
}) {
  const item = (
    <Link
      href={href}
      className={cn(
        "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition",
        active ? "bg-teal-700 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
        collapsed && "justify-center",
        nested && !collapsed && "ml-4",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && label}
    </Link>
  );

  if (!collapsed) {
    return item;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={item} />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
