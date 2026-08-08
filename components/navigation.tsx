// Shared navigation — section-based (mirrors original shell)
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, FileText, Pill, BarChart3, Settings, Tags, PillBottle, Printer } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuContent,
} from "@/components/ui/navigation-menu";

const mainLinks = [
  { href: "/dashboard", label: "Papan Pemuka", icon: LayoutDashboard },
  { href: "/rekod-prabungkus", label: "Rekod Prabungkus", icon: FileText },
  { href: "/senarai-ubat", label: "Senarai Ubat", icon: Pill },
  { href: "/laporan", label: "Laporan", icon: BarChart3 },
];

const udsLinks = [
  { href: "/uds/rekod-label", label: "Senarai Rekod Label", icon: Printer },
  { href: "/uds/senarai-ubat", label: "Senarai Ubat UDS", icon: PillBottle },
  { href: "/uds/laporan", label: "Laporan UDS", icon: BarChart3 },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto flex h-14 items-center gap-6 px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Tags className="h-5 w-5 text-primary" />
          <span>Sistem Prabungkus Ubat</span>
        </Link>

        <nav className="flex flex-1 items-center gap-1">
          {mainLinks.map((link) => {
            const Icon = link.icon;
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}

          <div className="relative">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-sm">UDS ▾</NavigationMenuTrigger>
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
                              <Icon className="h-4 w-4" />
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
              "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname.startsWith("/tetapan")
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Settings className="h-4 w-4" />
            Tetapan
          </Link>

          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}