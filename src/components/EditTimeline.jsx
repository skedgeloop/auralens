import React from 'react';
import { FiFilter, FiSliders, FiCrop, FiRotateCw, FiMaximize2, FiZap } from 'react-icons/fi';

const EDIT_ICONS = {
  filter: FiFilter, adjust: FiSliders, crop: FiCrop,
  rotate: FiRotateCw, flip: FiMaximize2, ai: FiZap,
};

export default function EditTimeline({ past, future, currentIndex }) {
  if (past.length === 0 && future.length === 0) return null;

  const renderLabel = (edit) => {
    if (edit.type === 'filter') return edit.name || 'Filter';
    if (edit.type === 'adjust') return 'Adjust';
    if (edit.type === 'rotate') return edit.direction === 'cw' ? 'Rot →' : 'Rot ←';
    return 'Edit';
  };

  return (
    <div className="flex items-center gap-1.5 px-4 py-2 overflow-x-auto bg-[var(--surface)] border-t border-[var(--border)]">
      <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider font-bold mr-1 shrink-0">
        history
      </span>
      <div className={`timeline-item ${currentIndex < 0 ? 'current' : ''}`}>
        <span className="text-[10px]">original</span>
      </div>
      {past.map((edit, i) => {
        const Icon = EDIT_ICONS[edit.type] || FiFilter;
        const isCurrent = i === currentIndex;
        const isFuture = i > currentIndex;
        return (
          <React.Fragment key={i}>
            <div className="text-[var(--text-dim)] text-[10px] select-none">→</div>
            <div
              className={`timeline-item ${isCurrent ? 'current' : ''}`}
              style={isFuture ? { opacity: 0.3 } : undefined}
            >
              <Icon className={`w-3 h-3 ${isCurrent ? 'text-[var(--pink)]' : 'text-[var(--text-dim)]'}`} />
              <span>{renderLabel(edit)}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
