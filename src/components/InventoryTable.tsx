import React, { useState } from 'react';
import {
  InventoryItem,
  ListingStatus,
  GoldmineGrade,
} from '../types/discogs';
import { InlinePriceEdit } from './InlinePriceEdit';
import { calculateProfitAndMargin, getDaysListed } from '../utils/pricingEngine';
import {
  ArrowUpDown,
  Search,
  ExternalLink,
  Sparkles,
  Edit2,
  Trash2,
  Disc,
} from 'lucide-react';

interface InventoryTableProps {
  items: InventoryItem[];
  selectedItemIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onPriceChange: (id: string, newPrice: number) => void;
  onLocationChange: (id: string, newLocation: string) => void;
  onStatusChange: (id: string, newStatus: ListingStatus) => void;
  onOpenAiAdvisor: (item: InventoryItem) => void;
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (id: string) => void;
  currencySymbol?: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  conditionFilter: string;
  setConditionFilter: (c: string) => void;
  formatFilter: string;
  setFormatFilter: (f: string) => void;
  quickFilter: string;
  setQuickFilter: (q: string) => void;
  sortField: 'price' | 'margin' | 'days' | 'title' | 'artist' | 'year';
  sortOrder: 'asc' | 'desc';
  onSort: (field: 'price' | 'margin' | 'days' | 'title' | 'artist' | 'year') => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  selectedItemIds,
  onToggleSelect,
  onToggleSelectAll,
  onPriceChange,
  onLocationChange,
  onStatusChange,
  onOpenAiAdvisor,
  onEditItem,
  onDeleteItem,
  currencySymbol = '$',
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  conditionFilter,
  setConditionFilter,
  formatFilter,
  setFormatFilter,
  quickFilter,
  setQuickFilter,
  sortField,
  sortOrder,
  onSort,
}) => {
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [locationDraft, setLocationDraft] = useState('');

  const isAllSelected = items.length > 0 && items.every((i) => selectedItemIds.has(i.id));

  const handleStartEditLocation = (item: InventoryItem) => {
    setEditingLocationId(item.id);
    setLocationDraft(item.location || '');
  };

  const handleSaveLocation = (id: string) => {
    if (locationDraft.trim()) {
      onLocationChange(id, locationDraft.trim().toUpperCase());
    }
    setEditingLocationId(null);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#0c0e12]">
      {/* Search and Filter Controls Toolbar */}
      <div className="px-6 py-3 border-b border-neutral-800/80 bg-[#101319] flex flex-wrap items-center justify-between gap-3">
        {/* Left: Search input */}
        <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by artist, title, cat #, or crate code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-neutral-900/90 border border-neutral-700/80 rounded-md text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-sans"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-neutral-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Right: Functional Filter segment tabs and dropdowns */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* Status Tabs */}
          <div className="flex items-center p-0.5 bg-neutral-900 border border-neutral-800 rounded-md">
            {['all', 'For Sale', 'Draft', 'Sold'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                  statusFilter === st
                    ? 'bg-neutral-800 text-amber-300'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {st === 'all' ? 'All Status' : st}
              </button>
            ))}
          </div>

          {/* Condition Dropdown */}
          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-neutral-900 border border-neutral-800 rounded-md text-xs text-neutral-300 focus:outline-none focus:border-amber-400"
          >
            <option value="all">All Grades</option>
            <option value="Mint (M)">Mint (M)</option>
            <option value="Near Mint (NM or M-)">Near Mint (NM)</option>
            <option value="Very Good Plus (VG+)">Very Good Plus (VG+)</option>
            <option value="Very Good (VG)">Very Good (VG)</option>
            <option value="Good Plus (G+)">Good Plus (G+)</option>
          </select>

          {/* Quick Preset Filter Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setQuickFilter(quickFilter === 'stale' ? 'none' : 'stale')}
              className={`px-2.5 py-1 rounded text-xs transition-colors border ${
                quickFilter === 'stale'
                  ? 'bg-amber-950/60 border-amber-600 text-amber-300'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Stale (&gt;45d)
            </button>
            <button
              onClick={() => setQuickFilter(quickFilter === 'underpriced' ? 'none' : 'underpriced')}
              className={`px-2.5 py-1 rounded text-xs transition-colors border ${
                quickFilter === 'underpriced'
                  ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Under Lowest
            </button>
            <button
              onClick={() => setQuickFilter(quickFilter === 'overpriced' ? 'none' : 'overpriced')}
              className={`px-2.5 py-1 rounded text-xs transition-colors border ${
                quickFilter === 'overpriced'
                  ? 'bg-indigo-950/60 border-indigo-600 text-indigo-300'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Premium (&gt;Median)
            </button>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          {/* Table Header */}
          <thead className="bg-[#12161e] border-b border-neutral-800 sticky top-0 z-10 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            <tr>
              <th className="w-10 px-4 py-2.5 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onToggleSelectAll}
                  className="rounded border-neutral-700 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  title="Select all matching items"
                />
              </th>
              <th className="px-3 py-2.5">
                <button
                  onClick={() => onSort('title')}
                  className="flex items-center gap-1 hover:text-white uppercase"
                >
                  <span>Release Details</span>
                  <ArrowUpDown className="w-3 h-3 text-neutral-500" />
                </button>
              </th>
              <th className="px-3 py-2.5">Condition (Media / Sleeve)</th>
              <th className="px-3 py-2.5">Location / Crate</th>
              <th className="px-3 py-2.5 text-right">
                <button
                  onClick={() => onSort('price')}
                  className="inline-flex items-center gap-1 hover:text-white ml-auto uppercase"
                >
                  <span>Listing Price</span>
                  <ArrowUpDown className="w-3 h-3 text-neutral-500" />
                </button>
              </th>
              <th className="px-3 py-2.5 text-center">Market Guidance</th>
              <th className="px-3 py-2.5 text-right">
                <button
                  onClick={() => onSort('margin')}
                  className="inline-flex items-center gap-1 hover:text-white ml-auto uppercase"
                >
                  <span>Cost &amp; Profit</span>
                  <ArrowUpDown className="w-3 h-3 text-neutral-500" />
                </button>
              </th>
              <th className="px-3 py-2.5 text-center">Status</th>
              <th className="px-3 py-2.5 text-center">
                <button
                  onClick={() => onSort('days')}
                  className="inline-flex items-center gap-1 hover:text-white mx-auto uppercase"
                >
                  <span>Days</span>
                  <ArrowUpDown className="w-3 h-3 text-neutral-500" />
                </button>
              </th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-neutral-800/60 text-xs">
            {items.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-16 text-center text-neutral-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Disc className="w-8 h-8 text-neutral-600 animate-spin" style={{ animationDuration: '8s' }} />
                    <span className="text-sm font-medium text-neutral-300">No inventory items matched your filter</span>
                    <span className="text-xs text-neutral-500">Try adjusting your search terms or clearing status filters</span>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const isSelected = selectedItemIds.has(item.id);
                const { netProfit, marginPercent } = calculateProfitAndMargin(item.price, item.originalCost);
                const days = getDaysListed(item.dateListed);
                const isStale = days > 45 && item.status === 'For Sale';
                const isBelowLowest = item.marketStats.lowest > 0 && item.price < item.marketStats.lowest;
                const isAboveMedian = item.marketStats.median > 0 && item.price > item.marketStats.median * 1.15;

                return (
                  <tr
                    key={item.id}
                    className={`group transition-colors h-11 ${
                      isSelected
                        ? 'bg-amber-950/20 hover:bg-amber-950/30'
                        : 'hover:bg-neutral-800/40'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(item.id)}
                        className="rounded border-neutral-700 text-amber-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      />
                    </td>

                    {/* Release Details */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2.5 min-w-[240px]">
                        <div className="w-8 h-8 rounded bg-neutral-800 flex-shrink-0 flex items-center justify-center border border-neutral-700 overflow-hidden">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <Disc className="w-4 h-4 text-neutral-400" />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-baseline gap-1.5 truncate">
                            <span className="font-semibold text-neutral-100 truncate hover:text-amber-300">
                              {item.title}
                            </span>
                            <span className="text-neutral-500 text-[11px] shrink-0">({item.year})</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 truncate">
                            <span className="text-neutral-300 truncate">{item.artist}</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-neutral-500 font-mono shrink-0">{item.catno}</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-neutral-500 shrink-0">{item.format}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Condition */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="font-medium text-neutral-200">
                          {item.mediaCondition}
                        </div>
                        <div className="text-[11px] text-neutral-500">
                          Sleeve: {item.sleeveCondition}
                        </div>
                      </div>
                    </td>

                    {/* Location / Crate */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {editingLocationId === item.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={locationDraft}
                            onChange={(e) => setLocationDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveLocation(item.id);
                              if (e.key === 'Escape') setEditingLocationId(null);
                            }}
                            onBlur={() => handleSaveLocation(item.id)}
                            autoFocus
                            className="w-24 px-1.5 py-0.5 text-xs font-mono bg-neutral-900 border border-amber-500 text-white rounded outline-none"
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEditLocation(item)}
                          className="font-mono text-neutral-400 hover:text-amber-300 text-xs flex items-center gap-1 group/loc"
                          title="Click to change storage bin / crate"
                        >
                          <span>{item.location || '—'}</span>
                          <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover/loc:opacity-100 text-neutral-500" />
                        </button>
                      )}
                    </td>

                    {/* Listing Price */}
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <div className="flex flex-col items-end">
                        <InlinePriceEdit
                          value={item.price}
                          currencySymbol={currencySymbol}
                          onSave={(newPrice) => onPriceChange(item.id, newPrice)}
                          floorPrice={item.floorPrice}
                        />
                        <div className="text-[10px] text-neutral-500 font-mono">
                          Floor: {currencySymbol}{item.floorPrice.toFixed(2)}
                        </div>
                      </div>
                    </td>

                    {/* Market Guidance Benchmark */}
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center">
                        <div className="flex items-center gap-1 text-[11px] font-mono tabular-nums text-neutral-300">
                          <span title="Lowest price currently on Discogs">
                            Low: {currencySymbol}{item.marketStats.lowest.toFixed(2)}
                          </span>
                          <span className="text-neutral-600">/</span>
                          <span className="text-amber-300 font-medium" title="Historical Median Sold Price">
                            Med: {currencySymbol}{item.marketStats.median.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {isBelowLowest && (
                            <span className="text-[10px] text-emerald-400 font-medium">
                              Undercutting lowest
                            </span>
                          )}
                          {isAboveMedian && (
                            <span className="text-[10px] text-amber-400 font-medium">
                              +15% above median
                            </span>
                          )}
                          {!isBelowLowest && !isAboveMedian && (
                            <span className="text-[10px] text-neutral-500">
                              Near median
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Cost & Profit */}
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <div className="flex flex-col items-end font-mono tabular-nums">
                        <div className="text-emerald-400 font-medium text-xs">
                          +{currencySymbol}{netProfit.toFixed(2)}
                          <span className="text-[11px] text-neutral-400 ml-1 font-normal">
                            ({marginPercent}%)
                          </span>
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          Cost: {currencySymbol}{item.originalCost.toFixed(2)}
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <select
                        value={item.status}
                        onChange={(e) => onStatusChange(item.id, e.target.value as ListingStatus)}
                        className={`text-[11px] font-medium bg-neutral-900 border rounded px-2 py-0.5 focus:outline-none ${
                          item.status === 'For Sale'
                            ? 'border-emerald-800 text-emerald-300'
                            : item.status === 'Draft'
                            ? 'border-neutral-700 text-neutral-400'
                            : 'border-neutral-800 text-neutral-500'
                        }`}
                      >
                        <option value="For Sale">For Sale</option>
                        <option value="Draft">Draft</option>
                        <option value="Sold">Sold</option>
                        <option value="Suspended">Suspended</option>
                      </select>
                    </td>

                    {/* Days Listed */}
                    <td className="px-3 py-2 text-center whitespace-nowrap font-mono tabular-nums">
                      <span className={`text-[11px] ${isStale ? 'text-amber-400 font-semibold' : 'text-neutral-400'}`}>
                        {days}d
                      </span>
                    </td>

                    {/* Row Actions */}
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenAiAdvisor(item)}
                          className="p-1 rounded text-neutral-400 hover:text-amber-300 hover:bg-neutral-800 transition-colors"
                          title="Smart AI Pricing & Market Advisor"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEditItem(item)}
                          className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                          title="Edit Release Details & Grading Notes"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={`https://www.discogs.com/release/${item.releaseId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                          title="View on Discogs Marketplace"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => onDeleteItem(item.id)}
                          className="p-1 rounded text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
                          title="Remove from inventory"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer: Total row count and page summary */}
      <div className="px-6 py-2.5 border-t border-neutral-800 bg-[#0f1217] flex items-center justify-between text-xs text-neutral-400">
        <div>
          Showing <span className="font-mono text-white font-medium">{items.length}</span> items
          {selectedItemIds.size > 0 && (
            <span className="ml-2 text-amber-400">
              ({selectedItemIds.size} selected)
            </span>
          )}
        </div>
        <div className="text-[11px] text-neutral-500">
          Tip: Click any price to inline edit · Press Enter to save
        </div>
      </div>
    </div>
  );
};
