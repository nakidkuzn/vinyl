import React from 'react';
import { StoreFinancialSummary } from '../types/discogs';
import { TrendingUp, AlertCircle, Package, DollarSign, Clock, ShieldCheck } from 'lucide-react';

interface MetricsBarProps {
  summary: StoreFinancialSummary;
  currencySymbol?: string;
  onFilterStale: () => void;
  onFilterUnderpriced: () => void;
  onFilterOverpriced: () => void;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({
  summary,
  currencySymbol = '$',
  onFilterStale,
  onFilterUnderpriced,
  onFilterOverpriced,
}) => {
  return (
    <div className="border-b border-neutral-800 bg-[#0e1116] px-6 py-3">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Metric 1: Total Market Valuation */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium">
            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
            <span>Store Inventory Value</span>
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-white mt-1">
            {currencySymbol}{summary.totalMarketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
            Cost basis: {currencySymbol}{summary.totalCostBasis.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* Metric 2: Projected Net Profit */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Est. Net Profit</span>
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-400 mt-1">
            {currencySymbol}{summary.projectedNetProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
            Deducting 9% Discogs fee
          </div>
        </div>

        {/* Metric 3: Average Gross Margin */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Avg Net Margin</span>
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-white mt-1">
            {summary.averageGrossMargin}%
          </div>
          <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
            Across active listings
          </div>
        </div>

        {/* Metric 4: Active Listings */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium">
            <Package className="w-3.5 h-3.5 text-neutral-400" />
            <span>Active Listings</span>
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-white mt-1">
            {summary.activeListingCount} <span className="text-xs font-normal text-neutral-500">/ {summary.totalInventoryCount} total</span>
          </div>
          <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
            {summary.draftCount} drafts · {summary.soldCount} sold
          </div>
        </div>

        {/* Metric 5: Stale Items */}
        <div 
          onClick={onFilterStale}
          className="flex flex-col cursor-pointer group rounded p-1 -m-1 hover:bg-neutral-800/40 transition-colors"
          title="Click to filter items listed > 45 days"
        >
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium group-hover:text-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Stale Records (&gt;45d)</span>
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-amber-400 mt-1">
            {summary.staleCount}
          </div>
          <div className="text-[11px] text-neutral-500 font-mono mt-0.5 group-hover:underline">
            Candidate for clearance
          </div>
        </div>

        {/* Metric 6: Market Alignment Alert */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Market Positioning</span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm font-mono tabular-nums">
            <button
              onClick={onFilterUnderpriced}
              className="text-emerald-400 hover:underline text-xs"
              title="Filter records priced below market lowest"
            >
              {summary.underpricedCount} under
            </button>
            <span className="text-neutral-600">/</span>
            <button
              onClick={onFilterOverpriced}
              className="text-amber-400 hover:underline text-xs"
              title="Filter records priced >15% above median"
            >
              {summary.overpricedCount} premium
            </button>
          </div>
          <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
            Auto-reprice to balance
          </div>
        </div>
      </div>
    </div>
  );
};
