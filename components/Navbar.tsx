"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LEAGUES = [
  {
    id: "nba",
    label: "NBA",
    accent: "text-blue-300",
    links: [
      { label: "All Salaries", href: "/nba" },
      { label: "Highest Paid", href: "/nba/highest-paid-players" },
      { label: "Lowest Paid", href: "/nba/lowest-paid-players" },
      { label: "Average Salary", href: "/nba/average-salary" },
      { label: "Salary Cap", href: "/nba/salary-cap" },
      { label: "Rookie Salaries", href: "/nba/rookie-salaries" },
    ],
  },
  {
    id: "wnba",
    label: "WNBA",
    accent: "text-accent",
    links: [
      { label: "All Salaries", href: "/wnba" },
      { label: "Highest Paid", href: "/wnba/highest-paid-players" },
      { label: "Lowest Paid", href: "/wnba/lowest-paid-players" },
      { label: "Average Salary", href: "/wnba/average-salary" },
      { label: "Salary Cap", href: "/wnba/salary-cap" },
      { label: "Rookie Salaries", href: "/wnba/rookie-salaries" },
    ],
  },
];

type LeagueDropdownProps = {
  league: (typeof LEAGUES)[0];
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};

function LeagueDropdown({ league, isOpen, onOpen, onClose }: LeagueDropdownProps) {
  const pathname = usePathname();
  const active = pathname?.startsWith(`/${league.id}`);

  return (
    <div className="relative">
      <button
        onMouseEnter={onOpen}
        onClick={() => (isOpen ? onClose() : onOpen())}
        className={`flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
          active || isOpen
            ? `${league.accent} bg-white/[0.06]`
            : "text-court-300 hover:text-white hover:bg-white/[0.06]"
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {league.label}
        <svg
          viewBox="0 0 24 24"
          className={`h-3.5 w-3.5 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-44 rounded-xl border border-white/10 bg-court-950/98 backdrop-blur-sm shadow-xl z-50 py-1">
          {league.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className="block px-4 py-2 text-sm text-court-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  // Close desktop dropdowns and mobile menu on navigation
  useEffect(() => {
    setOpenId(null);
    setMobileOpen(false);
    setMobileExpanded(null);
  }, [pathname]);

  // Close desktop dropdowns when clicking outside the nav
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <nav
      ref={navRef}
      className="sticky top-0 z-50 border-b border-white/[0.06] bg-court-950/90 backdrop-blur-md"
      onMouseLeave={() => setOpenId(null)}
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="text-base font-bold text-white hover:text-accent transition-colors"
          >
            Player Pay
          </Link>

          {/* Desktop nav - single shared open state */}
          <div className="hidden sm:flex items-center gap-1">
            {LEAGUES.map((league) => (
              <LeagueDropdown
                key={league.id}
                league={league}
                isOpen={openId === league.id}
                onOpen={() => setOpenId(league.id)}
                onClose={() => setOpenId(null)}
              />
            ))}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="sm:hidden p-2 rounded-lg text-court-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {mobileOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-white/[0.06] bg-court-950/98 pb-3">
          {LEAGUES.map((league) => (
            <div key={league.id}>
              <button
                onClick={() =>
                  setMobileExpanded((e) => (e === league.id ? null : league.id))
                }
                className={`flex w-full items-center justify-between px-5 py-3 text-sm font-medium transition-colors ${
                  mobileExpanded === league.id ? league.accent : "text-court-300"
                }`}
              >
                {league.label}
                <svg
                  viewBox="0 0 24 24"
                  className={`h-3.5 w-3.5 transition-transform ${
                    mobileExpanded === league.id ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {mobileExpanded === league.id && (
                <div className="pl-8 pb-1">
                  {league.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="block py-2 text-sm text-court-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </nav>
  );
}
