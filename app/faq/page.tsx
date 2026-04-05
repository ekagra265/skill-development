"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { FaqSection } from "@/components/faq-section";

export default function FaqPage() {
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
            <h1 className="text-3xl font-bold tracking-tight text-foreground">FAQ</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Answers to common questions about forecasts, recommendations, and usage.
            </p>
          </div>
        </section>

        <FaqSection />
      </main>

      <Footer />
    </div>
  );
}
