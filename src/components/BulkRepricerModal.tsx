import React, { useState, useMemo } from 'react';
import {
  InventoryItem,
  RepriceRule,
  BulkRepricePreviewItem,
  RepriceExecutionLog,
} from '../types/discogs';
import { DEFAULT_REPRICE_RULES } from '../data/initialInventory';
import { generateRepricePreview } from '../utils/pricingEngine';
import {
  SlidersHorizontal,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  X,
  Play,
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';

interface BulkRepricerModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  selectedItemIds: Set<string>;
  onApplyRepricing: (
    updates: { itemId: string; newPrice: number; oldPrice: number }[],
    ruleName: string
  ) => void;
  executionLogs: RepriceExecutionLog[];
  onUndoLastReprice: () => void;
  currencySymbol?: string;
}

export const BulkRepricerModal: React.FC<BulkRepricerModalProps> = ({
  isOpen,
  onClose,
  inventory,
  selectedItemIds,
  onApplyRepricing,
  executionLogs,
  onUndoLastReprice,
  currencySymbol = '$',
}) => {
  const [rules] = useState<RepriceRule[]>(DEFAULT_REPRICE_RULES);
  const [selectedRuleId, setSelectedRuleId] = useState<string>(DEFAULT_REPRICE_RULES[0].id);

  // Scope: 'all', 'selected', 'for_sale_only', 'stale_only'
  const [scope, setScope] = useState<'all' | 'selected' | 'for_sale_only' | 'stale_only'>(
    selectedItemIds.size > 0 ? 'selected' : 'for_sale_only'
  );

  // Custom overrides for currently active rule
  const [rounding, setRounding] = useState<'cents_99' | 'cents_50' | 'integer' | 'none'>('cents_99');
  const [enforceCostFloor, setEnforceCostFloor] = useState(true);
  const [minProfitFloor, setMinProfitFloor] = useState(4.0);

  // Active rule definition with applied overrides
  const activeRule = useMemo(() => {
    const base = rules.find((r) => r.id === selectedRuleId) || rules[0];
    return {
      ...base,
      params: {
        ...base.params,
        rounding,
        enforceCostFloor,
        minimumProfitFloor: minProfitFloor,
      },
    };
  }, [rules, selectedRuleId, rounding, enforceCostFloor, minProfitFloor]);

  // Filter items matching scope
  const scopedItems = useMemo(() => {
    if (scope === 'selected') {
      return inventory.filter((i) => selectedItemIds.has(i.id));
    }
    if (scope === 'stale_only') {
      const now = Date.now();
      return inventory.filter((i) => {
        const days = Math.floor((now - new Date(i.dateListed).getTime()) / (1000 * 60 * 60 * 24));
        return days > 45 && i.status === 'For Sale';
      });
    }
    if (scope === 'for_sale_only') {
      return inventory.filter((i) => i.status === 'For Sale');
    }
    return inventory;
  }, [inventory, scope, selectedItemIds]);

  // Generate preview items based on active rule
  const initialPreviews = useMemo(() => {
    return generateRepricePreview(scopedItems, activeRule);
  }, [scopedItems, activeRule]);

  // Interactive selection states for individual items in preview
  const [selectedPreviewIds, setSelectedPreviewIds] = useState<Set<string>>(() => {
    return new Set(initialPreviews.filter((p) => p.selected).map((p) => p.id));
  });

  // Keep selected preview IDs in sync when rule/scope changes
  React.useEffect(() => {
    setSelectedPreviewIds(new Set(initialPreviews.filter((p) => p.selected).map((p) => p.id)));
  }, [initialPreviews]);

  const togglePreviewItem = (id: string) => {
    setSelectedPreviewIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllPreviews = () => {
    setSelectedPreviewIds(new Set(initialPreviews.map((p) => p.id)));
  };

  const deselectAllPreviews = () => {
    setSelectedPreviewIds(new Set());
  };

  // Aggregated preview statistics
  const previewStats = useMemo(() => {
    let totalOldValue = 0;
    let totalNewValue = 0;
    let floorHitCount = 0;
    const itemsToUpdate = initialPreviews.filter((p) => selectedPreviewIds.has(p.id));

    itemsToUpdate.forEach((p) => {
      totalOldValue += p.currentPrice;
      totalNewValue += p.proposedPrice;
      if (p.hitFloor) floorHitCount++;
    });

    const netValueDelta = Number((totalNewValue - totalOldValue).toFixed(2));
    const percentChange = totalOldValue > 0 ? Number(((netValueDelta / totalOldValue) * 100).toFixed(1)) : 0;

    return {
      count: itemsToUpdate.length,
      netValueDelta,
      percentChange,
      floorHitCount,
      totalOldValue,
      totalNewValue,
    };
  }, [initialPreviews, selectedPreviewIds]);

  const handleExecute = () => {
    const itemsToUpdate = initialPreviews
      .filter((p) => selectedPreviewIds.has(p.id))
      .map((p) => ({
        itemId: p.id,
        newPrice: p.proposedPrice,
        oldPrice: p.currentPrice,
      }));

    if (itemsToUpdate.length === 0) return;

    onApplyRepricing(itemsToUpdate, activeRule.name);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#101319] border border-neutral-800 rounded-xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-[#131720]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-display">
                Automated Bulk Repricing Engine
              </h2>
              <p className="text-xs text-neutral-400">
                Simulate and bulk execute algorithmic pricing strategies across your Discogs catalog
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Split view (Left: Strategy config, Right: Live preview) */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Column: Strategy Selection & Safeguard Controls */}
          <div className="w-full md:w-80 border-r border-neutral-800 p-5 flex flex-col gap-5 overflow-y-auto bg-[#0d1015]">
            {/* 1. Scope selection */}
            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-2">
                1. Target Scope
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setScope('for_sale_only')}
                  className={`px-2.5 py-1.5 rounded text-left transition-colors border ${
                    scope === 'for_sale_only'
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-medium'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  For Sale ({inventory.filter((i) => i.status === 'For Sale').length})
                </button>
                <button
                  type="button"
                  onClick={() => setScope('selected')}
                  disabled={selectedItemIds.size === 0}
                  className={`px-2.5 py-1.5 rounded text-left transition-colors border ${
                    selectedItemIds.size === 0
                      ? 'opacity-40 cursor-not-allowed bg-neutral-900 border-neutral-800 text-neutral-500'
                      : scope === 'selected'
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-medium'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  Selected ({selectedItemIds.size})
                </button>
                <button
                  type="button"
                  onClick={() => setScope('stale_only')}
                  className={`px-2.5 py-1.5 rounded text-left transition-colors border ${
                    scope === 'stale_only'
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-medium'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  Stale &gt;45d
                </button>
                <button
                  type="button"
                  onClick={() => setScope('all')}
                  className={`px-2.5 py-1.5 rounded text-left transition-colors border ${
                    scope === 'all'
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-medium'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  All Items ({inventory.length})
                </button>
              </div>
            </div>

            {/* 2. Repricing Strategy Cards */}
            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-2">
                2. Select Strategy Rule
              </label>
              <div className="flex flex-col gap-2">
                {rules.map((rule) => {
                  const isSelected = rule.id === selectedRuleId;
                  return (
                    <button
                      key={rule.id}
                      type="button"
                      onClick={() => setSelectedRuleId(rule.id)}
                      className={`p-3 rounded-lg text-left transition-all border ${
                        isSelected
                          ? 'bg-amber-950/30 border-amber-500/60 shadow-sm'
                          : 'bg-neutral-900/60 border-neutral-800/80 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${isSelected ? 'text-amber-300' : 'text-neutral-200'}`}>
                          {rule.name}
                        </span>
                        {isSelected && <Zap className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                        {rule.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Safety Floor & Rounding Protections */}
            <div className="pt-2 border-t border-neutral-800">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5 mb-2.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Risk &amp; Margin Protections</span>
              </label>

              <div className="flex flex-col gap-3 text-xs">
                {/* Enforce floor */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enforceCostFloor}
                    onChange={(e) => setEnforceCostFloor(e.target.checked)}
                    className="rounded border-neutral-700 text-amber-500 focus:ring-0"
                  />
                  <span className="text-neutral-300">Enforce Hard Cost Floor</span>
                </label>

                {/* Min Profit per item */}
                {enforceCostFloor && (
                  <div className="flex items-center justify-between pl-5">
                    <span className="text-[11px] text-neutral-400">Min Net Profit:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-neutral-400 text-xs">{currencySymbol}</span>
                      <input
                        type="number"
                        step="0.50"
                        min="1.0"
                        value={minProfitFloor}
                        onChange={(e) => setMinProfitFloor(parseFloat(e.target.value) || 0)}
                        className="w-14 px-1.5 py-0.5 bg-neutral-900 border border-neutral-700 rounded text-xs text-white font-mono text-right"
                      />
                    </div>
                  </div>
                )}

                {/* Rounding option */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-neutral-400">Price Ending:</span>
                  <select
                    value={rounding}
                    onChange={(e) => setRounding(e.target.value as 'cents_99' | 'cents_50' | 'integer' | 'none')}
                    className="bg-neutral-900 border border-neutral-700 text-xs rounded px-2 py-0.5 text-neutral-300 focus:outline-none"
                  >
                    <option value="cents_99">.99 Cents ($49.99)</option>
                    <option value="cents_50">.50 Cents ($49.50)</option>
                    <option value="integer">Integer ($50.00)</option>
                    <option value="none">Exact Float</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Batch Preview & Impact Summary */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#0c0e12]">
            {/* Impact Banner */}
            <div className="p-4 border-b border-neutral-800 bg-[#12161f] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-neutral-400 block text-[10px] font-sans">Items Adjusted:</span>
                  <span className="text-sm font-bold text-white tabular-nums">
                    {previewStats.count} / {initialPreviews.length}
                  </span>
                </div>
                <div className="h-6 w-px bg-neutral-800" />
                <div>
                  <span className="text-neutral-400 block text-[10px] font-sans">Store Net Delta:</span>
                  <span
                    className={`text-sm font-bold tabular-nums ${
                      previewStats.netValueDelta >= 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {previewStats.netValueDelta >= 0 ? '+' : ''}
                    {currencySymbol}
                    {previewStats.netValueDelta.toFixed(2)} ({previewStats.percentChange}%)
                  </span>
                </div>
                {previewStats.floorHitCount > 0 && (
                  <>
                    <div className="h-6 w-px bg-neutral-800" />
                    <div className="flex items-center gap-1 text-amber-400">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span className="text-xs">
                        {previewStats.floorHitCount} items clamped by floor
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Selection toggles for preview list */}
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={selectAllPreviews}
                  className="text-neutral-400 hover:text-white"
                >
                  Select All
                </button>
                <span className="text-neutral-600">·</span>
                <button
                  type="button"
                  onClick={deselectAllPreviews}
                  className="text-neutral-400 hover:text-white"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Preview Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#11141c] border-b border-neutral-800 text-[11px] font-semibold text-neutral-400 sticky top-0 uppercase tracking-wider">
                  <tr>
                    <th className="w-8 px-4 py-2 text-center">
                      <CheckCircle2 className="w-3.5 h-3.5 mx-auto text-neutral-500" />
                    </th>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2 text-right">Current Price</th>
                    <th className="px-2 py-2 text-center"></th>
                    <th className="px-3 py-2 text-left">Proposed Price</th>
                    <th className="px-3 py-2 text-right">Price Delta</th>
                    <th className="px-3 py-2 text-right">Margin Shift</th>
                    <th className="px-3 py-2 text-center">Safety Protection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 font-mono tabular-nums">
                  {initialPreviews.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-neutral-500 font-sans text-xs">
                        No items match the selected scope.
                      </td>
                    </tr>
                  ) : (
                    initialPreviews.map((p) => {
                      const isChecked = selectedPreviewIds.has(p.id);
                      return (
                        <tr
                          key={p.id}
                          className={`hover:bg-neutral-800/40 transition-colors ${
                            !isChecked ? 'opacity-40' : ''
                          }`}
                        >
                          <td className="px-4 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePreviewItem(p.id)}
                              className="rounded border-neutral-700 text-amber-500 focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-2 font-sans">
                            <div className="truncate max-w-[200px] font-medium text-neutral-200">
                              {p.title}
                            </div>
                            <div className="text-[11px] text-neutral-400 truncate">
                              {p.artist} · <span className="text-neutral-500">{p.mediaCondition}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right text-neutral-300">
                            {currencySymbol}{p.currentPrice.toFixed(2)}
                          </td>
                          <td className="px-2 py-2 text-center text-neutral-600">
                            <ArrowRight className="w-3 h-3 inline" />
                          </td>
                          <td className="px-3 py-2 text-left font-semibold text-white">
                            {currencySymbol}{p.proposedPrice.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span
                              className={
                                p.priceDelta > 0
                                  ? 'text-emerald-400'
                                  : p.priceDelta < 0
                                  ? 'text-amber-400'
                                  : 'text-neutral-400'
                              }
                            >
                              {p.priceDelta > 0 ? '+' : ''}
                              {currencySymbol}
                              {p.priceDelta.toFixed(2)}
                              <span className="text-[10px] text-neutral-500 ml-1">
                                ({p.percentDelta}%)
                              </span>
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right text-[11px] text-neutral-300">
                            {p.currentMargin}% <span className="text-neutral-500">&rarr;</span>{' '}
                            <span className="font-semibold text-white">{p.proposedMargin}%</span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {p.hitFloor ? (
                              <span className="text-[10px] text-amber-400 font-sans font-medium flex items-center justify-center gap-1">
                                <ShieldAlert className="w-3 h-3" /> Clamped at Floor (${p.floorPrice.toFixed(2)})
                              </span>
                            ) : (
                              <span className="text-[10px] text-neutral-500 font-sans">Optimal</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-800 bg-[#131720] flex items-center justify-between">
          <div className="flex items-center gap-3">
            {executionLogs.length > 0 && !executionLogs[0].reverted && (
              <button
                type="button"
                onClick={onUndoLastReprice}
                className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white px-2.5 py-1.5 rounded hover:bg-neutral-800 transition-colors"
                title="Rollback last executed price batch"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Undo Last Batch ({executionLogs[0].itemsUpdatedCount} items)</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-800 rounded-md hover:bg-neutral-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={previewStats.count === 0}
              onClick={handleExecute}
              className={`flex items-center gap-2 px-5 py-1.5 text-xs font-semibold rounded-md shadow transition-colors ${
                previewStats.count === 0
                  ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  : 'bg-amber-400 text-black hover:bg-amber-300'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Apply Repricing to {previewStats.count} Items</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
