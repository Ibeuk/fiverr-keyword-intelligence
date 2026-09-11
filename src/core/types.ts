/**
 * Core Type Definitions for Fiverr Keyword Intelligence Engine
 * Adheres strictly to: Fiverr itself is the primary source of truth.
 */

export type SellerLevel = 
  | 'Top Rated Seller'
  | 'Level 2'
  | 'Level 1'
  | 'New Seller'
  | 'Unknown / Unverified';

export type ListingType = 'organic' | 'promoted' | 'unknown';

export type CompetitionTier = 'Low' | 'Medium' | 'High' | 'Very High';
export type DemandTier = 'Low' | 'Moderate' | 'High' | 'Very High';
export type LiquidityTier = 'Low' | 'Moderate' | 'High' | 'Very High';
export type MarketBehavior = 'Concentrated' | 'Distributed';
export type OpportunityTier = 'Strong' | 'Moderate' | 'Weak' | 'Insufficient Data';

export interface RawListingInput {
  position: number;
  gigId: string;
  gigTitle: string;
  gigUrl: string;
  sellerUsername: string;
  sellerLevel: SellerLevel;
  isFiverrChoice: boolean;
  isPromoted: boolean;
  ordersInQueue: number | null; // null if unverified/unavailable
  ratingScore: number | null;
  ratingCount: number | null;
  priceStartingUSD?: number | null;
  extractedTags?: string[];
  rawEvidenceSnippet?: string;
}

export interface RawSearchCapture {
  searchQuery: string;
  searchUrl?: string;
  capturedAt: string; // ISO 8601
  rawResultCountText: string; // e.g., "1,100+ results"
  listings: RawListingInput[];
  metadata?: {
    collectorVersion?: string;
    hasQuickView?: boolean;
    browserUserAgent?: string;
  };
}

export interface LevelMetric {
  count: number;
  percentage: number;
}

export interface SellerLevelBreakdown {
  topRated: LevelMetric;
  level2: LevelMetric;
  level1: LevelMetric;
  newSeller: LevelMetric;
  unknown: LevelMetric;
}

export interface FirstFiveRowsMetrics {
  listingCount: number;
  Nso: number;
  Tno: number;
  average: number;
  calculationFormula: string;
}

export interface ActiveSellerOrderRecord {
  sellerUsername: string;
  orders: number;
  sharePercentage: number;
}

export interface VerifiedSearchAnalysis {
  id: string;
  keyword: string;
  searchUrl?: string;
  analyzedAt: string;
  status: 'VERIFIED' | 'INSUFFICIENT_DATA';
  validationErrors: string[];

  // Core First-Page Metrics
  Tns: number; // Total Number of Sellers (from Fiverr search count)
  Nsf: number; // Number of Sellers on First Page (verified unique listings)
  Nfc: number; // Count of Fiverr Choice badges
  Nso: number; // Number of sellers showing order activity (orders > 0)
  Tno: number; // Total visible orders (sum of orders)
  average: number; // Exact formula: (Tno * Nso) / Tns (rounded to 2 decimal places)
  calculationFormula: string;

  // First Five Rows Dedicated Analysis (rows 1-5, e.g. top 20 listings)
  firstFiveRows: FirstFiveRowsMetrics;

  // Seller Level Analysis
  sellerLevels: SellerLevelBreakdown;

  // 30+ Order Opportunity Threshold
  orderThresholdPassed: boolean;
  configuredThreshold: number;

  // Market Classifications
  competition: CompetitionTier;
  demand: DemandTier;
  liquidity: LiquidityTier;
  marketBehavior: MarketBehavior;
  marketBehaviorEvidence: string;
  strategicOpportunity: OpportunityTier;
  strategicReason: string;

  // Audit & Forensic Evidence
  activeSellers: ActiveSellerOrderRecord[];
  listings: RawListingInput[];
  discoveredKeywords: string[];
}

export interface MasterRankRecord {
  rank: number;
  keyword: string;
  Tns: number;
  Tno: number;
  Nso: number;
  average: number;
  opportunity: OpportunityTier;
  analyzedAt: string;
  status: 'VERIFIED' | 'INSUFFICIENT_DATA';
}
