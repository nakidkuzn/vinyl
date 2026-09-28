/**
 * Discogs Store & Inventory Manager Types
 */

export type GoldmineGrade =
  | 'Mint (M)'
  | 'Near Mint (NM or M-)'
  | 'Very Good Plus (VG+)'
  | 'Very Good (VG)'
  | 'Good Plus (G+)'
  | 'Good (G)'
  | 'Fair (F)'
  | 'Poor (P)';

export type SleeveGrade =
  | GoldmineGrade
  | 'Generic'
  | 'No Cover';

export type ListingStatus = 'For Sale' | 'Draft' | 'Sold' | 'Suspended';

export type MediaFormat =
  | 'Vinyl, LP'
  | 'Vinyl, 2xLP'
  | 'Vinyl, 12", 45 RPM'
  | 'Vinyl, 7", Single'
  | 'Vinyl, Box Set'
  | 'CD, Album'
  | 'Cassette, Album';

export interface MarketStats {
  lowest: number;
  median: number;
  highest: number;
  lastSoldDate: string;
  numForSale: number;
  wantCount: number;
  haveCount: number;
  suggestedConditionPrice: number;
}

export interface InventoryItem {
  id: string;
  releaseId: number;
  masterId?: number;
  title: string;
  artist: string;
  label: string;
  catno: string;
  year: number;
  country: string;
  format: MediaFormat | string;
  genre: string[];
  mediaCondition: GoldmineGrade;
  sleeveCondition: SleeveGrade;
  price: number; // Listed or target price in USD
  originalCost: number; // Purchase / buy cost
  floorPrice: number; // Safe floor below which auto-repricer won't go
  ceilingPrice?: number;
  status: ListingStatus;
  location: string; // e.g. "BIN-A2", "CRATE-JAZZ-1"
  comments: string; // Grading notes / description
  weightGrams: number;
  dateListed: string;
  lastPriceUpdated: string;
  inCollection: boolean;
  marketStats: MarketStats;
  imageUrl?: string;
  notes?: string;
}

export type RepriceRuleType =
  | 'undercut_lowest'
  | 'match_median'
  | 'collector_premium'
  | 'condition_curve'
  | 'target_margin'
  | 'stale_decay';

export interface RepriceRule {
  id: string;
  name: string;
  description: string;
  type: RepriceRuleType;
  params: {
    undercutAmount?: number; // e.g. 0.50
    undercutPercent?: number; // e.g. 2%
    medianMultiplier?: number; // e.g. 1.0 (100% of condition median)
    premiumPercent?: number; // e.g. 15%
    targetGrossMargin?: number; // e.g. 40%
    staleDaysThreshold?: number; // e.g. 45
    staleDiscountPercent?: number; // e.g. 8%
    rounding: 'cents_99' | 'cents_50' | 'integer' | 'none';
    enforceCostFloor: boolean;
    minimumProfitFloor: number; // e.g. $3.00 minimum profit
  };
  filterCondition?: {
    statuses?: ListingStatus[];
    formats?: string[];
    mediaConditions?: GoldmineGrade[];
    staleDays?: number;
    locations?: string[];
  };
  isDefault?: boolean;
  lastRun?: string;
  itemsAffected?: number;
}

export interface BulkRepricePreviewItem {
  id: string;
  title: string;
  artist: string;
  mediaCondition: GoldmineGrade;
  currentPrice: number;
  proposedPrice: number;
  priceDelta: number;
  percentDelta: number;
  originalCost: number;
  currentMargin: number;
  proposedMargin: number;
  hitFloor: boolean;
  hitCeiling: boolean;
  floorPrice: number;
  selected: boolean;
}

export interface StoreFinancialSummary {
  totalInventoryCount: number;
  activeListingCount: number;
  draftCount: number;
  soldCount: number;
  totalMarketValue: number;
  totalCostBasis: number;
  projectedNetProfit: number;
  averageGrossMargin: number;
  staleCount: number;
  underpricedCount: number;
  overpricedCount: number;
}

export interface RepriceExecutionLog {
  id: string;
  timestamp: string;
  ruleName: string;
  itemsUpdatedCount: number;
  totalValueDelta: number;
  reverted: boolean;
  snapshots: {
    itemId: string;
    oldPrice: number;
    newPrice: number;
  }[];
}

export interface DiscogsApiConfig {
  personalAccessToken: string;
  username: string;
  currency: 'USD' | 'EUR' | 'GBP';
  autoSyncEnabled: boolean;
  syncIntervalHours: number;
  lastSyncTime?: string;
}
