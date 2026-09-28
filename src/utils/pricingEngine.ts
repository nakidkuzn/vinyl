import {
  InventoryItem,
  RepriceRule,
  BulkRepricePreviewItem,
  StoreFinancialSummary,
} from '../types/discogs';
import { CONDITION_MULTIPLIERS } from '../data/initialInventory';

/**
 * Calculates Discogs marketplace seller fee (9%, min $0.10, max $360.00)
 */
export function calculateDiscogsFee(price: number): number {
  if (price <= 0) return 0;
  const rawFee = price * 0.09;
  return Math.min(360.0, Math.max(0.10, rawFee));
}

/**
 * Calculates payment processing fee (approx 3.49% + $0.49 standard for online marketplace transactions)
 */
export function calculatePaymentProcessingFee(price: number): number {
  if (price <= 0) return 0;
  return price * 0.0349 + 0.49;
}

/**
 * Calculates total seller fees and estimated net payout
 */
export function calculatePayout(price: number): {
  discogsFee: number;
  paymentFee: number;
  totalFees: number;
  netPayout: number;
} {
  const discogsFee = calculateDiscogsFee(price);
  const paymentFee = calculatePaymentProcessingFee(price);
  const totalFees = discogsFee + paymentFee;
  const netPayout = Math.max(0, price - totalFees);
  return { discogsFee, paymentFee, totalFees, netPayout };
}

/**
 * Calculates net profit and gross margin percentage
 */
export function calculateProfitAndMargin(price: number, originalCost: number): {
  netProfit: number;
  marginPercent: number;
} {
  const { netPayout } = calculatePayout(price);
  const netProfit = netPayout - originalCost;
  const marginPercent = price > 0 ? (netProfit / price) * 100 : 0;
  return {
    netProfit: Number(netProfit.toFixed(2)),
    marginPercent: Number(marginPercent.toFixed(1)),
  };
}

/**
 * Calculates days listed since publication
 */
