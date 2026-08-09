import { useEffect, useCallback } from 'react';

/**
 * Register global keyboard shortcuts.
 * @param {Object} handlers - { onUndo, onRedo, onExport, onCompare, onZoomIn, onZoomOut, onFitZoom }
 */
export default function useKeyboardShortcuts(handlers) {
  const handleKeyDown = useCallback((e) => {
    const { key, ctrlKey, metaKey, shiftKey } = e;
    const mod = ctrlKey || metaKey;

    // Ctrl+Z — Undo
    if (mod && key === 'z' && !shiftKey) {
      e.preventDefault();
      handlers.onUndo?.();
      return;
    }

    // Ctrl+Y or Ctrl+Shift+Z — Redo
    if ((mod && key === 'y') || (mod && shiftKey && key === 'z')) {
      e.preventDefault();
      handlers.onRedo?.();
      return;
    }

    // Ctrl+S — Export
    if (mod && key === 's') {
      e.preventDefault();
      handlers.onExport?.();
      return;
    }

    // Space — Compare (hold)
    if (key === ' ' && !mod) {
      // Don't preventDefault here so scroll doesn't break; let consumer check
      handlers.onCompareStart?.();
      return;
    }

    // + / = — Zoom in
    if ((key === '+' || key === '=') && !mod) {
      e.preventDefault();
      handlers.onZoomIn?.();
      return;
    }

    // - — Zoom out
    if (key === '-' && !mod) {
      e.preventDefault();
      handlers.onZoomOut?.();
      return;
    }

    // 0 — Fit to screen
    if (key === '0' && !mod) {
      e.preventDefault();
      handlers.onFitZoom?.();
      return;
    }

    // Escape — close dialogs
    if (key === 'Escape') {
      handlers.onEscape?.();
      return;
    }
  }, [handlers]);

  const handleKeyUp = useCallback((e) => {
    if (e.key === ' ') {
      handlers.onCompareEnd?.();
    }
  }, [handlers]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
}
