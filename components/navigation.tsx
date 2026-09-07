// Shared navigation — section-based, mobile-friendly with Sheet drawer
"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Pill,
  BarChart3,
  Settings,
  Tags,
  PillBottle,
  Printer,
  Menu,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuContent,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

const mainLinks = [
  { href: "/dashboard", label: "Papan Pemuka", icon: LayoutDashboard, color: "text-blue-500" },
  { href: "/rekod-prabungkus", label: "Rekod Prabungkus", icon: FileText, color: "text-blue-600" },
  { href: "/senarai-ubat", label: "Senarai Ubat", icon: Pill, color: "text-emerald-500" },
  { href: "/laporan", label: "Laporan", icon: BarChart3, color: "text-indigo-500" },
];

const udsLinks = [
  { href: "/uds/rekod-label", label: "Senarai Rekod UDS", icon: Printer, color: "text-teal-500" },
  { href: "/uds/senarai-ubat", label: "Senarai Ubat UDS", icon: PillBottle, color: "text-orange-500" },
  { href: "/uds/laporan", label: "Laporan UDS", icon: BarChart3, color: "text-indigo-500" },
];

function MobileNavLink({
  link,
  pathname,
  onClose,
}: {
  link: { href: string; label: string; icon: LucideIcon; color?: string };
  pathname: string;
  onClose: () => void;
}) {
  const Icon = link.icon;
  const active = pathname.startsWith(link.href);
  return (
    <Link
      href={link.href}
      onClick={onClose}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", link.color)} />
      {link.label}
    </Link>
  );
}

export function Navigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto flex min-h-14 items-center gap-4 px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 font-semibold shrink-0"
        >
          <Tags className="h-5 w-5 text-purple-500" />
          <span>Prabungkus & UDS</span>
        </Link>

        {/* Desktop nav — hidden on mobile, wraps on narrow viewports */}
        <nav className="hidden md:flex flex-1 items-center gap-1 flex-wrap">
          {mainLinks.map((link) => {
            const Icon = link.icon;
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", link.color)} />
                {link.label}
              </Link>
            );
          })}

          <div className="relative">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-sm">
                    UDS
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[220px] gap-1 p-2">
                      {udsLinks.map((link) => {
                        const Icon = link.icon;
                        return (
                          <li key={link.href}>
                            <Link
                              href={link.href}
                              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
                            >
                              <Icon className={cn("h-4 w-4", link.color)} />
                              {link.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          <Link
            href="/tetapan"
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
              pathname.startsWith("/tetapan")
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Settings className="h-4 w-4 shrink-0 text-slate-500" />
            Tetapan
          </Link>

          <ThemeToggle />
        </nav>

        {/* Mobile controls — visible only on mobile */}
        <div className="flex items-center gap-2 md:hidden ml-auto">
          <ThemeToggle />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Buka menu" />
              }
            >
                <Menu className="h-5 w-5 text-slate-500" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetHeader className="border-b px-4 py-3">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <Tags className="h-5 w-5 text-purple-500" />
                  Prabungkus & UDS
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 p-3">
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Utama
                </div>
                {mainLinks.map((link) => (
                  <MobileNavLink
                    key={link.href}
                    link={link}
                    pathname={pathname}
                    onClose={() => setMobileOpen(false)}
                  />
                ))}

                <Separator className="my-2" />
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  UDS
                </div>
                {udsLinks.map((link) => (
                  <MobileNavLink
                    key={link.href}
                    link={link}
                    pathname={pathname}
                    onClose={() => setMobileOpen(false)}
                  />
                ))}

                <Separator className="my-2" />
                <MobileNavLink
                  link={{
                    href: "/tetapan",
                    label: "Tetapan",
                    icon: Settings,
                    color: "text-slate-500",
                  }}
                  pathname={pathname}
                  onClose={() => setMobileOpen(false)}
                />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
