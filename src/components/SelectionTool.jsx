import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FiZap as FiWand2, FiCheck } from 'react-icons/fi';
import { magicWandSelect, applyMaskedEffect, invertMask, maskToDataUrl } from '../lib/imageFilters';

/**
 * Magic Wand / Selective Selection tool.
 * Floating panel over the image: click to seed a flood-fill, tune tolerance,
 * then apply an effect (blur / desaturate) only inside the selection.
 *
 * While the panel is open a transparent capture layer covers the image so
 * clicks seed the selection; close it to free the comparison slider.
 *
 * Rendered inside a wrapper that exactly wraps the image (inset-0), so
 * rect == rendered image box. naturalWidth/Height convert CSS px -> image px.
 */
export default function SelectionTool({ imageSrc, onApply, naturalWidth = 0, naturalHeight = 0 }) {
  const [open, setOpen] = useState(false);
  const [tolerance, setTolerance] = useState(30);
  const [selection, setSelection] = useState(null); // { mask, width, height }
  const [overlaySrc, setOverlaySrc] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const layerRef = useRef(null);

  // Clear the selection when the image changes
  useEffect(() => {
    setSelection(null);
    setOverlaySrc(null);
    setError(null);
  }, [imageSrc]);

  const computeOverlay = useCallback(async (sel) => {
    setOverlaySrc(maskToDataUrl(sel.mask, sel.width, sel.height, 0.25));
  }, []);

  const handleClick = useCallback(async (e) => {
    if (!imageSrc || !layerRef.current) return;
    const rect = layerRef.current.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const cx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const cy = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const iw = naturalWidth || rect.width;
    const ih = naturalHeight || rect.height;
    const px = Math.min(iw - 1, Math.round(cx * iw));
    const py = Math.min(ih - 1, Math.round(cy * ih));

    setBusy(true);
    setError(null);
    try {
      const sel = await magicWandSelect(imageSrc, px, py, tolerance);
      setSelection(sel);
      await computeOverlay(sel);
    } catch (err) {
      console.error('Magic wand failed:', err);
      setError('selection failed — try again');
    } finally {
      setBusy(false);
    }
  }, [imageSrc, tolerance, naturalWidth, naturalHeight, computeOverlay]);

  const handleInvert = useCallback(async () => {
    if (!selection) return;
    const sel = { mask: invertMask(selection.mask, selection.width, selection.height), width: selection.width, height: selection.height };
    setSelection(sel);
    await computeOverlay(sel);
  }, [selection, computeOverlay]);

  const handleApplyEffect = useCallback(async (effect) => {
    if (!selection || !imageSrc) return;
    setBusy(true);
    setError(null);
    try {
      const { mask, width, height } = selection;
      const result = await applyMaskedEffect(imageSrc, mask, width, height, effect);
      onApply?.(result, effect === 'blur' ? 'Blur selection' : 'Desaturate selection');
      // The applied image becomes the new source (imageSrc prop changes),
      // which clears this selection — reselect to stack another effect.
    } catch (err) {
      console.error('Masked effect failed:', err);
      setError('effect failed — try again');
    } finally {
      setBusy(false);
    }
  }, [selection, imageSrc, onApply]);

  const handleClear = useCallback(() => {
    setSelection(null);
    setOverlaySrc(null);
    setError(null);
  }, []);

  const counts = selection ? {
    total: selection.width * selection.height,
    selected: selection.mask.reduce((n, v) => n + v, 0),
  } : null;

  return (
    <div className="absolute inset-0 z-40 pointer-events-none">
      {/* Click capture layer — only intercepts while the tool is open */}
      {open && (
        <div
          ref={layerRef}
          onClick={handleClick}
          className={`absolute inset-0 pointer-events-auto ${busy ? 'cursor-wait' : 'cursor-crosshair'}`}
          title="click to select"
        />
      )}

      {/* Selection overlay — pink tint over selected pixels */}
      {open && overlaySrc && (
        <img
          src={overlaySrc}
          alt=""
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          draggable={false}
        />
      )}

      {/* Floating panel */}
      <div className="absolute bottom-3 right-3 z-10 pointer-events-auto">
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className="btn btn-pink py-2.5 px-4 text-xs shadow-lg flex items-center gap-1.5"
            title="Magic wand / selective selection"
          >
            <FiWand2 className="w-3.5 h-3.5" /> magic wand
          </button>
        ) : (
          <div className="w-60 rounded-xl bg-black/85 backdrop-blur-lg border border-white/10 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--pink)] flex items-center gap-1.5">
                <FiWand2 className="w-3 h-3" /> selective selection
              </span>
              <button onClick={() => setOpen(false)} className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white text-[8px]">×</button>
            </div>

            <div className="p-3 flex flex-col gap-2.5">
              <p className="text-[10px] text-[var(--text-dim)] leading-snug">
                click the image to set the seed point, then tune tolerance &amp; apply.
              </p>

              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] text-[var(--text-dim)] font-medium">tolerance</span>
                <span className="text-[11px] text-white font-mono tabular-nums">{tolerance}</span>
              </div>
              <input
                type="range" min={0} max={100} value={tolerance} aria-label="Tolerance"
                onChange={(e) => setTolerance(Number(e.target.value))}
                className="slider"
                style={{
                  background: `linear-gradient(to right, var(--pink) 0%, var(--pink) ${tolerance}%, #222 ${tolerance}%)`,
                }}
              />

              {error && <p className="text-[10px] text-red-400">{error}</p>}
              {counts && (
                <p className="text-[10px] text-[var(--text-dim)] font-mono">
                  {counts.selected.toLocaleString()} / {counts.total.toLocaleString()} px selected ({Math.round((counts.selected / counts.total) * 100)}%)
                </p>
              )}

              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={handleInvert} disabled={!selection || busy} className="btn btn-dark py-2 text-[11px] disabled:opacity-40">invert</button>
                <button onClick={handleClear} disabled={busy} className="btn btn-dark py-2 text-[11px] disabled:opacity-40">clear</button>
                <button
                  onClick={() => handleApplyEffect('blur')}
                  disabled={!selection || busy}
                  className="btn btn-dark py-2 text-[11px] flex items-center justify-center gap-1 disabled:opacity-40"
                >
                  <FiCheck className="w-3 h-3" /> blur
                </button>
                <button
                  onClick={() => handleApplyEffect('desaturate')}
                  disabled={!selection || busy}
                  className="btn btn-dark py-2 text-[11px] flex items-center justify-center gap-1 disabled:opacity-40"
                >
                  <FiCheck className="w-3 h-3" /> desaturate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
