import React from 'react';
import {
  FiRefreshCw, FiDownload, FiRotateCcw, FiRotateCw,
  FiMaximize2, FiZoomIn, FiZoomOut, FiImage,
} from 'react-icons/fi';

/**
 * Top toolbar for the editor.
 */
export default function Toolbar({
  canUndo, canRedo, onUndo, onRedo,
  onExport, onRotateLeft, onRotateRight,
  onFlipH, onFlipV,
  zoom, onZoomIn, onZoomOut, onFitZoom,
  onNewImage, isComparing, onCompareToggle,
}) {
  return (
    <div className="toolbar">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-4">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <span className="font-display font-bold text-white text-sm">A</span>
        </div>
        <span className="font-display text-sm font-semibold text-white hidden md:block">
          Aura<span className="text-gradient">Lens</span>
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

      <div className="toolbar-divider" />

      {/* Transform */}
      <button className="btn-icon" onClick={onRotateLeft} title="Rotate left">
        <FiRotateCcw className="w-4 h-4" />
      </button>
      <button className="btn-icon" onClick={onRotateRight} title="Rotate right">
        <FiRotateCw className="w-4 h-4" />
      </button>
      <button className="btn-icon" onClick={onFlipH} title="Flip horizontal">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h3"/><path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/><line x1="12" y1="20" x2="12" y2="4"/></svg>
      </button>
      <button className="btn-icon" onClick={onFlipV} title="Flip vertical">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8V5a2 2 0 0 1 2-2h14c1.1 0 2 .9 2 2v3"/><path d="M3 16v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3"/><line x1="4" y1="12" x2="20" y2="12"/></svg>
      </button>

      <div className="toolbar-divider" />

      {/* Zoom */}
      <button className="btn-icon" onClick={onZoomOut} title="Zoom out (-)">
        <FiZoomOut className="w-4 h-4" />
      </button>
      <span className="text-[11px] text-[var(--text-dim)] tabular-nums w-12 text-center select-none">
        {Math.round(zoom * 100)}%
      </span>
      <button className="btn-icon" onClick={onZoomIn} title="Zoom in (+)">
        <FiZoomIn className="w-4 h-4" />
      </button>
      <button className="btn-icon" onClick={onFitZoom} title="Fit to screen (0)">
        <FiMaximize2 className="w-4 h-4" />
      </button>

      <div className="toolbar-divider" />

      {/* Compare */}
      <button
        className={`btn-icon ${isComparing ? 'active' : ''}`}
        onClick={onCompareToggle}
        title="Compare original (hold Space)"
      >
        <FiImage className="w-4 h-4" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <button onClick={onNewImage} className="btn btn-ghost text-xs">
        <FiImage className="w-3.5 h-3.5" /> New image
      </button>
      <button onClick={onExport} className="btn btn-primary text-xs">
        <FiDownload className="w-3.5 h-3.5" /> Export
      </button>
    </div>
  );
}
