"use client";

import { CalendarDays, Ticket, TicketCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/evenements/inscriptions", label: "Inscriptions", icon: TicketCheck },
  { href: "/evenements/liste", label: "Évènements", icon: CalendarDays },
  { href: "/evenements/admissions", label: "Admission", icon: Ticket },
];

export default function EvenementsTabs() {
  const pathname = usePathname();

  return (
    <div className="mt-6 flex gap-2 border-b border-black/[.08] dark:border-white/[.08]">
      {TABS.map((t) => {
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
              pathname === t.href
                ? "border-b-2 border-primary text-primary"
                : "text-foreground/60 hover:text-foreground"
            }`}
          >
            <Icon size={16} />
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
