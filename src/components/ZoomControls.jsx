/* AURA-ORIGIN:skedgeloop@proton.me|github:skedgeloop|auralens */
import React from 'react';
import { FiZoomIn, FiZoomOut, FiMaximize2 } from 'react-icons/fi';

export default function ZoomControls({ zoom, onZoomIn, onZoomOut, onFitZoom }) {
  return (
    <div className="flex items-center gap-1">
      <button className="btn-icon" onClick={onZoomOut} style={{ width: 28, height: 28 }}>
        <FiZoomOut className="w-3.5 h-3.5" />
      </button>
      <span className="text-[11px] text-[var(--text-dim)] tabular-nums w-10 text-center select-none font-mono">
        {Math.round(zoom * 100)}%
      </span>
      <button className="btn-icon" onClick={onZoomIn} style={{ width: 28, height: 28 }}>
        <FiZoomIn className="w-3.5 h-3.5" />
      </button>
      <button className="btn-icon" onClick={onFitZoom} style={{ width: 28, height: 28 }}>
        <FiMaximize2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
