"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListTodo,
  Network,
  Trophy
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { name: "Home", href: "/", icon: LayoutDashboard },
    { name: "Planner", href: "/planner", icon: ListTodo },
    { name: "Skill Map", href: "/skill-map", icon: Network },
    { name: "Progress", href: "/progress", icon: Trophy },
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center justify-between gap-3 rounded-full border border-white/20 bg-white/10 px-6 py-3 shadow-md backdrop-blur-md">
      {navLinks.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full px-2 py-1 text-sm transition-colors duration-200 ${
              isActive
                ? "bg-blue-500/30 text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon size={18} />
            <span className="truncate whitespace-nowrap text-[10px] font-bold uppercase tracking-tight">
              {link.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}