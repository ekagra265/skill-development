import fs from "fs";
import path from "path";

export interface DatasetRow {
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string;
  grade: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  date: Date;
}

let cachedRows: DatasetRow[] | null = null;

export function loadDataset(): DatasetRow[] {
  if (cachedRows) return cachedRows;

  const csvPath = path.join(
    process.cwd(),
    "data",
    "Agriculture_price_dataset.csv"
  );
  const raw = fs.readFileSync(csvPath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim());
  // skip header
  const rows: DatasetRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 10) continue;

    const state = cols[0].trim();
    const district = cols[1].trim();
    const market = cols[2].trim();
    const commodity = cols[3].trim();
    const variety = cols[4].trim();
    const grade = cols[5].trim();
    const minPrice = parseFloat(cols[6]);
    const maxPrice = parseFloat(cols[7]);
    const modalPrice = parseFloat(cols[8]);
    const dateStr = cols[9].trim();
    const date = new Date(dateStr);

    if (!state || !market || !commodity || isNaN(modalPrice) || isNaN(date.getTime()))
      continue;

    rows.push({
      state,
      district,
      market,
      commodity,
      variety,
      grade,
      minPrice,
      maxPrice,
      modalPrice,
      date,
    });
  }

  rows.sort((a, b) => a.date.getTime() - b.date.getTime());
  cachedRows = rows;
  return rows;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

export function getUniqueStates(): string[] {
  const rows = loadDataset();
  return [...new Set(rows.map((r) => r.state))].sort();
}

export function getUniqueCommodities(): string[] {
  const rows = loadDataset();
  return [...new Set(rows.map((r) => r.commodity))].sort();
}

export function getMarketsForState(state: string): string[] {
  const rows = loadDataset();
  const stateNorm = norm(state);
  return [
    ...new Set(
      rows
        .filter((r) => norm(r.state) === stateNorm)
        .map((r) => r.market)
    ),
  ].sort();
}

export function getMarketsForCommodity(commodity: string): string[] {
  const rows = loadDataset();
  const commodityNorm = norm(commodity);
  return [
    ...new Set(
      rows
        .filter((r) => norm(r.commodity) === commodityNorm)
        .map((r) => r.market)
    ),
  ].sort();
}

export function resolveStateForMarket(market: string): string | null {
  const rows = loadDataset();
  const marketNorm = norm(market);
  const states = new Set(
    rows.filter((r) => norm(r.market) === marketNorm).map((r) => r.state)
  );
  if (states.size === 1) return [...states][0];
  return null;
}

export function loadProphetHistory(
  state: string | null,
  market: string,
  commodity: string
): { ds: Date; y: number }[] {
  const rows = loadDataset();
  const stateNorm = state ? norm(state) : null;
  const marketNorm = norm(market);
  const commodityNorm = norm(commodity);

  // Try exact market + commodity match (with optional state)
  let filtered = rows.filter(
    (r) =>
      norm(r.commodity) === commodityNorm &&
      norm(r.market) === marketNorm &&
      (!stateNorm || norm(r.state) === stateNorm)
  );

  // Fallback: state + commodity only
  if (!filtered.length && stateNorm) {
    filtered = rows.filter(
      (r) =>
        norm(r.commodity) === commodityNorm &&
        norm(r.state) === stateNorm
    );
  }

  // Fallback: commodity only
  if (!filtered.length) {
    filtered = rows.filter((r) => norm(r.commodity) === commodityNorm);
  }

  filtered.sort((a, b) => a.date.getTime() - b.date.getTime());
  return filtered.map((r) => ({ ds: r.date, y: r.modalPrice }));
}

export function getMarketsForStateAndCommodity(
  state: string,
  commodity: string
): string[] {
  const rows = loadDataset();
  const stateNorm = norm(state);
  const commodityNorm = norm(commodity);
  const markets = new Set(
    rows
      .filter(
        (r) =>
          norm(r.state) === stateNorm &&
          norm(r.commodity) === commodityNorm
      )
      .map((r) => r.market)
  );
  return [...markets].sort();
}

/** Get the latest modal prices for top commodities from the dataset for the Market Overview */
export function getLatestCropPrices(): {
  name: string;
  price: number;
  change: number;
  trend: "up" | "down" | "flat";
}[] {
  const rows = loadDataset();
  const commodities = ["Wheat", "Tomato", "Potato", "Onion"];
  const results: {
    name: string;
    price: number;
    change: number;
    trend: "up" | "down" | "flat";
  }[] = [];

  for (const commodity of commodities) {
    const commodityRows = rows
      .filter((r) => norm(r.commodity) === norm(commodity))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (!commodityRows.length) continue;

    // Get all unique dates
    const dates = [...new Set(commodityRows.map((r) => r.date.toISOString().split("T")[0]))].sort();
    if (dates.length < 2) {
      const lastPrice =
        commodityRows.reduce((sum, r) => sum + r.modalPrice, 0) /
        commodityRows.length;
      results.push({
        name: commodity,
        price: Math.round(lastPrice),
        change: 0,
        trend: "flat",
      });
      continue;
    }

    const latestDate = dates[dates.length - 1];
    const prevDate = dates[dates.length - 2];

    const latestRows = commodityRows.filter(
      (r) => r.date.toISOString().split("T")[0] === latestDate
    );
    const prevRows = commodityRows.filter(
      (r) => r.date.toISOString().split("T")[0] === prevDate
    );

    const latestAvg =
      latestRows.reduce((s, r) => s + r.modalPrice, 0) / latestRows.length;
    const prevAvg =
      prevRows.reduce((s, r) => s + r.modalPrice, 0) / prevRows.length;

    const changePct =
      prevAvg !== 0 ? ((latestAvg - prevAvg) / prevAvg) * 100 : 0;
    const trend: "up" | "down" | "flat" =
      changePct > 0.5 ? "up" : changePct < -0.5 ? "down" : "flat";

    results.push({
      name: commodity,
      price: Math.round(latestAvg),
      change: Math.round(changePct * 10) / 10,
      trend,
    });
  }

  return results;
}
