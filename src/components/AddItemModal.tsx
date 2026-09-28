import React, { useState, useEffect } from 'react';
import {
  InventoryItem,
  GoldmineGrade,
  SleeveGrade,
  ListingStatus,
  MediaFormat,
} from '../types/discogs';
import { GOLDMINE_GRADES, SLEEVE_GRADES, CONDITION_MULTIPLIERS } from '../data/initialInventory';
import { calculateProfitAndMargin } from '../utils/pricingEngine';
import { X, Sparkles, Disc, MapPin, DollarSign, FileText } from 'lucide-react';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: InventoryItem) => void;
  editItem?: InventoryItem | null;
  currencySymbol?: string;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editItem,
  currencySymbol = '$',
}) => {
  const [releaseId, setReleaseId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [label, setLabel] = useState('');
  const [catno, setCatno] = useState('');
  const [year, setYear] = useState<number>(1975);
  const [country, setCountry] = useState('US');
  const [format, setFormat] = useState<MediaFormat | string>('Vinyl, LP');
  const [mediaCondition, setMediaCondition] = useState<GoldmineGrade>('Near Mint (NM or M-)');
  const [sleeveCondition, setSleeveCondition] = useState<SleeveGrade>('Very Good Plus (VG+)');
  const [price, setPrice] = useState<number>(35.0);
  const [originalCost, setOriginalCost] = useState<number>(15.0);
  const [floorPrice, setFloorPrice] = useState<number>(25.0);
  const [ceilingPrice, setCeilingPrice] = useState<number>(60.0);
  const [status, setStatus] = useState<ListingStatus>('For Sale');
  const [location, setLocation] = useState('CRATE-NEW-01');
  const [comments, setComments] = useState('');
  const [weightGrams, setWeightGrams] = useState(230);

  // Market stats baseline
  const [marketLowest, setMarketLowest] = useState(28.0);
  const [marketMedian, setMarketMedian] = useState(38.0);
  const [marketHighest, setMarketHighest] = useState(70.0);

  useEffect(() => {
    if (editItem) {
      setReleaseId(String(editItem.releaseId));
      setTitle(editItem.title);
      setArtist(editItem.artist);
      setLabel(editItem.label);
      setCatno(editItem.catno);
      setYear(editItem.year);
      setCountry(editItem.country);
      setFormat(editItem.format);
      setMediaCondition(editItem.mediaCondition);
      setSleeveCondition(editItem.sleeveCondition);
      setPrice(editItem.price);
      setOriginalCost(editItem.originalCost);
      setFloorPrice(editItem.floorPrice);
      setCeilingPrice(editItem.ceilingPrice || editItem.price * 1.5);
      setStatus(editItem.status);
      setLocation(editItem.location);
      setComments(editItem.comments);
      setWeightGrams(editItem.weightGrams || 230);
      setMarketLowest(editItem.marketStats.lowest);
      setMarketMedian(editItem.marketStats.median);
      setMarketHighest(editItem.marketStats.highest);
    } else {
      // Default clean state for new item
      setReleaseId(String(Math.floor(1000000 + Math.random() * 9000000)));
      setTitle('');
      setArtist('');
      setLabel('');
      setCatno('');
      setYear(1980);
      setCountry('US');
      setFormat('Vinyl, LP');
      setMediaCondition('Near Mint (NM or M-)');
      setSleeveCondition('Very Good Plus (VG+)');
      setPrice(35.0);
      setOriginalCost(15.0);
      setFloorPrice(22.0);
      setCeilingPrice(60.0);
      setStatus('For Sale');
      setLocation('CRATE-NEW-01');
      setComments('Clean copy, visual and play-graded. Includes original poly-lined inner sleeve.');
      setWeightGrams(230);
      setMarketLowest(28.0);
      setMarketMedian(38.0);
      setMarketHighest(70.0);
    }
  }, [editItem, isOpen]);

  // Recalculate suggested price when condition or median changes
  const applyConditionPriceSuggestion = () => {
    const mult = CONDITION_MULTIPLIERS[mediaCondition] || 0.85;
    const suggested = Math.max(1.0, (marketMedian / 0.85) * mult);
    const rounded = Number((Math.floor(suggested) + 0.99).toFixed(2));
    setPrice(rounded);
  };

  const handleGenerateTemplateComment = () => {
    const template = `${mediaCondition} visual grade. Audio tested on Rega turntable, plays clean with crisp fidelity. Outer jacket is ${sleeveCondition} with light edge wear. Stored upright in 3mil archival sleeve.`;
    setComments(template);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !artist.trim()) return;

    const itemToSave: InventoryItem = {
      id: editItem ? editItem.id : `inv-${Date.now()}`,
      releaseId: parseInt(releaseId, 10) || 1000000,
      title: title.trim(),
      artist: artist.trim(),
      label: label.trim() || 'Independent',
      catno: catno.trim() || 'NONE',
      year: year || 1980,
      country: country.trim() || 'US',
      format,
      genre: editItem?.genre || ['Rock', 'Vinyl'],
      mediaCondition,
      sleeveCondition,
      price: Math.max(0.5, price),
      originalCost: Math.max(0, originalCost),
      floorPrice: Math.max(0, floorPrice),
      ceilingPrice: ceilingPrice ? Math.max(ceilingPrice, price) : undefined,
      status,
      location: location.trim().toUpperCase() || 'GENERAL',
      comments: comments.trim(),
      weightGrams: weightGrams || 230,
      dateListed: editItem ? editItem.dateListed : new Date().toISOString(),
      lastPriceUpdated: new Date().toISOString(),
      inCollection: editItem ? editItem.inCollection : false,
      marketStats: {
        lowest: marketLowest,
        median: marketMedian,
        highest: marketHighest,
        lastSoldDate: new Date().toISOString().split('T')[0],
        numForSale: editItem ? editItem.marketStats.numForSale : 15,
        wantCount: editItem ? editItem.marketStats.wantCount : 1200,
        haveCount: editItem ? editItem.marketStats.haveCount : 2400,
        suggestedConditionPrice: price,
      },
      imageUrl: editItem?.imageUrl,
    };

    onSave(itemToSave);
    onClose();
  };

  if (!isOpen) return null;

  const { netProfit, marginPercent } = calculateProfitAndMargin(price, originalCost);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#101319] border border-neutral-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-[#131720]">
          <div className="flex items-center gap-2">
            <Disc className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white font-display">
              {editItem ? 'Edit Inventory Release' : 'Add Release to Discogs Store'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 text-xs">
          {/* Section 1: Release Identification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-neutral-300 block mb-1">Artist *</label>
              <input
                type="text"
                required
                placeholder="e.g. Pink Floyd"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-white focus:outline-none focus:border-amber-400 text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-neutral-300 block mb-1">Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. The Dark Side of the Moon"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-white focus:outline-none focus:border-amber-400 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-neutral-400 block mb-1">Discogs Release ID</label>
              <input
                type="number"
                placeholder="1873013"
                value={releaseId}
                onChange={(e) => setReleaseId(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-neutral-400 block mb-1">Catalog #</label>
              <input
                type="text"
                placeholder="SHVL 804"
                value={catno}
                onChange={(e) => setCatno(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-white font-mono text-xs focus:outline-none focus:border-amber-400 uppercase"
              />
            </div>
            <div>
              <label className="text-neutral-400 block mb-1">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-white text-xs focus:outline-none focus:border-amber-400"
              >
                <option value="Vinyl, LP">Vinyl, LP</option>
                <option value="Vinyl, 2xLP">Vinyl, 2xLP</option>
                <option value="Vinyl, 12', 45 RPM">Vinyl, 12", 45 RPM</option>
                <option value="Vinyl, 7', Single">Vinyl, 7", Single</option>
                <option value="CD, Album">CD, Album</option>
                <option value="Cassette, Album">Cassette, Album</option>
              </select>
            </div>
            <div>
              <label className="text-neutral-400 block mb-1">Release Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10) || 1980)}
                className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Section 2: Goldmine Condition Grading */}
          <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded-lg flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-neutral-300">Goldmine Condition Grading</span>
              <button
                type="button"
                onClick={applyConditionPriceSuggestion}
                className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
                title="Calculate suggested price based on standard Goldmine valuation curve"
              >
                <Sparkles className="w-3 h-3" />
                <span>Suggest Price for Condition</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-neutral-400 block mb-1">Media Condition</label>
                <select
                  value={mediaCondition}
                  onChange={(e) => setMediaCondition(e.target.value as GoldmineGrade)}
                  className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-white text-xs focus:outline-none focus:border-amber-400"
                >
                  {GOLDMINE_GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Sleeve Condition</label>
                <select
                  value={sleeveCondition}
                  onChange={(e) => setSleeveCondition(e.target.value as SleeveGrade)}
                  className="w-full px-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-white text-xs focus:outline-none focus:border-amber-400"
                >
                  {SLEEVE_GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Pricing & Profit Math */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="font-semibold text-amber-300 block mb-1">Listing Price *</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400">{currencySymbol}</span>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  className="w-full pl-6 pr-2.5 py-1.5 bg-neutral-900 border border-amber-500 rounded text-white font-mono font-bold text-xs focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-neutral-400 block mb-1">Cost Basis</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400">{currencySymbol}</span>
                <input
                  type="number"
                  step="0.01"
                  value={originalCost}
                  onChange={(e) => setOriginalCost(parseFloat(e.target.value) || 0)}
                  className="w-full pl-6 pr-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-white font-mono text-xs focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-neutral-400 block mb-1">Floor Guard Price</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400">{currencySymbol}</span>
                <input
                  type="number"
                  step="0.01"
                  value={floorPrice}
                  onChange={(e) => setFloorPrice(parseFloat(e.target.value) || 0)}
                  className="w-full pl-6 pr-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-white font-mono text-xs focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-neutral-400 block mb-1">Physical Crate / Bin</label>
              <div className="relative">
                <MapPin className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="CRATE-01"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full pl-7 pr-2.5 py-1.5 bg-neutral-900 border border-neutral-700 rounded text-white font-mono text-xs focus:outline-none uppercase"
                />
              </div>
            </div>
          </div>

          {/* Profit summary strip */}
          <div className="px-3 py-2 bg-[#12161f] border border-neutral-800 rounded flex items-center justify-between text-[11px] font-mono">
            <span className="text-neutral-400">
              Net Payout (deducting 9% Discogs fee): <strong className="text-white">{currencySymbol}{(price * 0.875 - 0.49).toFixed(2)}</strong>
            </span>
            <span className="text-emerald-400">
              Net Profit: <strong>+{currencySymbol}{netProfit.toFixed(2)} ({marginPercent}%)</strong>
            </span>
          </div>

          {/* Section 4: Condition Notes / Comments */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-neutral-300">Listing Grading Comments</label>
              <button
                type="button"
                onClick={handleGenerateTemplateComment}
                className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                <FileText className="w-3 h-3" />
                <span>Auto-Fill Standard Note</span>
              </button>
            </div>
            <textarea
              rows={2}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Describe vinyl matrix stamps, play grades, sleeve defects, or inclusions..."
              className="w-full px-3 py-2 bg-neutral-900 border border-neutral-700 rounded text-white text-xs focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Section 5: Status */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-4">
              <label className="text-neutral-400">Status:</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="For Sale"
                    checked={status === 'For Sale'}
                    onChange={() => setStatus('For Sale')}
                    className="text-amber-500 focus:ring-0"
                  />
                  <span className="text-white">For Sale</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value="Draft"
                    checked={status === 'Draft'}
                    onChange={() => setStatus('Draft')}
                    className="text-amber-500 focus:ring-0"
                  />
                  <span className="text-neutral-300">Draft</span>
                </label>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-800 rounded hover:bg-neutral-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 text-xs font-semibold text-black bg-amber-400 rounded hover:bg-amber-300 shadow"
            >
              {editItem ? 'Save Changes' : 'Save to Inventory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
