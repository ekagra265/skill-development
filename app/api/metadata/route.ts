import { NextResponse } from "next/server";
import {
  getUniqueStates,
  getUniqueCommodities,
  getMarketsForCommodity,
  getLatestCropPrices,
} from "@/lib/dataset";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const commodity = searchParams.get("commodity");

    if (commodity) {
      // Return markets available for the given commodity
      const markets = getMarketsForCommodity(commodity);
      return NextResponse.json({ commodity, markets });
    }

    // Return full metadata: states, commodities, and market overview prices
    const states = getUniqueStates();
    const commodities = getUniqueCommodities();
    const cropPrices = getLatestCropPrices();

    return NextResponse.json({ states, commodities, cropPrices });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load metadata";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
