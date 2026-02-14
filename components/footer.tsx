import { Sprout } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="container py-10">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-primary">
              <Sprout className="h-6 w-6" />
              <span className="text-lg font-bold text-foreground">AgriPulse</span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
              Prescriptive agricultural intelligence for smarter farming and
              trading decisions across India.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Product
              </h4>
              <a href="#dashboard" className="text-sm text-muted-foreground hover:text-foreground">
                Dashboard
              </a>
              <a href="#forecast" className="text-sm text-muted-foreground hover:text-foreground">
                Forecast
              </a>
              <a href="#best-mandi" className="text-sm text-muted-foreground hover:text-foreground">
                Best Mandi
              </a>
            </div>
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Resources
              </h4>
              <a href="#insights" className="text-sm text-muted-foreground hover:text-foreground">
                Insights
              </a>
              <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground">
                FAQ
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                API Docs
              </a>
            </div>
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Company
              </h4>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                About
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                Contact
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                Privacy
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          2026 AgriPulse. All rights reserved. Built for Indian Agriculture.
        </div>
      </div>
    </footer>
  );
}
