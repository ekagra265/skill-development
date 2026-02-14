"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Wheat,
  Apple,
  Droplets,
  Leaf,
  Loader2,
} from "lucide-react";
import { fetchMetadata } from "@/lib/api";

interface CropPrice {
  name: string;
  price: number;
  change: number;
  trend: "up" | "down" | "flat";
}

const cropIcons: Record<string, React.ReactNode> = {
  Wheat: <Wheat className="h-5 w-5" />,
  Tomato: <Apple className="h-5 w-5" />,
  Onion: <Droplets className="h-5 w-5" />,
  Potato: <Leaf className="h-5 w-5" />,
};

function TrendBadge({ change, trend }: { change: number; trend: string }) {
  const color =
    trend === "up"
      ? "bg-success/10 text-success"
      : trend === "down"
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground";

  const Icon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}
    >
      <Icon className="h-3 w-3" />
      {change > 0 ? "+" : ""}
      {change.toFixed(1)}%
    </span>
  );
}

function CropCard({ crop }: { crop: CropPrice }) {
  return (
    <div className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
            {cropIcons[crop.name] || <Leaf className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-card-foreground">
              {crop.name}
            </h3>
            <p className="text-xs text-muted-foreground">Modal Price</p>
          </div>
        </div>
        <TrendBadge change={crop.change} trend={crop.trend} />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-card-foreground">
          {"\u20B9"}
          {crop.price.toLocaleString("en-IN")}
        </span>
        <span className="text-xs text-muted-foreground">/quintal</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${
            crop.trend === "up"
              ? "bg-success"
              : crop.trend === "down"
                ? "bg-destructive"
                : "bg-muted-foreground"
          }`}
          style={{
            width: `${Math.min(Math.abs(crop.change) * 10, 100)}%`,
          }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Daily change vs. previous trading day
      </p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted" />
          <div className="flex flex-col gap-1">
            <div className="h-4 w-16 rounded bg-muted" />
            <div className="h-3 w-20 rounded bg-muted" />
          </div>
        </div>
        <div className="h-6 w-16 rounded-full bg-muted" />
      </div>
      <div className="h-7 w-28 rounded bg-muted" />
      <div className="h-1 w-full rounded-full bg-muted" />
      <div className="h-3 w-40 rounded bg-muted" />
    </div>
  );
}

export function MarketOverview() {
  const [crops, setCrops] = useState<CropPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetadata()
      .then((data) => {
        setCrops(data.cropPrices);
      })
      .catch(() => {
        setCrops([]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="dashboard" className="py-16 md:py-20">
      <div className="container">
        <div className="mb-10 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="mb-2 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
              Market Overview
            </span>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Top Crop Prices Today
            </h2>
            <p className="mt-1 text-muted-foreground">
              Average modal prices computed from your dataset across all mandis
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : crops.map((crop) => <CropCard key={crop.name} crop={crop} />)}
          {!loading && crops.length === 0 && (
            <div className="col-span-full flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Unable to load market data
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
