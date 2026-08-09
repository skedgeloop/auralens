import React from 'react';
import { FiZap, FiCheck } from 'react-icons/fi';

export default function EditSuggestions({ suggestions, onApplyEdit, appliedFilter }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)] flex items-center gap-1.5">
        <FiZap className="w-3 h-3 text-[var(--pink)]" /> suggestions
      </span>
      {suggestions.map((suggestion, index) => {
        const isApplied = appliedFilter === suggestion.filter;
        return (
          <button
            key={index}
            onClick={() => onApplyEdit(suggestion.filter)}
            disabled={isApplied}
            className={`w-full text-left rounded-lg p-3 border transition-all text-left ${
              isApplied
                ? 'border-[var(--pink)]/40 bg-[rgba(255,45,111,0.06)]'
                : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--pink)]/30'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span className={`mt-0.5 shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                isApplied ? 'bg-[var(--pink)] text-black' : 'bg-[var(--surface-2)] text-[var(--text-dim)]'
              }`}>
                {isApplied ? <FiCheck className="w-3 h-3" /> : index + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-white leading-snug font-medium">{suggestion.text}</p>
                {suggestion.reason && (
                  <p className="text-[10px] text-[var(--text-dim)] mt-0.5 truncate">{suggestion.reason}</p>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
