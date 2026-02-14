import {
  TrendingUp,
  TrendingDown,
  Minus,
  Wheat,
  Bean,
  Apple,
  Leaf,
  Droplets,
  Flower,
} from "lucide-react";
import type { CropOverview } from "@/lib/types";

const cropIcons: Record<string, React.ReactNode> = {
  Wheat: <Wheat className="h-5 w-5" />,
  Rice: <Bean className="h-5 w-5" />,
  Tomato: <Apple className="h-5 w-5" />,
  Onion: <Droplets className="h-5 w-5" />,
  Cotton: <Flower className="h-5 w-5" />,
  Soybean: <Leaf className="h-5 w-5" />,
};

const sampleCrops: CropOverview[] = [
  { name: "Wheat", icon: "Wheat", price: 2450, change: 3.2, trend: "up" },
  { name: "Rice", icon: "Rice", price: 3180, change: -1.8, trend: "down" },
  { name: "Tomato", icon: "Tomato", price: 1890, change: 8.5, trend: "up" },
  { name: "Onion", icon: "Onion", price: 1620, change: -4.1, trend: "down" },
  { name: "Cotton", icon: "Cotton", price: 6750, change: 1.2, trend: "up" },
  { name: "Soybean", icon: "Soybean", price: 4320, change: 0.0, trend: "flat" },
];

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

function CropCard({ crop }: { crop: CropOverview }) {
  return (
    <div className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
            {cropIcons[crop.icon] || <Leaf className="h-5 w-5" />}
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
          {"\u20B9"}{crop.price.toLocaleString("en-IN")}
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
          style={{ width: `${Math.min(Math.abs(crop.change) * 10, 100)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Weekly change vs. previous 7 days
      </p>
    </div>
  );
}

export function MarketOverview() {
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
              Real-time modal prices from mandis across India
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sampleCrops.map((crop) => (
            <CropCard key={crop.name} crop={crop} />
          ))}
        </div>
      </div>
    </section>
  );
}
