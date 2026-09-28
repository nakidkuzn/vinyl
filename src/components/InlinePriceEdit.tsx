import React, { useState, useRef, useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface InlinePriceEditProps {
  value: number;
  currencySymbol?: string;
  onSave: (newPrice: number) => void;
  floorPrice?: number;
}

export const InlinePriceEdit: React.FC<InlinePriceEditProps> = ({
  value,
  currencySymbol = '$',
  onSave,
  floorPrice,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toFixed(2));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value.toFixed(2));
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const parsed = parseFloat(inputValue);
    if (!isNaN(parsed) && parsed > 0) {
      onSave(Number(parsed.toFixed(2)));
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setInputValue(value.toFixed(2));
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-neutral-400 font-mono">{currencySymbol}</span>
        <input
          ref={inputRef}
          type="number"
          step="0.01"
          min="0.50"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="w-16 px-1.5 py-0.5 text-xs font-mono bg-neutral-900 border border-amber-500 rounded text-amber-200 outline-none focus:ring-1 focus:ring-amber-400"
        />
        <button
          onClick={handleSave}
          className="p-0.5 text-emerald-400 hover:text-emerald-300"
          title="Save price"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => {
            setInputValue(value.toFixed(2));
            setIsEditing(false);
          }}
          className="p-0.5 text-neutral-400 hover:text-neutral-300"
          title="Cancel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  const isBelowFloor = floorPrice !== undefined && value < floorPrice;

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="group flex items-baseline gap-0.5 text-left font-mono tabular-nums text-white hover:text-amber-400 transition-colors focus:outline-none"
      title="Click to inline edit listing price"
    >
      <span className="text-xs text-neutral-400 font-normal">{currencySymbol}</span>
      <span className={`font-semibold text-sm ${isBelowFloor ? 'text-rose-400' : ''}`}>
        {value.toFixed(2)}
      </span>
      <span className="text-[10px] text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
        edit
      </span>
    </button>
  );
};
