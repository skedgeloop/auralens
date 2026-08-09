import React, { useEffect, useState } from 'react';
import { FiRefreshCw, FiStar } from 'react-icons/fi';
import { createFilterPreviews } from '../lib/imageFilters';

const FilterControls = ({
  filters,
  categories,
  activeCategory = 'all',
  onCategoryChange,
  activeFilter,
  onFilterSelect,
  filterIntensity = 100,
  onIntensityChange,
  previewImage,
  onReset,
}) => {
  const [previews, setPreviews] = useState({});

  useEffect(() => {
    let cancelled = false;
    setPreviews({});
    if (!previewImage) return;
    createFilterPreviews(previewImage, 100).then((result) => {
      if (!cancelled) setPreviews(result);
    });
    return () => { cancelled = true; };
  }, [previewImage]);

  const entries = Object.entries(filters).filter(([key]) => key !== 'none');
  const filtered = activeCategory === 'all'
    ? entries
    : entries.filter(([, f]) => f.category === activeCategory);

  return (
    <div className="flex flex-col gap-4">
      {/* Category tabs */}
      {categories && categories.length > 0 && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => onCategoryChange?.(cat.key)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                activeCategory === cat.key
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-dim)] hover:text-white hover:bg-white/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Filter grid */}
      <div className="grid grid-cols-4 gap-2">
        {/* Original/none button */}
        <button
          onClick={() => onFilterSelect('none')}
          className={`group flex flex-col items-center gap-1.5 rounded-xl p-1.5 transition-all ${
            activeFilter === 'none'
              ? 'bg-[rgba(99,102,241,0.12)] ring-1 ring-[var(--accent)]/50'
              : 'hover:bg-white/5'
          }`}
        >
          <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-[var(--border)] bg-white/5 flex items-center justify-center">
            <span className="text-[10px] text-[var(--text-dim)] font-medium">Original</span>
          </div>
        </button>

        {filtered.map(([key, filter]) => {
          const isActive = activeFilter === key;
          return (
            <button
              key={key}
              onClick={() => onFilterSelect(key)}
              className={`group flex flex-col items-center gap-1.5 rounded-xl p-1.5 transition-all ${
                isActive
                  ? 'bg-[rgba(99,102,241,0.12)] ring-1 ring-[var(--accent)]/50'
                  : 'hover:bg-white/5'
              }`}
            >
              <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-[var(--border)] bg-white/5">
                {previews[key] ? (
                  <img src={previews[key]} alt={filter.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-400/20" />
                )}
                {isActive && (
                  <div className="absolute inset-0 ring-1 ring-inset ring-[var(--accent)]/60 rounded-lg" />
                )}
              </div>
              <span className={`text-[10px] font-medium leading-tight text-center ${
                isActive ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'
              }`}>
                {filter.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter intensity slider */}
      {activeFilter && activeFilter !== 'none' && onIntensityChange && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-[var(--text-dim)]">Intensity</span>
            <span className="text-[11px] text-[var(--text-dim)] tabular-nums">{filterIntensity}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={filterIntensity}
            onChange={(e) => onIntensityChange(Number(e.target.value))}
            className="slider"
            style={{
              background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${filterIntensity}%, rgba(255,255,255,0.1) ${filterIntensity}%)`,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default FilterControls;
