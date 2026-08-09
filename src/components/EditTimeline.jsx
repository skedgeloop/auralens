import React from 'react';
import { FiFilter, FiSliders, FiCrop, FiRotateCw, FiMaximize2, FiZap } from 'react-icons/fi';

const EDIT_ICONS = {
  filter: FiFilter,
  adjust: FiSliders,
  crop: FiCrop,
  rotate: FiRotateCw,
  flip: FiMaximize2,
  ai: FiZap,
};

const EDIT_COLORS = {
  filter: 'text-violet-400',
  adjust: 'text-cyan-400',
  crop: 'text-amber-400',
  rotate: 'text-pink-400',
  flip: 'text-emerald-400',
  ai: 'text-yellow-400',
};

/**
 * Horizontal timeline showing all applied edits.
 */
export default function EditTimeline({ past, future, currentIndex }) {
  if (past.length === 0 && future.length === 0) return null;

  const renderLabel = (edit) => {
    if (edit.type === 'filter') return edit.name || 'Filter';
    if (edit.type === 'adjust') return 'Adjustments';
    if (edit.type === 'crop') return 'Crop';
    if (edit.type === 'rotate') return edit.direction === 'cw' ? 'Rotate →' : 'Rotate ←';
    if (edit.type === 'flip') return edit.direction === 'h' ? 'Flip H' : 'Flip V';
    if (edit.type === 'ai') return 'AI Detect';
    return 'Edit';
  };

  return (
    <div className="flex items-center gap-1.5 px-4 py-2 overflow-x-auto bg-[var(--bg-elevated)] border-t border-[var(--border)]">
      <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider font-semibold mr-1 shrink-0">
        History
      </span>

      {/* Original */}
      <div className={`timeline-item ${currentIndex < 0 ? 'current' : ''}`}>
        <span className="text-[10px]">Original</span>
      </div>

      {past.map((edit, i) => {
        const Icon = EDIT_ICONS[edit.type] || FiFilter;
        const colorClass = EDIT_COLORS[edit.type] || 'text-[var(--text-dim)]';
        const isCurrent = i === currentIndex;
        const isFuture = i > currentIndex;

        return (
          <React.Fragment key={i}>
            <div className="text-[var(--text-dim)] text-[10px] select-none">→</div>
            <div
              className={`timeline-item ${isCurrent ? 'current' : ''}`}
              style={isFuture ? { opacity: 0.35 } : undefined}
            >
              <Icon className={`w-3 h-3 ${isCurrent ? 'text-[var(--accent)]' : colorClass}`} />
              <span>{renderLabel(edit)}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
