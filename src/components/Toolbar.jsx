/* AURA-ORIGIN:skedgeloop@proton.me|github:skedgeloop|auralens */
import React from 'react';
import {
  FiRefreshCw, FiDownload, FiRotateCcw, FiRotateCw,
  FiMaximize2, FiZoomIn, FiZoomOut, FiImage, FiX, FiZap,
} from 'react-icons/fi';

export default function Toolbar({
  canUndo, canRedo, onUndo, onRedo, onUndoAll,
  onExport, onRotateLeft, onRotateRight,
  onFlipH, onFlipV,
  zoom, onZoomIn, onZoomOut, onFitZoom,
  onNewImage, isComparing, onCompareToggle,
  autoEnhance, onAutoEnhanceToggle,
}) {
  return (
    <div className="toolbar">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mr-3">
        <div className="w-7 h-7 rounded-lg bg-[var(--pink)] flex items-center justify-center">
          <span className="font-display font-bold text-black text-sm">A</span>
        </div>
        <span className="font-display text-sm font-bold text-white tracking-tight hidden md:block">
          aura
        </span>
      </div>

      <div className="toolbar-divider" />

      {/* Undo / Redo */}
      <button className="btn-icon" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
        <FiRotateCcw className="w-4 h-4" />
      </button>
      <button className="btn-icon" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)">
        <FiRefreshCw className="w-4 h-4" />
      </button>
      <button className="btn-icon" onClick={onUndoAll} disabled={!canUndo} title="Undo all — reset to original">
        <FiX className="w-4 h-4" />
      </button>

      <div className="toolbar-divider" />

      {/* Transform */}
      <button className="btn-icon" onClick={onRotateLeft} title="Rotate left">
        <FiRotateCcw className="w-4 h-4" />
      </button>
      <button className="btn-icon" onClick={onRotateRight} title="Rotate right">
        <FiRotateCw className="w-4 h-4" />
      </button>

      <div className="toolbar-divider" />

      {/* Zoom */}
      <button className="btn-icon" onClick={onZoomOut} title="Zoom out">
        <FiZoomOut className="w-4 h-4" />
      </button>
      <span className="text-[11px] text-[var(--text-dim)] tabular-nums w-10 text-center select-none font-mono">
        {Math.round(zoom * 100)}%
      </span>
      <button className="btn-icon" onClick={onZoomIn} title="Zoom in">
        <FiZoomIn className="w-4 h-4" />
      </button>
      <button className="btn-icon" onClick={onFitZoom} title="Fit">
        <FiMaximize2 className="w-4 h-4" />
      </button>

      <div className="toolbar-divider" />

      {/* Compare */}
      <button
        className={`btn-icon ${isComparing ? 'active' : ''}`}
        onClick={onCompareToggle}
        title="Compare"
      >
        <FiImage className="w-4 h-4" />
      </button>

      <div className="flex-1" />

      {/* Auto-enhance toggle */}
      <button
        onClick={onAutoEnhanceToggle}
        className={`btn-icon ${autoEnhance ? 'active' : ''}`}
        title={autoEnhance ? 'AI auto-enhance ON — click to edit manually' : 'AI auto-enhance OFF — manual mode'}
      >
        <FiZap className="w-4 h-4" />
      </button>

      {/* Actions */}
      <button onClick={onNewImage} className="btn btn-dark text-xs">
        <FiImage className="w-3.5 h-3.5" /> new pic
      </button>
      <button onClick={onExport} className="btn btn-pink text-xs">
        <FiDownload className="w-3.5 h-3.5" /> export
      </button>
    </div>
  );
}
