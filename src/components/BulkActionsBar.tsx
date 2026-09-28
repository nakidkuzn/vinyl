import React, { useState } from 'react';
import { SlidersHorizontal, MapPin, Tag, Download, X, CheckSquare } from 'lucide-react';
import { ListingStatus } from '../types/discogs';

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onOpenRepricerForSelected: () => void;
  onBulkAdjustPricePercent: (percent: number) => void;
  onBulkSetLocation: (location: string) => void;
  onBulkSetStatus: (status: ListingStatus) => void;
  onExportSelectedCsv: () => void;
}

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  onClearSelection,
  onOpenRepricerForSelected,
  onBulkAdjustPricePercent,
  onBulkSetLocation,
  onBulkSetStatus,
  onExportSelectedCsv,
}) => {
  const [showPricePopover, setShowPricePopover] = useState(false);
  const [pricePercentInput, setPricePercentInput] = useState('');
  const [showLocationPopover, setShowLocationPopover] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [showStatusPopover, setShowStatusPopover] = useState(false);

  if (selectedCount === 0) return null;

  const handleApplyPricePercent = () => {
    const val = parseFloat(pricePercentInput);
    if (!isNaN(val) && val !== 0) {
      onBulkAdjustPricePercent(val);
      setShowPricePopover(false);
      setPricePercentInput('');
    }
  };

  const handleApplyLocation = () => {
    if (locationInput.trim()) {
      onBulkSetLocation(locationInput.trim().toUpperCase());
      setShowLocationPopover(false);
      setLocationInput('');
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#161a22] border border-neutral-700/80 shadow-2xl shadow-black/80 rounded-lg px-4 py-2.5 flex items-center gap-3 text-xs text-neutral-200">
      <div className="flex items-center gap-2 pr-3 border-r border-neutral-700">
        <CheckSquare className="w-4 h-4 text-amber-400" />
        <span className="font-semibold text-white font-mono">{selectedCount}</span>
        <span className="text-neutral-400">selected</span>
      </div>

      {/* Action 1: Reprice Engine */}
      <button
        onClick={onOpenRepricerForSelected}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        <span>Reprice Engine</span>
      </button>

      {/* Action 2: Quick +/- % adjustment */}
      <div className="relative">
        <button
          onClick={() => {
            setShowPricePopover(!showPricePopover);
            setShowLocationPopover(false);
            setShowStatusPopover(false);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition-colors"
        >
          <Tag className="w-3.5 h-3.5 text-neutral-400" />
          <span>Quick +/- %</span>
        </button>

        {showPricePopover && (
          <div className="absolute bottom-full mb-2 left-0 w-52 bg-neutral-900 border border-neutral-700 rounded-lg p-3 shadow-xl">
            <div className="text-[11px] font-semibold text-neutral-300 mb-2">
              Adjust price by percentage:
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                placeholder="e.g. -5 or +10"
                value={pricePercentInput}
                onChange={(e) => setPricePercentInput(e.target.value)}
                className="w-full px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
              />
              <button
                onClick={handleApplyPricePercent}
                className="px-2.5 py-1 bg-amber-500 text-black font-medium rounded hover:bg-amber-400"
              >
                Apply
              </button>
            </div>
            <div className="flex gap-1.5 mt-2">
              <button
                onClick={() => {
                  onBulkAdjustPricePercent(-5);
                  setShowPricePopover(false);
                }}
                className="flex-1 py-0.5 text-[10px] bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300"
              >
                -5%
              </button>
              <button
                onClick={() => {
                  onBulkAdjustPricePercent(-10);
                  setShowPricePopover(false);
                }}
                className="flex-1 py-0.5 text-[10px] bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300"
              >
                -10%
              </button>
              <button
                onClick={() => {
                  onBulkAdjustPricePercent(5);
                  setShowPricePopover(false);
                }}
                className="flex-1 py-0.5 text-[10px] bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-300"
              >
                +5%
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action 3: Assign Location */}
      <div className="relative">
        <button
          onClick={() => {
            setShowLocationPopover(!showLocationPopover);
            setShowPricePopover(false);
            setShowStatusPopover(false);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition-colors"
        >
          <MapPin className="w-3.5 h-3.5 text-neutral-400" />
          <span>Assign Crate/Bin</span>
        </button>

        {showLocationPopover && (
          <div className="absolute bottom-full mb-2 left-0 w-52 bg-neutral-900 border border-neutral-700 rounded-lg p-3 shadow-xl">
            <div className="text-[11px] font-semibold text-neutral-300 mb-2">
              Set physical bin code:
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="CRATE-01, BIN-A"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                className="w-full px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-xs text-white focus:outline-none focus:border-amber-400 font-mono uppercase"
              />
              <button
                onClick={handleApplyLocation}
                className="px-2.5 py-1 bg-amber-500 text-black font-medium rounded hover:bg-amber-400"
              >
                Set
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action 4: Change Status */}
      <div className="relative">
        <button
          onClick={() => {
            setShowStatusPopover(!showStatusPopover);
            setShowPricePopover(false);
            setShowLocationPopover(false);
          }}
          className="px-2.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition-colors"
        >
          Change Status
        </button>

        {showStatusPopover && (
          <div className="absolute bottom-full mb-2 left-0 w-36 bg-neutral-900 border border-neutral-700 rounded-lg p-1.5 shadow-xl flex flex-col gap-1">
            <button
              onClick={() => {
                onBulkSetStatus('For Sale');
                setShowStatusPopover(false);
              }}
              className="text-left px-2.5 py-1 rounded text-neutral-200 hover:bg-neutral-800 text-xs"
            >
              For Sale
            </button>
            <button
              onClick={() => {
                onBulkSetStatus('Draft');
                setShowStatusPopover(false);
              }}
              className="text-left px-2.5 py-1 rounded text-neutral-200 hover:bg-neutral-800 text-xs"
            >
              Draft
            </button>
            <button
              onClick={() => {
                onBulkSetStatus('Suspended');
                setShowStatusPopover(false);
              }}
              className="text-left px-2.5 py-1 rounded text-neutral-200 hover:bg-neutral-800 text-xs"
            >
              Suspended
            </button>
          </div>
        )}
      </div>

      {/* Action 5: Export CSV */}
      <button
        onClick={onExportSelectedCsv}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 transition-colors text-neutral-300"
        title="Export selected items to Discogs Inventory CSV"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Export CSV</span>
      </button>

      {/* Dismiss / Clear Selection */}
      <button
        onClick={onClearSelection}
        className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors ml-1"
        title="Deselect all"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
