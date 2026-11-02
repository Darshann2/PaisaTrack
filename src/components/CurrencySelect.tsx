import React, { useState, useMemo } from 'react';
import { Search, Star, Globe, Check, X } from 'lucide-react';
import { CurrencyInfo } from '../types/finance';
import { WORLD_CURRENCIES, searchCurrencies, getCurrencyInfo, getMajorCurrencies } from '../data/currencies';

export interface CurrencySelectProps {
  value?: string;
  onChange?: (code: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  selectedCurrency?: string;
  onSelectCurrency?: (code: string) => void;
  title?: string;
  favorites?: string[];
  onToggleFavorite?: (code: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function CurrencySelect({
  value,
  onChange,
  isOpen: externalIsOpen,
  onClose: externalOnClose,
  selectedCurrency: externalSelectedCurrency,
  onSelectCurrency,
  title = 'Select World Currency',
  favorites = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'CAD', 'JPY'],
  onToggleFavorite,
  label,
  className = '',
  disabled = false,
}: CurrencySelectProps) {
  const isControlledModal = externalIsOpen !== undefined;
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = isControlledModal ? externalIsOpen : internalIsOpen;

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'favorites' | 'all'>('favorites');

  const currentCode = externalSelectedCurrency || value || 'INR';
  const selectedCurrency = useMemo(() => getCurrencyInfo(currentCode), [currentCode]);

  const filteredCurrencies = useMemo(() => {
    if (!search.trim()) {
      if (activeTab === 'favorites') {
        const favSet = new Set(favorites.map((c) => c.toUpperCase()));
        return WORLD_CURRENCIES.filter((c) => favSet.has(c.code));
      }
      return WORLD_CURRENCIES;
    }
    return searchCurrencies(search);
  }, [search, activeTab, favorites]);

  const handleSelect = (code: string) => {
    if (onChange) onChange(code);
    if (onSelectCurrency) onSelectCurrency(code);
    if (isControlledModal) {
      if (externalOnClose) externalOnClose();
    } else {
      setInternalIsOpen(false);
    }
    setSearch('');
  };

  const handleClose = () => {
    if (isControlledModal) {
      if (externalOnClose) externalOnClose();
    } else {
      setInternalIsOpen(false);
    }
    setSearch('');
  };

  const modalContent = isOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>{title}</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              160+ ISO 4217 currencies supported with automatic exchange rates
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

            {/* Search Input */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by code (USD), name (Yen), symbol ($), or country..."
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Tabs */}
              {!search.trim() && (
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('favorites')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      activeTab === 'favorites'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>Favorites ({favorites.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('all')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      activeTab === 'all'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>All World Currencies ({WORLD_CURRENCIES.length})</span>
                  </button>
                </div>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2">
              {filteredCurrencies.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
                  No currencies match "{search}".
                </div>
              ) : (
                filteredCurrencies.map((c) => {
                  const isSelected = c.code === currentCode.toUpperCase();
                  const isFav = favorites.includes(c.code);

                  return (
                    <div
                      key={c.code}
                      onClick={() => handleSelect(c.code)}
                      className={`flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition ${
                        isSelected ? 'bg-emerald-50/70 dark:bg-emerald-950/30' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xl shrink-0">{c.flag || '🌐'}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-xs text-slate-900 dark:text-white">
                              {c.code}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {c.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span>{c.country}</span>
                            <span>•</span>
                            <span className="font-mono">{c.decimals} dec</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {c.disambiguatedSymbol}
                        </span>

                        {onToggleFavorite && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFavorite(c.code);
                            }}
                            className={`p-1 rounded-md transition ${
                              isFav
                                ? 'text-amber-500 hover:text-amber-600'
                                : 'text-slate-300 dark:text-slate-600 hover:text-amber-400'
                            }`}
                            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                          </button>
                        )}

                        {isSelected && (
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <span>Selected: <strong className="text-emerald-600 dark:text-emerald-400">{selectedCurrency.code} ({selectedCurrency.name})</strong></span>
              <button
                type="button"
                onClick={handleClose}
                className="px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
  );

  if (isControlledModal) {
    return <>{modalContent}</>;
  }

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          {label}
        </label>
      )}

      {/* Button to open selector */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setInternalIsOpen(true)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-white text-xs font-medium shadow-sm transition disabled:opacity-50 cursor-pointer"
      >
        <div className="flex items-center gap-2 truncate">
          <span className="text-base shrink-0">{selectedCurrency.flag || '🌐'}</span>
          <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {selectedCurrency.code}
          </span>
          <span className="text-slate-400 dark:text-slate-500 font-medium truncate">
            {selectedCurrency.name}
          </span>
        </div>
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 shrink-0">
          {selectedCurrency.disambiguatedSymbol}
        </span>
      </button>

      {modalContent}
    </div>
  );
}