export function getDaysListed(dateListedStr: string): number {
  const listed = new Date(dateListedStr).getTime();
  const now = Date.now();
  const diff = now - listed;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Applies rounding rules (.99, .50, integer, none)
 */
export function applyRounding(value: number, rounding: 'cents_99' | 'cents_50' | 'integer' | 'none'): number {
  if (rounding === 'integer') {
    return Math.round(value);
  }
  if (rounding === 'cents_50') {
    const whole = Math.floor(value);
    const cents = value - whole;
    if (cents < 0.25) return whole;
    if (cents < 0.75) return whole + 0.50;
    return whole + 1.0;
  }
  if (rounding === 'cents_99') {
    const whole = Math.floor(value);
    const cents = value - whole;
    if (cents >= 0.90) {
      return whole + 0.99;
    }
    // Round down to .99 of previous dollar or current
    return Math.max(0.99, whole - 0.01 + 1.0); // e.g., 42.10 -> 41.99 or 42.99
  }
  return Number(value.toFixed(2));
}

/**
 * Repricing engine: computes proposed price and safety bounds for an item under a given rule
 */
export function evaluateItemRepricing(
  item: InventoryItem,
  rule: RepriceRule
): {
  proposedPrice: number;
  hitFloor: boolean;
  hitCeiling: boolean;
  floorPrice: number;
} {
  const params = rule.params;
  const stats = item.marketStats;
  let target = item.price;

  switch (rule.type) {
    case 'undercut_lowest': {
      // Undercut lowest price in market for this release by fixed amount or percent
      const baseLowest = stats.lowest > 0 ? stats.lowest : stats.median;
      if (params.undercutAmount) {
        target = baseLowest - params.undercutAmount;
      } else if (params.undercutPercent) {
        target = baseLowest * (1 - params.undercutPercent / 100);
      } else {
        target = baseLowest - 0.50;
      }
      break;
    }

    case 'match_median': {
      // Match median price with multiplier
      const multiplier = params.medianMultiplier ?? 1.0;
      target = stats.median * multiplier;
      break;
    }

    case 'condition_curve': {
      // Benchmark against Mint median * condition degradation curve
      const mult = CONDITION_MULTIPLIERS[item.mediaCondition] ?? 0.7;
      // If we know release median, scale it relative to Near Mint standard (0.85)
      const baseMintEstimate = stats.median / 0.85;
      target = baseMintEstimate * mult;
      break;
    }

    case 'collector_premium': {
      // For scarce high-demand releases, premium pricing over median
      const premium = params.premiumPercent ?? 15;
      // If scarce or high wantlist, apply full premium, else standard median + 5%
      const scarcityFactor = stats.numForSale <= 15 ? 1.0 : 0.5;
      target = stats.median * (1 + (premium * scarcityFactor) / 100);
      break;
    }

    case 'stale_decay': {
      // Decay price if listed longer than threshold
      const days = getDaysListed(item.dateListed);
      const threshold = params.staleDaysThreshold ?? 45;
      if (days >= threshold) {
        const decayPct = params.staleDiscountPercent ?? 8;
        target = item.price * (1 - decayPct / 100);
      } else {
        target = item.price; // not stale yet
      }
      break;
    }

    case 'target_margin': {
      // Solve for price such that: (netPayout - originalCost) / price = targetMargin%
      // netPayout ~= price * (1 - 0.09 - 0.0349) - 0.49 = price * 0.8751 - 0.49
      // price * 0.8751 - 0.49 - cost = price * (margin / 100)
      // price * (0.8751 - margin / 100) = cost + 0.49
      // price = (cost + 0.49) / (0.8751 - margin / 100)
      const marginFrac = (params.targetGrossMargin ?? 40) / 100;
      const netMultiplier = 1 - 0.09 - 0.0349; // 0.8751
      const denominator = netMultiplier - marginFrac;
      if (denominator > 0.05) {
        target = (item.originalCost + 0.49) / denominator;
      } else {
        target = item.originalCost * 2.5;
      }
      break;
    }

    default:
      target = item.price;
  }

  // Calculate minimum floor protection
  let effectiveFloor = item.floorPrice > 0 ? item.floorPrice : item.originalCost * 1.25;
  if (params.enforceCostFloor) {
    const minProfit = params.minimumProfitFloor ?? 3.0;
    // Payout must cover cost + minProfit
    // price * 0.875 - 0.49 >= cost + minProfit
    const costBasedFloor = (item.originalCost + minProfit + 0.49) / 0.875;
    effectiveFloor = Math.max(effectiveFloor, costBasedFloor);
  }

  let hitFloor = false;
  let hitCeiling = false;

  if (target < effectiveFloor) {
    target = effectiveFloor;
    hitFloor = true;
  }

  if (item.ceilingPrice && target > item.ceilingPrice) {
    target = item.ceilingPrice;
    hitCeiling = true;
  }

  // Apply rounding
  const roundedPrice = applyRounding(target, params.rounding);

  return {
    proposedPrice: Math.max(1.0, roundedPrice),
    hitFloor,
    hitCeiling,
    floorPrice: Number(effectiveFloor.toFixed(2)),
  };
}

/**
 * Builds bulk preview data for a list of items and a rule
 */
export function generateRepricePreview(
  items: InventoryItem[],
  rule: RepriceRule
): BulkRepricePreviewItem[] {
  return items.map((item) => {
    const { proposedPrice, hitFloor, hitCeiling, floorPrice } = evaluateItemRepricing(item, rule);
    const priceDelta = Number((proposedPrice - item.price).toFixed(2));
    const percentDelta = item.price > 0 ? Number(((priceDelta / item.price) * 100).toFixed(1)) : 0;
    
    const { marginPercent: currentMargin } = calculateProfitAndMargin(item.price, item.originalCost);
    const { marginPercent: proposedMargin } = calculateProfitAndMargin(proposedPrice, item.originalCost);

    return {
      id: item.id,
      title: item.title,
      artist: item.artist,
      mediaCondition: item.mediaCondition,
      currentPrice: item.price,
      proposedPrice,
      priceDelta,
      percentDelta,
      originalCost: item.originalCost,
      currentMargin,
      proposedMargin,
      hitFloor,
      hitCeiling,
      floorPrice,
      selected: Math.abs(priceDelta) > 0.05, // select if price actually changes
    };
  });
}

/**
 * Computes store-level financial summary
 */
export function calculateStoreSummary(items: InventoryItem[]): StoreFinancialSummary {
  const activeItems = items.filter((i) => i.status === 'For Sale');
  const draftItems = items.filter((i) => i.status === 'Draft');
  const soldItems = items.filter((i) => i.status === 'Sold');

  const totalMarketValue = activeItems.reduce((acc, i) => acc + i.price, 0);
  const totalCostBasis = activeItems.reduce((acc, i) => acc + i.originalCost, 0);

  let totalNetProfit = 0;
  let totalMarginSum = 0;

  activeItems.forEach((item) => {
    const { netProfit, marginPercent } = calculateProfitAndMargin(item.price, item.originalCost);
    totalNetProfit += netProfit;
    totalMarginSum += marginPercent;
  });

  const averageGrossMargin =
    activeItems.length > 0 ? Number((totalMarginSum / activeItems.length).toFixed(1)) : 0;

  // Stale items (>45 days)
  const staleCount = activeItems.filter((i) => getDaysListed(i.dateListed) > 45).length;

  // Underpriced (< lowest market price)
  const underpricedCount = activeItems.filter((i) => i.price < i.marketStats.lowest).length;

  // Overpriced (> 15% above median)
  const overpricedCount = activeItems.filter((i) => i.price > i.marketStats.median * 1.15).length;

  return {
    totalInventoryCount: items.length,
    activeListingCount: activeItems.length,
    draftCount: draftItems.length,
    soldCount: soldItems.length,
    totalMarketValue: Number(totalMarketValue.toFixed(2)),
    totalCostBasis: Number(totalCostBasis.toFixed(2)),
    projectedNetProfit: Number(totalNetProfit.toFixed(2)),
    averageGrossMargin,
    staleCount,
    underpricedCount,
    overpricedCount,
  };
}
