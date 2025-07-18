
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Scissors, StickyNote, ScanLine, Layers, CircleDot, Image } from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { href: "/die-cut", label: "Die Cut", icon: Scissors },
  { href: "/kiss-cut", label: "Kiss Cut", icon: StickyNote },
  { href: "/decal", label: "Decal", icon: CircleDot },
  { href: "/sheet", label: "Sheet", icon: Layers },
  { href: "/qr-code", label: "QR Code", icon: ScanLine },
  { href: "/image-editor", label: "Image Editor", icon: Image },
];

export function NavMenu() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center h-16">
          <div className="flex items-center space-x-2 md:space-x-4">
            {menuItems.map(({ href, label, icon: Icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="h-5 w-5" />
                  <span className="hidden md:block">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
