"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { InsightsSection } from "@/components/insights-section";

export default function InsightsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        <section className="border-b border-border bg-secondary/35 py-6">
          <div className="container">
            <Link
              href="/"
              className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Home
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Insights</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Market signals and smart selling tips from AgriPulse.
            </p>
          </div>
        </section>

        <InsightsSection />
      </main>

      <Footer />
    </div>
  );
}
