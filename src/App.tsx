/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  InventoryItem,
  ListingStatus,
  DiscogsApiConfig,
  RepriceExecutionLog,
} from './types/discogs';
import { INITIAL_INVENTORY } from './data/initialInventory';
import { calculateStoreSummary, calculateProfitAndMargin } from './utils/pricingEngine';
import { Header } from './components/Header';
import { MetricsBar } from './components/MetricsBar';
import { InventoryTable } from './components/InventoryTable';
import { BulkActionsBar } from './components/BulkActionsBar';
import { BulkRepricerModal } from './components/BulkRepricerModal';
import { AddItemModal } from './components/AddItemModal';
import { AiPricingModal } from './components/AiPricingModal';
import { ImportExportModal } from './components/ImportExportModal';
import { SettingsModal } from './components/SettingsModal';
import { MarketIntelligenceView } from './components/MarketIntelligenceView';
import { exportToDiscogsCsv, downloadCsvFile } from './utils/discogsCsv';
import { CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';

const STORAGE_KEY_INVENTORY = 'grooveprice_inventory_v1';
const STORAGE_KEY_CONFIG = 'grooveprice_config_v1';
const STORAGE_KEY_LOGS = 'grooveprice_reprice_logs_v1';

export default function App() {
  // Load persistent inventory or fall back to preloaded iconic collectible records
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_INVENTORY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse saved inventory:', e);
    }
    return INITIAL_INVENTORY;
  });

  // App & Discogs API configuration
  const [config, setConfig] = useState<DiscogsApiConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // default
    }
    return {
      personalAccessToken: '',
      username: '',
      currency: 'USD',
      autoSyncEnabled: false,
      syncIntervalHours: 24,
    };
  });

  // Bulk repricing execution & rollback logs
  const [executionLogs, setExecutionLogs] = useState<RepriceExecutionLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LOGS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // default
    }
    return [];
  });

  // Navigation tab state: 'inventory' | 'repricer' | 'market' | 'import_export' | 'settings'
  const [activeTab, setActiveTab] = useState<'inventory' | 'repricer' | 'market' | 'import_export' | 'settings'>('inventory');

  // Selected item IDs for multi-item bulk operations
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');
  const [quickFilter, setQuickFilter] = useState('none');
  const [sortField, setSortField] = useState<'price' | 'margin' | 'days' | 'title' | 'artist' | 'year'>('days');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal visibility states
  const [isBulkRepricerOpen, setIsBulkRepricerOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [aiAdvisorItem, setAiAdvisorItem] = useState<InventoryItem | null>(null);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Toast notification state
  const [notification, setNotification] = useState<{
    message: string;
    canUndo?: boolean;
  } | null>(null);

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(executionLogs));
  }, [executionLogs]);

  // Derived financial summary
  const summary = useMemo(() => {
    return calculateStoreSummary(inventory);
  }, [inventory]);

  const currencySymbol = config.currency === 'EUR' ? '€' : config.currency === 'GBP' ? '£' : '$';

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    return inventory
      .filter((item) => {
        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchArtist = item.artist.toLowerCase().includes(q);
          const matchCat = item.catno.toLowerCase().includes(q);
          const matchLoc = (item.location || '').toLowerCase().includes(q);
          const matchComments = (item.comments || '').toLowerCase().includes(q);
          if (!matchTitle && !matchArtist && !matchCat && !matchLoc && !matchComments) {
            return false;
          }
        }

        // Status filter
        if (statusFilter !== 'all' && item.status !== statusFilter) {
          return false;
        }

        // Condition filter
        if (conditionFilter !== 'all' && item.mediaCondition !== conditionFilter) {
          return false;
        }

        // Format filter
        if (formatFilter !== 'all' && item.format !== formatFilter) {
          return false;
        }

        // Quick filter
        if (quickFilter === 'stale') {
          const days = Math.floor((Date.now() - new Date(item.dateListed).getTime()) / (1000 * 60 * 60 * 24));
          if (days <= 45 || item.status !== 'For Sale') return false;
        } else if (quickFilter === 'underpriced') {
          if (item.status !== 'For Sale' || item.price >= item.marketStats.lowest) return false;
        } else if (quickFilter === 'overpriced') {
          if (item.status !== 'For Sale' || item.price <= item.marketStats.median * 1.15) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'price') {
          diff = a.price - b.price;
        } else if (sortField === 'margin') {
          const marginA = calculateProfitAndMargin(a.price, a.originalCost).marginPercent;
          const marginB = calculateProfitAndMargin(b.price, b.originalCost).marginPercent;
          diff = marginA - marginB;
        } else if (sortField === 'days') {
          const daysA = new Date(a.dateListed).getTime();
          const daysB = new Date(b.dateListed).getTime();
          diff = daysA - daysB;
        } else if (sortField === 'title') {
          diff = a.title.localeCompare(b.title);
        } else if (sortField === 'artist') {
          diff = a.artist.localeCompare(b.artist);
        } else if (sortField === 'year') {
          diff = a.year - b.year;
        }
        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [
    inventory,
    searchQuery,
    statusFilter,
    conditionFilter,
    formatFilter,
    quickFilter,
    sortField,
    sortOrder,
  ]);

  // Sorting handler
  const handleSort = (field: 'price' | 'margin' | 'days' | 'title' | 'artist' | 'year') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    const allVisibleIds = filteredItems.map((i) => i.id);
    const isAllSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedItemIds.has(id));
    if (isAllSelected) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(allVisibleIds));
    }
  };

  const handleClearSelection = () => {
    setSelectedItemIds(new Set());
  };

  // Item modifications
  const handlePriceChange = (id: string, newPrice: number) => {
    setInventory((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              price: Math.max(0.5, newPrice),
              lastPriceUpdated: new Date().toISOString(),
            }
          : item
      )
    );
  };

  const handleLocationChange = (id: string, newLocation: string) => {
    setInventory((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              location: newLocation.trim().toUpperCase(),
            }
          : item
      )
    );
  };

  const handleStatusChange = (id: string, newStatus: ListingStatus) => {
    setInventory((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: newStatus,
            }
          : item
      )
    );
  };

  // Bulk actions
  const handleBulkAdjustPricePercent = (percent: number) => {
    if (selectedItemIds.size === 0) return;
    const factor = 1 + percent / 100;
    const updates: { itemId: string; newPrice: number; oldPrice: number }[] = [];

    setInventory((prev) =>
      prev.map((item) => {
        if (selectedItemIds.has(item.id)) {
          const rawNew = item.price * factor;
          const newPrice = Number(Math.max(item.floorPrice || 1.0, rawNew).toFixed(2));
          updates.push({ itemId: item.id, oldPrice: item.price, newPrice });
          return {
            ...item,
            price: newPrice,
            lastPriceUpdated: new Date().toISOString(),
          };
        }
        return item;
      })
    );

    // Record in history log
    const log: RepriceExecutionLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ruleName: `Bulk ${percent > 0 ? '+' : ''}${percent}% Manual Adjustment`,
      itemsUpdatedCount: updates.length,
      totalValueDelta: updates.reduce((acc, u) => acc + (u.newPrice - u.oldPrice), 0),
      reverted: false,
      snapshots: updates,
    };
    setExecutionLogs((prev) => [log, ...prev]);

    setNotification({
      message: `Adjusted prices for ${updates.length} items by ${percent > 0 ? '+' : ''}${percent}%.`,
      canUndo: true,
    });
    setTimeout(() => setNotification(null), 6000);
  };

  const handleBulkSetLocation = (newLocation: string) => {
    if (selectedItemIds.size === 0) return;
    setInventory((prev) =>
      prev.map((item) =>
        selectedItemIds.has(item.id)
          ? { ...item, location: newLocation }
          : item
      )
    );
    setNotification({
      message: `Assigned location ${newLocation} to ${selectedItemIds.size} items.`,
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleBulkSetStatus = (newStatus: ListingStatus) => {
    if (selectedItemIds.size === 0) return;
    setInventory((prev) =>
      prev.map((item) =>
        selectedItemIds.has(item.id)
          ? { ...item, status: newStatus }
          : item
      )
    );
    setNotification({
      message: `Updated status to "${newStatus}" for ${selectedItemIds.size} items.`,
    });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleExportSelectedCsv = () => {
    const selected = inventory.filter((i) => selectedItemIds.has(i.id));
    if (selected.length === 0) return;
    const csv = exportToDiscogsCsv(selected);
    downloadCsvFile(csv, `discogs_selected_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Automated Repricing Batch Execution
  const handleApplyRepricing = (
    updates: { itemId: string; newPrice: number; oldPrice: number }[],
    ruleName: string
  ) => {
    const updateMap = new Map(updates.map((u) => [u.itemId, u.newPrice]));

    setInventory((prev) =>
      prev.map((item) => {
        if (updateMap.has(item.id)) {
          return {
            ...item,
            price: updateMap.get(item.id)!,
            lastPriceUpdated: new Date().toISOString(),
          };
        }
        return item;
      })
    );

    const log: RepriceExecutionLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      ruleName,
      itemsUpdatedCount: updates.length,
      totalValueDelta: updates.reduce((acc, u) => acc + (u.newPrice - u.oldPrice), 0),
      reverted: false,
      snapshots: updates,
    };
    setExecutionLogs((prev) => [log, ...prev]);

    setNotification({
      message: `Repricing complete: Successfully updated ${updates.length} items using "${ruleName}".`,
      canUndo: true,
    });
    setTimeout(() => setNotification(null), 8000);
  };

  // Rollback last repricing execution
  const handleUndoLastReprice = () => {
    if (executionLogs.length === 0) return;
    const lastLog = executionLogs.find((l) => !l.reverted);
    if (!lastLog) return;

    const rollbackMap = new Map(lastLog.snapshots.map((s) => [s.itemId, s.oldPrice]));

    setInventory((prev) =>
      prev.map((item) => {
        if (rollbackMap.has(item.id)) {
          return {
            ...item,
            price: rollbackMap.get(item.id)!,
            lastPriceUpdated: new Date().toISOString(),
          };
        }
        return item;
      })
    );

    setExecutionLogs((prev) =>
      prev.map((l) => (l.id === lastLog.id ? { ...l, reverted: true } : l))
    );

    setNotification({
      message: `Rollback successful: Reverted ${lastLog.itemsUpdatedCount} items back to previous prices.`,
      canUndo: false,
    });
    setTimeout(() => setNotification(null), 5000);
  };

  // Delete item
  const handleDeleteItem = (id: string) => {
    setInventory((prev) => prev.filter((i) => i.id !== id));
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Save (add or edit) item
  const handleSaveItem = (itemToSave: InventoryItem) => {
    setInventory((prev) => {
      const index = prev.findIndex((i) => i.id === itemToSave.id);
      if (index >= 0) {
        const copy = [...prev];
        copy[index] = itemToSave;
        return copy;
      }
      return [itemToSave, ...prev];
    });
    setNotification({
      message: `Saved "${itemToSave.title}" to store inventory.`,
    });
    setTimeout(() => setNotification(null), 4000);
  };

  // Import items
  const handleImportItems = (newItems: InventoryItem[]) => {
    setInventory((prev) => [...newItems, ...prev]);
    setNotification({
      message: `Added ${newItems.length} imported releases to inventory!`,
    });
    setTimeout(() => setNotification(null), 5000);
  };

  // Reset to default sample catalog
  const handleResetSampleData = () => {
    setInventory(INITIAL_INVENTORY);
    setSelectedItemIds(new Set());
    setExecutionLogs([]);
    setNotification({
      message: 'Store inventory reset to default sample catalog.',
    });
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0c0e12] text-slate-100 font-sans selection:bg-amber-500/20 selection:text-amber-200">
      {/* Strict 3-zone Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'repricer') {
            setIsBulkRepricerOpen(true);
          } else if (tab === 'import_export') {
            setIsImportExportOpen(true);
          } else if (tab === 'settings') {
            setIsSettingsOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        onOpenAddItem={() => {
          setEditingItem(null);
          setIsAddItemOpen(true);
        }}
        onQuickReprice={() => setIsBulkRepricerOpen(true)}
      />

      {/* Financial & Performance Summary Bar */}
      <MetricsBar
        summary={summary}
        currencySymbol={currencySymbol}
        onFilterStale={() => {
          setActiveTab('inventory');
          setQuickFilter(quickFilter === 'stale' ? 'none' : 'stale');
        }}
        onFilterUnderpriced={() => {
          setActiveTab('inventory');
          setQuickFilter(quickFilter === 'underpriced' ? 'none' : 'underpriced');
        }}
        onFilterOverpriced={() => {
          setActiveTab('inventory');
          setQuickFilter(quickFilter === 'overpriced' ? 'none' : 'overpriced');
        }}
      />

      {/* Main View Router */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {activeTab === 'inventory' && (
          <InventoryTable
            items={filteredItems}
            selectedItemIds={selectedItemIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            onPriceChange={handlePriceChange}
            onLocationChange={handleLocationChange}
            onStatusChange={handleStatusChange}
            onOpenAiAdvisor={(item) => setAiAdvisorItem(item)}
            onEditItem={(item) => {
              setEditingItem(item);
              setIsAddItemOpen(true);
            }}
            onDeleteItem={handleDeleteItem}
            currencySymbol={currencySymbol}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            conditionFilter={conditionFilter}
            setConditionFilter={setConditionFilter}
            formatFilter={formatFilter}
            setFormatFilter={setFormatFilter}
            quickFilter={quickFilter}
            setQuickFilter={setQuickFilter}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={handleSort}
          />
        )}

        {activeTab === 'market' && (
          <MarketIntelligenceView
            items={inventory}
            onOpenRepricer={() => setIsBulkRepricerOpen(true)}
            onOpenAiAdvisor={(item) => setAiAdvisorItem(item)}
            currencySymbol={currencySymbol}
          />
        )}
      </main>

      {/* Floating Multi-selection Toolbar */}
      <BulkActionsBar
        selectedCount={selectedItemIds.size}
        onClearSelection={handleClearSelection}
        onOpenRepricerForSelected={() => setIsBulkRepricerOpen(true)}
        onBulkAdjustPricePercent={handleBulkAdjustPricePercent}
        onBulkSetLocation={handleBulkSetLocation}
        onBulkSetStatus={handleBulkSetStatus}
        onExportSelectedCsv={handleExportSelectedCsv}
      />

      {/* Repricer Engine Modal */}
      <BulkRepricerModal
        isOpen={isBulkRepricerOpen}
        onClose={() => setIsBulkRepricerOpen(false)}
        inventory={inventory}
        selectedItemIds={selectedItemIds}
        onApplyRepricing={handleApplyRepricing}
        executionLogs={executionLogs}
        onUndoLastReprice={handleUndoLastReprice}
        currencySymbol={currencySymbol}
      />

      {/* Add / Edit Item Modal */}
      <AddItemModal
        isOpen={isAddItemOpen}
        onClose={() => {
          setIsAddItemOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        editItem={editingItem}
        currencySymbol={currencySymbol}
      />

      {/* AI Market Advisor Modal */}
      <AiPricingModal
        isOpen={!!aiAdvisorItem}
        onClose={() => setAiAdvisorItem(null)}
        item={aiAdvisorItem}
        onApplyRecommendedPrice={handlePriceChange}
        currencySymbol={currencySymbol}
      />

      {/* Import / Export Modal */}
      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        inventory={inventory}
        onImportItems={handleImportItems}
      />

      {/* Settings & Discogs API Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSaveConfig={setConfig}
        onResetSampleData={handleResetSampleData}
      />

      {/* Toast Notification Bar */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#161b24] border border-amber-500/40 text-neutral-100 px-4 py-2.5 rounded-lg shadow-2xl flex items-center gap-3 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification.message}</span>
          {notification.canUndo && (
            <button
              onClick={() => {
                handleUndoLastReprice();
                setNotification(null);
              }}
              className="ml-2 px-2 py-0.5 bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-semibold rounded flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Undo</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
