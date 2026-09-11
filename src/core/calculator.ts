/**
 * Calculation and Analytics Engine for Fiverr Keyword Intelligence
 * Implements exact user formula and deterministic classifications.
 */

import {
  RawListingInput,
  SellerLevelBreakdown,
  FirstFiveRowsMetrics,
  ActiveSellerOrderRecord,
  CompetitionTier,
  DemandTier,
  LiquidityTier,
  MarketBehavior,
  OpportunityTier
} from './types.js';

export interface CalculatorConfig {
  minimumOrderThreshold?: number; // default: 30
  listingsPerRow?: number; // default: 4 (5 rows = 20 listings)
}

export class FiverrCalculator {
  private threshold: number;
  private listingsPerRow: number;

  constructor(config: CalculatorConfig = {}) {
    this.threshold = config.minimumOrderThreshold ?? 30;
    this.listingsPerRow = config.listingsPerRow ?? 4;
  }

  /**
   * Exact Average Formula: Average = (Tno * Nso) / Tns
   * Round final result to 2 decimal places.
   */
  public computeAverage(Tno: number, Nso: number, Tns: number): { average: number; rawValue: number; formulaStr: string } {
    if (Tns <= 0) {
      return { average: 0, rawValue: 0, formulaStr: `(${Tno} × ${Nso}) / ${Tns} = 0 (Invalid Tns)` };
    }
    const raw = (Tno * Nso) / Tns;
    // Round to 2 decimal places using deterministic math
    const rounded = Math.round((raw + Number.EPSILON) * 100) / 100;
    const formulaStr = `(${Tno} × ${Nso}) / ${Tns} = ${raw.toFixed(4)} → rounded ${rounded.toFixed(2)}`;
    return { average: rounded, rawValue: raw, formulaStr };
  }

  /**
   * First Five Rows Scoped Calculation
   */
  public computeFirstFiveRows(listings: RawListingInput[], Tns: number): FirstFiveRowsMetrics {
    const rowCutoff = 5 * this.listingsPerRow; // default 20 listings
    const rowsListings = listings.slice(0, rowCutoff);

    const activeListings = rowsListings.filter(l => l.ordersInQueue !== null && l.ordersInQueue > 0);
    const Nso = activeListings.length;
    const Tno = activeListings.reduce((sum, l) => sum + (l.ordersInQueue || 0), 0);
    const { average, formulaStr } = this.computeAverage(Tno, Nso, Tns);

    return {
      listingCount: rowsListings.length,
      Nso,
      Tno,
      average,
      calculationFormula: formulaStr
    };
  }

  /**
   * Computes Seller Level Distribution (Count and Percentage)
   */
  public computeSellerLevels(listings: RawListingInput[]): SellerLevelBreakdown {
    const total = listings.length || 1; // prevent div by zero
    
    const countTop = listings.filter(l => l.sellerLevel === 'Top Rated Seller').length;
    const countL2 = listings.filter(l => l.sellerLevel === 'Level 2').length;
    const countL1 = listings.filter(l => l.sellerLevel === 'Level 1').length;
    const countNew = listings.filter(l => l.sellerLevel === 'New Seller').length;
    const countUnk = listings.filter(l => l.sellerLevel === 'Unknown / Unverified').length;

    const roundPct = (count: number) => Math.round(((count / total) * 100 + Number.EPSILON) * 10) / 10;

    return {
      topRated: { count: countTop, percentage: roundPct(countTop) },
      level2: { count: countL2, percentage: roundPct(countL2) },
      level1: { count: countL1, percentage: roundPct(countL1) },
      newSeller: { count: countNew, percentage: roundPct(countNew) },
      unknown: { count: countUnk, percentage: roundPct(countUnk) }
    };
  }

