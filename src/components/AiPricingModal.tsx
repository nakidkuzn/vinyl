import React, { useState, useEffect } from 'react';
import { InventoryItem } from '../types/discogs';
import { getSmartPricingAdvice, PricingAdvice } from '../services/aiAdvisorService';
import { calculateProfitAndMargin } from '../utils/pricingEngine';
import { Sparkles, X, TrendingUp, Check, ArrowRight, Disc } from 'lucide-react';

interface AiPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onApplyRecommendedPrice: (itemId: string, newPrice: number) => void;
  currencySymbol?: string;
}

export const AiPricingModal: React.FC<AiPricingModalProps> = ({
  isOpen,
  onClose,
  item,
  onApplyRecommendedPrice,
  currencySymbol = '$',
}) => {
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<PricingAdvice | null>(null);

  useEffect(() => {
    if (isOpen && item) {
      setLoading(true);
      setAdvice(null);
      getSmartPricingAdvice(item)
        .then((res) => {
          setAdvice(res);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const currentProfit = calculateProfitAndMargin(item.price, item.originalCost);
  const proposedProfit = advice
    ? calculateProfitAndMargin(advice.recommendedPrice, item.originalCost)
    : null;

  const handleApply = () => {
    if (advice) {
      onApplyRecommendedPrice(item.id, advice.recommendedPrice);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#101319] border border-neutral-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between bg-[#131720]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-white font-display">
              Smart Market Pricing Advisor
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4 text-xs">
          {/* Release card */}
          <div className="flex items-center gap-3 p-3 bg-neutral-900/80 border border-neutral-800 rounded-lg">
            <div className="w-10 h-10 rounded bg-neutral-800 flex items-center justify-center border border-neutral-700">
              <Disc className="w-5 h-5 text-neutral-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-white truncate text-sm">{item.title}</div>
              <div className="text-neutral-400 truncate text-xs">
                {item.artist} · <span className="text-amber-300">{item.mediaCondition}</span>
              </div>
            </div>
          </div>

          {/* Current vs Market metrics */}
          <div className="grid grid-cols-3 gap-2 text-center font-mono">
            <div className="p-2 bg-neutral-900 border border-neutral-800 rounded">
              <span className="text-[10px] text-neutral-400 block font-sans">Current Price</span>
              <span className="text-sm font-bold text-white">
                {currencySymbol}{item.price.toFixed(2)}
              </span>
            </div>
            <div className="p-2 bg-neutral-900 border border-neutral-800 rounded">
              <span className="text-[10px] text-neutral-400 block font-sans">Market Median</span>
              <span className="text-sm font-bold text-amber-300">
                {currencySymbol}{item.marketStats.median.toFixed(2)}
              </span>
            </div>
            <div className="p-2 bg-neutral-900 border border-neutral-800 rounded">
              <span className="text-[10px] text-neutral-400 block font-sans">Want / Have</span>
              <span className="text-xs font-semibold text-neutral-200">
                {item.marketStats.wantCount.toLocaleString()} / {item.marketStats.haveCount.toLocaleString()}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-neutral-400">
              <Sparkles className="w-6 h-6 text-amber-400 animate-spin" />
              <span>Analyzing historical Discogs sales velocity and competitor condition spreads...</span>
            </div>
          ) : advice ? (
            <div className="flex flex-col gap-3">
              {/* Recommendation Box */}
              <div className="p-3.5 bg-amber-950/20 border border-amber-500/40 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold block">
                    Recommended Price
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-xl font-bold font-mono text-white">
                      {currencySymbol}{advice.recommendedPrice.toFixed(2)}
                    </span>
                    <span className="text-xs font-mono text-neutral-400">
                      ({advice.marketPosition} Strategy)
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-neutral-400 block">Est. Sale Speed</span>
                  <span className="text-xs font-semibold text-emerald-400 font-mono">
                    {advice.speedOfSaleEstimate}
                  </span>
                </div>
              </div>

              {/* Rationale & Tips */}
              <div className="space-y-2 text-neutral-300">
                <div>
                  <strong className="text-white block mb-0.5">Pricing Rationale:</strong>
                  <p className="text-[11px] leading-relaxed text-neutral-300">
                    {advice.rationale}
                  </p>
                </div>
                <div>
                  <strong className="text-white block mb-0.5">Buyer Trust Tip:</strong>
                  <p className="text-[11px] leading-relaxed text-neutral-400">
                    {advice.conditionTips}
                  </p>
                </div>
              </div>

              {/* Margin projection */}
              {proposedProfit && (
                <div className="p-2.5 bg-neutral-900 border border-neutral-800 rounded flex items-center justify-between text-[11px] font-mono">
                  <span className="text-neutral-400">
                    Margin: {currentProfit.marginPercent}% &rarr;{' '}
                    <strong className="text-white">{proposedProfit.marginPercent}%</strong>
                  </span>
                  <span className="text-emerald-400">
                    Net Profit: +{currencySymbol}{proposedProfit.netProfit.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          ) : null}

          {/* Footer buttons */}
          <div className="pt-2 border-t border-neutral-800 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded text-neutral-300 hover:text-white bg-neutral-800 text-xs"
            >
              Close
            </button>
            {advice && (
              <button
                onClick={handleApply}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs shadow"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply ${advice.recommendedPrice.toFixed(2)}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
