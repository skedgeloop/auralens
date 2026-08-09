import React from 'react';
import { FiZap, FiCheck } from 'react-icons/fi';

const EditSuggestions = ({ suggestions, onApplyEdit, appliedFilter }) => {
  return (
    <div className="glass rounded-3xl p-5">
      <h3 className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-[#94a0c3] mb-4 flex items-center">
        <FiZap className="w-3.5 h-3.5 mr-2 text-amber-300" />
        AI Suggestions
      </h3>

      <div className="space-y-2.5">
        {suggestions.map((suggestion, index) => {
          const isApplied = appliedFilter === suggestion.filter;
          return (
            <button
              key={index}
              onClick={() => onApplyEdit(suggestion.filter)}
              disabled={isApplied}
              className={`w-full text-left rounded-2xl p-3.5 border transition-all duration-200
                ${
                  isApplied
                    ? 'border-cyan-400/60 bg-cyan-400/10'
                    : 'border-white/10 bg-white/[0.03] hover:border-violet-400/50 hover:bg-white/[0.06]'
                }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white
                    ${
                      isApplied
                        ? 'bg-cyan-400'
                        : 'bg-gradient-to-br from-violet-500 to-cyan-400 shadow-[0_0_16px_-4px_rgba(139,92,246,0.8)]'
                    }`}
                >
                  {isApplied ? <FiCheck className="w-3.5 h-3.5" /> : index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/90 leading-snug">{suggestion.text}</p>
                  <p className="text-xs text-[#94a0c3] mt-1 line-clamp-2">{suggestion.reason}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default EditSuggestions;
