import React from 'react';
import { Plus, SlidersHorizontal, RefreshCw } from 'lucide-react';

interface HeaderProps {
  activeTab: 'inventory' | 'repricer' | 'market' | 'import_export' | 'settings';
  setActiveTab: (tab: 'inventory' | 'repricer' | 'market' | 'import_export' | 'settings') => void;
  onOpenAddItem: () => void;
  onQuickReprice: () => void;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddItem,
  onQuickReprice,
  isSyncing = false,
}) => {
  return (
    <header className="border-b border-neutral-800/80 bg-[#0f1217]/90 backdrop-blur-md sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <a
          href="#inventory"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('inventory');
          }}
          className="font-display text-xl font-bold tracking-tight text-white hover:text-amber-400 transition-colors flex items-center gap-2"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse inline-block" />
          <span>GroovePrice</span>
        </a>
      </div>

      {/* Zone 2: 4-6 clean text navigation links */}
      <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`transition-colors whitespace-nowrap pb-0.5 ${
            activeTab === 'inventory'
              ? 'text-amber-400 border-b-2 border-amber-400 font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Inventory Workstation
        </button>
        <button
          onClick={() => setActiveTab('repricer')}
          className={`transition-colors whitespace-nowrap pb-0.5 ${
            activeTab === 'repricer'
              ? 'text-amber-400 border-b-2 border-amber-400 font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Bulk Repricer Engine
        </button>
        <button
          onClick={() => setActiveTab('market')}
          className={`transition-colors whitespace-nowrap pb-0.5 ${
            activeTab === 'market'
              ? 'text-amber-400 border-b-2 border-amber-400 font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Market Intelligence
        </button>
        <button
          onClick={() => setActiveTab('import_export')}
          className={`transition-colors whitespace-nowrap pb-0.5 ${
            activeTab === 'import_export'
              ? 'text-amber-400 border-b-2 border-amber-400 font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          CSV Sync & Export
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`transition-colors whitespace-nowrap pb-0.5 ${
            activeTab === 'settings'
              ? 'text-amber-400 border-b-2 border-amber-400 font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Discogs API
        </button>
      </nav>

      {/* Zone 3: 1-2 primary actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={onQuickReprice}
          className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-neutral-200 bg-neutral-800/90 border border-neutral-700/80 rounded-md hover:bg-neutral-700 hover:text-white transition-colors whitespace-nowrap"
          title="Run instant repricing rule preview"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
          <span>Reprice Preview</span>
        </button>
        <button
          onClick={onOpenAddItem}
          className="inline-flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-black bg-amber-400 rounded-md hover:bg-amber-300 transition-colors whitespace-nowrap shadow-sm shadow-amber-950/30"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add Release</span>
        </button>
      </div>
    </header>
  );
};
