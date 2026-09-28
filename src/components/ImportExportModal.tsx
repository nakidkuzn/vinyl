import React, { useState, useRef } from 'react';
import { InventoryItem } from '../types/discogs';
import { exportToDiscogsCsv, parseDiscogsCsv, downloadCsvFile } from '../utils/discogsCsv';
import { Download, Upload, FileSpreadsheet, Check, AlertCircle, RefreshCw } from 'lucide-react';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  onImportItems: (items: InventoryItem[]) => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  inventory,
  onImportItems,
}) => {
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importedPreview, setImportedPreview] = useState<Partial<InventoryItem>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExportCsv = () => {
    const csv = exportToDiscogsCsv(inventory);
    const dateStr = new Date().toISOString().split('T')[0];
    downloadCsvFile(csv, `discogs_inventory_${dateStr}.csv`);
  };

  const handleDownloadSampleCsv = () => {
    const sampleCsv = `listing_id,release_id,price,media_condition,sleeve_condition,comments,allow_offers,status,external_id,location,weight,format_quantity
101,1873013,85.00,Near Mint (NM or M-),Very Good Plus (VG+),"Pristine copy, plays without clicks",N,For Sale,SHVL 804,CRATE-01,230,1
102,1475704,130.00,Very Good Plus (VG+),Very Good (VG),"Mono original 6-eye pressing",N,For Sale,CL 1355,VAULT-A,240,1
103,4570366,49.99,Mint (M),Mint (M),"Factory sealed with hype sticker",N,For Sale,88883716861,BIN-02,420,1`;
    downloadCsvFile(sampleCsv, 'discogs_inventory_sample.csv');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const parsed = parseDiscogsCsv(text);
        if (parsed.length === 0) {
          setImportStatus('No valid inventory rows found in the CSV.');
          setImportedPreview([]);
        } else {
          setImportedPreview(parsed);
          setImportStatus(`Found ${parsed.length} releases in CSV ready for import.`);
        }
      } catch {
        setImportStatus('Failed to parse CSV file. Please verify format.');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (importedPreview.length > 0) {
      const fullItems = importedPreview as InventoryItem[];
      onImportItems(fullItems);
      setImportedPreview([]);
      setImportStatus(`Successfully imported ${fullItems.length} items to your store!`);
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#101319] border border-neutral-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-[#131720]">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white font-display">
              Discogs CSV Import &amp; Export
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-neutral-400 hover:text-white px-2 py-1 rounded bg-neutral-800"
          >
            Close
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6 text-xs">
          {/* Card 1: Export Discogs Inventory */}
          <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-lg flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white text-sm">
                  Export to Discogs Inventory CSV
                </h3>
                <p className="text-neutral-400 text-xs mt-0.5">
                  Downloads compliant CSV matching Discogs seller marketplace upload specifications
                </p>
              </div>
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black font-semibold rounded text-xs transition-colors shadow"
              >
                <Download className="w-4 h-4" />
                <span>Export ({inventory.length} items)</span>
              </button>
            </div>
            <div className="text-[11px] text-neutral-500 font-mono">
              Columns included: listing_id, release_id, price, media_condition, sleeve_condition, comments, location, etc.
            </div>
          </div>

          {/* Card 2: Import Discogs Inventory */}
          <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-lg flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white text-sm">
                  Import Inventory from CSV
                </h3>
                <p className="text-neutral-400 text-xs mt-0.5">
                  Upload an exported Discogs CSV or spreadsheet from your local computer
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadSampleCsv}
                  className="px-2.5 py-1.5 border border-neutral-700 hover:bg-neutral-800 text-neutral-300 rounded text-xs transition-colors"
                >
                  Download Sample CSV
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded text-xs transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>Choose CSV File</span>
                </button>
              </div>
            </div>

            {importStatus && (
              <div className="p-2.5 bg-neutral-800 border border-neutral-700 rounded text-amber-300 text-xs flex items-center justify-between">
                <span>{importStatus}</span>
                {importedPreview.length > 0 && (
                  <button
                    onClick={handleConfirmImport}
                    className="px-3 py-1 bg-amber-400 text-black font-semibold rounded text-xs hover:bg-amber-300"
                  >
                    Confirm &amp; Add to Store
                  </button>
                )}
              </div>
            )}

            {importedPreview.length > 0 && (
              <div className="max-h-48 overflow-y-auto border border-neutral-800 rounded bg-neutral-950 p-2">
                <div className="text-[11px] font-semibold text-neutral-400 mb-1.5">
                  Preview of items detected in file:
                </div>
                <div className="divide-y divide-neutral-900">
                  {importedPreview.slice(0, 5).map((item, idx) => (
                    <div key={idx} className="py-1 flex items-center justify-between text-[11px]">
                      <span className="text-neutral-200">{item.title}</span>
                      <span className="text-amber-400 font-mono">${item.price?.toFixed(2)}</span>
                    </div>
                  ))}
                  {importedPreview.length > 5 && (
                    <div className="py-1 text-center text-neutral-500 text-[10px]">
                      + {importedPreview.length - 5} more releases
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
