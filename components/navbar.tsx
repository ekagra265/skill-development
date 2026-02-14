"use client";

import { useState, useEffect } from "react";
import { Menu, X, Sprout, ArrowRight } from "lucide-react";

const navLinks = [
  { label: "Dashboard", href: "#dashboard" },
  { label: "Forecast", href: "#forecast" },
  { label: "Best Mandi", href: "#best-mandi" },
  { label: "Insights", href: "#insights" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 20);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-border bg-card/90 shadow-sm backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="container flex items-center justify-between py-3.5">
        <a href="#" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform group-hover:scale-105">
            <Sprout className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">
            AgriPulse
          </span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#forecast"
            className="ml-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30"
          >
            Start Forecast
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="rounded-xl p-2.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile nav */}
      {open && (
        <nav className="border-t border-border bg-card px-5 pb-5 pt-3 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#forecast"
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-center text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20"
            >
              Start Forecast
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
