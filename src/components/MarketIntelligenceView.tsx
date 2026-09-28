import React from 'react';
import { InventoryItem } from '../types/discogs';
import { calculateProfitAndMargin } from '../utils/pricingEngine';
import { TrendingUp, AlertCircle, Sparkles, BarChart2, ShieldCheck, Zap } from 'lucide-react';

interface MarketIntelligenceViewProps {
  items: InventoryItem[];
  onOpenRepricer: () => void;
  onOpenAiAdvisor: (item: InventoryItem) => void;
  currencySymbol?: string;
}

export const MarketIntelligenceView: React.FC<MarketIntelligenceViewProps> = ({
  items,
  onOpenRepricer,
  onOpenAiAdvisor,
  currencySymbol = '$',
}) => {
  // Identify high-priority pricing opportunities:
  // 1. Severely underpriced (price < lowest)
  const underpricedItems = items.filter(
    (i) => i.status === 'For Sale' && i.marketStats.lowest > 0 && i.price < i.marketStats.lowest
  );

  // 2. High Wantlist / Low Supply (collector opportunities)
  const highDemandItems = items
    .filter((i) => i.status === 'For Sale' && i.marketStats.wantCount > 15000 && i.marketStats.numForSale < 30)
    .sort((a, b) => b.marketStats.wantCount - a.marketStats.wantCount);

  // 3. Stale items (>45 days listed)
  const now = Date.now();
  const staleItems = items.filter((i) => {
    const days = Math.floor((now - new Date(i.dateListed).getTime()) / (1000 * 60 * 60 * 24));
    return days > 45 && i.status === 'For Sale';
  });

  // Location/Crate distribution
  const locationMap = new Map<string, { count: number; totalValue: number }>();
  items.forEach((item) => {
    const loc = item.location || 'UNASSIGNED';
    const existing = locationMap.get(loc) || { count: 0, totalValue: 0 };
    locationMap.set(loc, {
      count: existing.count + 1,
      totalValue: existing.totalValue + item.price,
    });
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0c0e12] flex flex-col gap-6 text-xs text-neutral-300">
      {/* Top Banner with Repricer Call to Action */}
      <div className="p-5 bg-gradient-to-r from-[#141822] via-[#161b27] to-[#12161f] border border-neutral-800 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-semibold block">
            Market Intelligence Engine
          </span>
          <h2 className="text-lg font-bold text-white font-display mt-0.5">
            Discogs Marketplace Pricing &amp; Demand Insights
          </h2>
          <p className="text-xs text-neutral-400 mt-1 max-w-2xl leading-relaxed">
            Continuously compares your catalog prices against verified Discogs market transactions, competitor lowest listings, and collector wantlists to detect margin leakage.
          </p>
        </div>
        <button
          onClick={onOpenRepricer}
          className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black font-semibold rounded-md shadow transition-colors"
        >
          <Zap className="w-4 h-4 fill-current" />
          <span>Launch Bulk Repricing Wizard</span>
        </button>
      </div>

      {/* Grid: 3 Analytical Insights Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Column 1: Undervalued Releases */}
        <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="font-semibold text-white">Underpriced vs Market Lowest</h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 font-mono text-[11px] border border-emerald-800">
              {underpricedItems.length} items
            </span>
          </div>
          <p className="text-[11px] text-neutral-400">
            Releases listed below the cheapest competing copy currently available on Discogs. Potential to raise price without losing sales momentum.
          </p>

          <div className="flex-1 divide-y divide-neutral-800/80 max-h-72 overflow-y-auto">
            {underpricedItems.length === 0 ? (
              <div className="py-6 text-center text-neutral-500 text-[11px]">
                No items are currently below market lowest.
              </div>
            ) : (
              underpricedItems.map((item) => {
                const diff = item.marketStats.lowest - item.price;
                return (
                  <div key={item.id} className="py-2.5 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="font-medium text-white truncate">{item.title}</div>
                      <div className="text-[10px] text-neutral-500">
                        {item.artist} · Listed: {currencySymbol}{item.price.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-emerald-400 font-semibold text-xs">
                        +{currencySymbol}{diff.toFixed(2)}
                      </span>
                      <div className="text-[10px] text-neutral-500">
                        Lowest: {currencySymbol}{item.marketStats.lowest.toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 2: High Collector Wantlist Rarity */}
        <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="font-semibold text-white">High-Demand Grails</h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 font-mono text-[11px] border border-amber-800">
              {highDemandItems.length} items
            </span>
          </div>
          <p className="text-[11px] text-neutral-400">
            Titles with exceptional Discogs wantlist pressure (&gt;15k wants) and scarce competitor supply. High potential for premium pricing.
          </p>

          <div className="flex-1 divide-y divide-neutral-800/80 max-h-72 overflow-y-auto">
            {highDemandItems.length === 0 ? (
              <div className="py-6 text-center text-neutral-500 text-[11px]">
                No high-demand collector items in catalog.
              </div>
            ) : (
              highDemandItems.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <div className="font-medium text-white truncate">{item.title}</div>
                    <div className="text-[10px] text-neutral-500">
                      {item.artist} · {item.mediaCondition}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono text-amber-300 font-semibold text-xs">
                      {item.marketStats.wantCount.toLocaleString()} wants
                    </span>
                    <div className="text-[10px] text-neutral-500">
                      Only {item.marketStats.numForSale} copies for sale
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Stale Inventory Turnover Candidates */}
        <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <h3 className="font-semibold text-white">Stale Turnover Targets</h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 font-mono text-[11px] border border-rose-800">
              {staleItems.length} items
            </span>
          </div>
          <p className="text-[11px] text-neutral-400">
            Listed longer than 45 days without movement. Recommend running the Stale Clearance Repricing strategy to unlock capital.
          </p>

          <div className="flex-1 divide-y divide-neutral-800/80 max-h-72 overflow-y-auto">
            {staleItems.length === 0 ? (
              <div className="py-6 text-center text-neutral-500 text-[11px]">
                No stale inventory items currently.
              </div>
            ) : (
              staleItems.map((item) => {
                const days = Math.floor((now - new Date(item.dateListed).getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={item.id} className="py-2.5 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <div className="font-medium text-white truncate">{item.title}</div>
                      <div className="text-[10px] text-neutral-500">
                        {item.artist} · Price: {currencySymbol}{item.price.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-rose-400 font-semibold text-xs">
                        {days} days
                      </span>
                      <button
                        onClick={() => onOpenAiAdvisor(item)}
                        className="text-[10px] text-neutral-400 hover:text-white block underline"
                      >
                        Ask AI Advisor
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Physical Crate Valuation Breakdown */}
      <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-blue-400" />
          <h3 className="font-semibold text-white">Physical Crate &amp; Location Valuation</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {Array.from(locationMap.entries()).map(([loc, data]) => (
            <div key={loc} className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg">
              <span className="text-[11px] font-mono text-amber-400 font-semibold block truncate">
                {loc}
              </span>
              <div className="font-mono text-sm font-bold text-white mt-1">
                {currencySymbol}{data.totalValue.toFixed(2)}
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">
                {data.count} releases
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