  /**
   * Computes Active Seller Order Records and Market Concentration
   */
  public computeMarketConcentration(listings: RawListingInput[], Tno: number): {
    marketBehavior: MarketBehavior;
    evidence: string;
    activeSellers: ActiveSellerOrderRecord[];
  } {
    const activeListings = listings.filter(l => l.ordersInQueue !== null && l.ordersInQueue > 0);
    
    // Aggregate by seller name
    const sellerMap = new Map<string, number>();
    for (const l of activeListings) {
      const current = sellerMap.get(l.sellerUsername) || 0;
      sellerMap.set(l.sellerUsername, current + (l.ordersInQueue || 0));
    }

    const activeSellers: ActiveSellerOrderRecord[] = Array.from(sellerMap.entries())
      .map(([sellerUsername, orders]) => {
        const share = Tno > 0 ? Math.round(((orders / Tno) * 100 + Number.EPSILON) * 10) / 10 : 0;
        return { sellerUsername, orders, sharePercentage: share };
      })
      .sort((a, b) => b.orders - a.orders);

    if (activeSellers.length === 0 || Tno === 0) {
      return {
        marketBehavior: 'Distributed',
        evidence: 'No sellers currently demonstrate visible order activity on Page 1.',
        activeSellers: []
      };
    }

    // Top 2 sellers share of total visible orders
    const top1 = activeSellers[0]?.orders || 0;
    const top2 = activeSellers[1]?.orders || 0;
    const top2Sum = top1 + top2;
    const top2Share = Tno > 0 ? (top2Sum / Tno) : 0;

    if (top2Share >= 0.60) {
      const s1 = activeSellers[0]?.sellerUsername;
      const s2 = activeSellers[1]?.sellerUsername || '';
      const s2Text = s2 ? ` and ${s2}` : '';
      return {
        marketBehavior: 'Concentrated',
        evidence: `Demand appears concentrated: Top seller(s) (${s1}${s2Text}) account for ${Math.round(top2Share * 100)}% of all visible orders (${top2Sum}/${Tno}).`,
        activeSellers
      };
    }

    return {
      marketBehavior: 'Distributed',
      evidence: `Demand appears distributed across ${activeSellers.length} sellers with order activity. Top seller accounts for ${activeSellers[0]?.sharePercentage || 0}% of visible orders.`,
      activeSellers
    };
  }

  /**
   * Deterministic Classifications
   */
  public classifyCompetition(Tns: number): CompetitionTier {
    if (Tns <= 500) return 'Low';
    if (Tns <= 2000) return 'Medium';
    if (Tns <= 6000) return 'High';
    return 'Very High';
  }

  public classifyDemand(Tno: number): DemandTier {
    if (Tno < 10) return 'Low';
    if (Tno < 30) return 'Moderate';
    if (Tno < 80) return 'High';
    return 'Very High';
  }

  public classifyLiquidity(average: number): LiquidityTier {
    if (average < 0.10) return 'Low';
    if (average < 0.50) return 'Moderate';
    if (average < 1.50) return 'High';
    return 'Very High';
  }

  public evaluateStrategicOpportunity(
    Tno: number,
    average: number,
    marketBehavior: MarketBehavior,
    Tns: number,
    Nso: number
  ): { opportunity: OpportunityTier; reason: string } {
    const passedThreshold = Tno >= this.threshold;

    if (!passedThreshold) {
      return {
        opportunity: 'Weak',
        reason: `Failed the minimum order threshold of ${this.threshold} (Actual Tno = ${Tno}). Demand on the first page is too quiet to justify investment.`
      };
    }

    if (average >= 0.20 && marketBehavior === 'Distributed') {
      return {
        opportunity: 'Strong',
        reason: `Strong opportunity: Meets 30+ order threshold (Tno = ${Tno}), healthy liquidity index (${average.toFixed(2)}), and order velocity is distributed across ${Nso} independent sellers.`
      };
    }

    if (marketBehavior === 'Concentrated') {
      return {
        opportunity: 'Moderate',
        reason: `Moderate opportunity: Meets order volume threshold (${Tno} orders), but demand is heavily concentrated in the top seller(s). Requires competing with entrenched market leaders.`
      };
    }

    return {
      opportunity: 'Moderate',
      reason: `Moderate opportunity: Demonstrates active demand (${Tno} orders), but average ratio (${average.toFixed(2)}) is modest relative to total competition (${Tns} sellers).`
    };
  }

  /**
   * Discovers high-intent keywords extracted from active sellers
   */
  public discoverKeywords(listings: RawListingInput[], rootKeyword: string): string[] {
    const discovered = new Set<string>();
    const rootNorm = rootKeyword.toLowerCase().trim();

    // Focus especially on listings with verified order activity
    const activeListings = listings.filter(l => (l.ordersInQueue || 0) > 0);
    const sourcePool = activeListings.length > 0 ? activeListings : listings;

    for (const listing of sourcePool) {
      if (listing.extractedTags) {
        for (const tag of listing.extractedTags) {
          const clean = tag.toLowerCase().trim();
          if (clean && clean !== rootNorm && clean.length > 2) {
            discovered.add(clean);
          }
        }
      }

      // Extract significant 2-4 word phrases from titles
      const title = listing.gigTitle.toLowerCase()
        .replace(/^i will\s+/i, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const words = title.split(' ').filter(w => w.length > 2);
      for (let i = 0; i < words.length - 1; i++) {
        const biGram = `${words[i]} ${words[i + 1]}`;
        if (biGram !== rootNorm && !['and your', 'for your', 'with high', 'in any'].includes(biGram)) {
          discovered.add(biGram);
        }
        if (i < words.length - 2) {
          const triGram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
          if (triGram !== rootNorm) {
            discovered.add(triGram);
          }
        }
      }
    }

    return Array.from(discovered).slice(0, 15);
  }
}
