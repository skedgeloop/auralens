/* AURA-ORIGIN:skedgeloop@proton.me|github:skedgeloop|auralens */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FiSun, FiMoon, FiCheck, FiCornerUpLeft, FiCornerUpRight, FiCornerDownLeft, FiCornerDownRight } from 'react-icons/fi';
import { applyDodgeBurn } from '../lib/imageFilters';

// Panel corner options + the Tailwind classes for each corner
const CORNERS = {
  'top-left': 'top-3 left-3',
  'top-right': 'top-3 right-3',
  'bottom-left': 'bottom-3 left-3',
  'bottom-right': 'bottom-3 right-3',
};

const RANGES = [
  { key: 'shadows', label: 'Shadows' },
  { key: 'midtones', label: 'Midtones' },
  { key: 'highlights', label: 'Highlights' },
];

/**
 * Dodge & Burn tool.
 * Floating panel over the image: drag to paint dodge (lighten) / burn (darken)
 * strokes with a soft radial brush, tune brush size / strength / tonal range,
 * then apply all strokes as a revertable history step.
 *
 * While the panel is open a transparent capture layer covers the image so
 * pointer drags paint strokes; close it to free the comparison slider.
 *
 * Rendered inside a wrapper that exactly wraps the image (inset-0), so
 * rect == rendered image box. naturalWidth/Height convert CSS px -> image px.
 */
export default function DodgeBurnTool({ imageSrc, onApply, naturalWidth = 0, naturalHeight = 0 }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState('bottom-left'); // panel corner (default clear of SelectionTool)
  const [brushSize, setBrushSize] = useState(40);
  const [strength, setStrength] = useState(50);
  const [mode, setMode] = useState('dodge');
  const [range, setRange] = useState('midtones');
  const [strokes, setStrokes] = useState([]);
  const [cursor, setCursor] = useState(null); // { x, y, scale } while hovering the image
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const layerRef = useRef(null);
  const paintingRef = useRef(false);

  // Clear strokes when the image changes
  useEffect(() => {
    setStrokes([]);
    setCursor(null);
    setError(null);
  }, [imageSrc]);

  // Build a stroke from the current tool settings
  const strokeFor = useCallback((px, py) => ({
    x: px, y: py,
    radius: brushSize,
    strength: strength / 100,
    mode,
    range,
  }), [brushSize, strength, mode, range]);

  // Convert a pointer event to image px and append stroke(s). Interpolates
  // between the previous stroke and the current point so fast drags paint a
  // continuous line instead of a dotted one.
  const addStroke = useCallback((e) => {
    if (!imageSrc || !layerRef.current || !paintingRef.current) return;
    const rect = layerRef.current.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const cx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const cy = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const iw = naturalWidth || rect.width;
    const ih = naturalHeight || rect.height;
    const px = Math.min(iw - 1, Math.round(cx * iw));
    const py = Math.min(ih - 1, Math.round(cy * ih));

    setStrokes((prev) => {
      const base = strokeFor(px, py);
      const last = prev[prev.length - 1];
      if (!last) return [base];
      const dx = px - last.x;
      const dy = py - last.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const step = Math.max(2, base.radius / 2);
      const count = Math.max(1, Math.ceil(dist / step));
      const next = [...prev];
      for (let t = 1; t <= count; t++) {
        next.push({ ...base, x: Math.round(last.x + (dx * t) / count), y: Math.round(last.y + (dy * t) / count) });
      }
      return next;
    });
  }, [imageSrc, naturalWidth, naturalHeight, strokeFor]);

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    paintingRef.current = true;
    layerRef.current?.setPointerCapture?.(e.pointerId);
    addStroke(e);
  }, [addStroke]);

  const handlePointerMove = useCallback((e) => {
    if (!layerRef.current) return;
    const rect = layerRef.current.getBoundingClientRect();
    if (rect.width < 1) return;
    const iw = naturalWidth || rect.width;
    setCursor({
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
      scale: rect.width / iw, // CSS px per image px
    });
    if (paintingRef.current) addStroke(e);
  }, [naturalWidth, addStroke]);

  const handlePointerUp = useCallback((e) => {
    paintingRef.current = false;
    const layer = layerRef.current;
    if (layer?.hasPointerCapture?.(e.pointerId)) layer.releasePointerCapture(e.pointerId);
  }, []);

  const handlePointerLeave = useCallback(() => setCursor(null), []);

  const handleApply = useCallback(async () => {
    if (!strokes.length || !imageSrc) return;
    setBusy(true);
    setError(null);
    try {
      const result = await applyDodgeBurn(imageSrc, { strokes });
      onApply?.(result, 'Dodge/Burn');
      setStrokes([]);
    } catch (err) {
      console.error('Dodge & burn failed:', err);
      setError('apply failed — try again');
    } finally {
      setBusy(false);
    }
  }, [strokes, imageSrc, onApply]);

  const handleClear = useCallback(() => {
    setStrokes([]);
    setError(null);
  }, []);

  const brushCssSize = cursor ? brushSize * cursor.scale : 0;

  return (
    <div className="absolute inset-0 z-40 pointer-events-none">
      {/* Paint capture layer — only intercepts while the tool is open */}
      {open && (
        <div
          ref={layerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          className={`absolute inset-0 pointer-events-auto ${busy ? 'cursor-wait' : 'cursor-crosshair'}`}
          style={{ touchAction: 'none' }}
          title="drag to paint dodge / burn"
        />
      )}

      {/* Brush cursor preview */}
      {open && cursor && (
        <div
          className="absolute pointer-events-none rounded-full border border-[var(--pink)]/70 bg-[var(--pink)]/10"
          style={{
            left: `${cursor.x * 100}%`,
            top: `${cursor.y * 100}%`,
            width: brushCssSize,
            height: brushCssSize,
            transform: 'translate(-50%, -50%)',
          }}
        />
      )}

      {/* Floating panel — positionable to any corner */}
      <div className={`absolute ${CORNERS[position] || CORNERS['bottom-left']} z-10 pointer-events-auto`}>
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className="btn btn-pink py-2.5 px-4 text-xs shadow-lg flex items-center gap-1.5"
            title="Dodge & burn"
          >
            <FiSun className="w-3.5 h-3.5" /> dodge & burn
          </button>
        ) : (
          <div className="w-60 rounded-xl bg-black/85 backdrop-blur-lg border border-white/10 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--pink)] flex items-center gap-1.5">
                <FiSun className="w-3 h-3" /> dodge & burn
              </span>
              <div className="flex items-center gap-1">
                {/* Corner picker — move the panel to any corner */}
                <div className="flex items-center gap-0.5 mr-1" title="Move panel to a corner">
                  <button onClick={() => setPosition('top-left')} className={`w-4 h-4 rounded flex items-center justify-center ${position === 'top-left' ? 'bg-[var(--pink)] text-black' : 'bg-white/10 text-white/60 hover:text-white'}`} aria-label="Top left"><FiCornerUpLeft className="w-2.5 h-2.5" /></button>
                  <button onClick={() => setPosition('top-right')} className={`w-4 h-4 rounded flex items-center justify-center ${position === 'top-right' ? 'bg-[var(--pink)] text-black' : 'bg-white/10 text-white/60 hover:text-white'}`} aria-label="Top right"><FiCornerUpRight className="w-2.5 h-2.5" /></button>
                  <button onClick={() => setPosition('bottom-left')} className={`w-4 h-4 rounded flex items-center justify-center ${position === 'bottom-left' ? 'bg-[var(--pink)] text-black' : 'bg-white/10 text-white/60 hover:text-white'}`} aria-label="Bottom left"><FiCornerDownLeft className="w-2.5 h-2.5" /></button>
                  <button onClick={() => setPosition('bottom-right')} className={`w-4 h-4 rounded flex items-center justify-center ${position === 'bottom-right' ? 'bg-[var(--pink)] text-black' : 'bg-white/10 text-white/60 hover:text-white'}`} aria-label="Bottom right"><FiCornerDownRight className="w-2.5 h-2.5" /></button>
                </div>
                <button onClick={() => setOpen(false)} className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white text-[8px]">×</button>
              </div>
            </div>

            <div className="p-3 flex flex-col gap-2.5">
              <p className="text-[10px] text-[var(--text-dim)] leading-snug">
                drag the image to paint. pick a mode &amp; tonal range, then apply.
              </p>

              {/* Mode toggle — dodge (lighten) / burn (darken) */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setMode('dodge')}
                  className={`py-1.5 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors ${mode === 'dodge' ? 'bg-[var(--pink)] text-black' : 'bg-white/10 text-white/60 hover:text-white'}`}
                >
                  <FiSun className="w-3 h-3" /> dodge
                </button>
                <button
                  onClick={() => setMode('burn')}
                  className={`py-1.5 rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors ${mode === 'burn' ? 'bg-[var(--pink)] text-black' : 'bg-white/10 text-white/60 hover:text-white'}`}
                >
                  <FiMoon className="w-3 h-3" /> burn
                </button>
              </div>

              {/* Tonal range selector */}
              <div className="grid grid-cols-3 gap-1">
                {RANGES.map((r) => (
                  <button
                    key={r.key}
                    onClick={() => setRange(r.key)}
                    className={`py-1.5 rounded text-[10px] font-bold transition-colors ${range === r.key ? 'bg-[var(--pink)] text-black' : 'bg-white/10 text-white/60 hover:text-white'}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>

              {/* Brush size */}
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] text-[var(--text-dim)] font-medium">brush</span>
                <span className="text-[11px] text-white font-mono tabular-nums">{brushSize}px</span>
              </div>
              <input
                type="range" min={5} max={200} value={brushSize} aria-label="Brush size"
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="slider"
                style={{
                  background: `linear-gradient(to right, var(--pink) 0%, var(--pink) ${((brushSize - 5) / 195) * 100}%, #222 ${((brushSize - 5) / 195) * 100}%)`,
                }}
              />

              {/* Strength */}
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] text-[var(--text-dim)] font-medium">strength</span>
                <span className="text-[11px] text-white font-mono tabular-nums">{strength}%</span>
              </div>
              <input
                type="range" min={1} max={100} value={strength} aria-label="Strength"
                onChange={(e) => setStrength(Number(e.target.value))}
                className="slider"
                style={{
                  background: `linear-gradient(to right, var(--pink) 0%, var(--pink) ${strength}%, #222 ${strength}%)`,
                }}
              />

              {error && <p className="text-[10px] text-red-400">{error}</p>}
              {strokes.length > 0 && (
                <p className="text-[10px] text-[var(--text-dim)] font-mono">
                  {strokes.length} stroke{strokes.length === 1 ? '' : 's'} painted
                </p>
              )}

              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={handleClear} disabled={!strokes.length || busy} className="btn btn-dark py-2 text-[11px] disabled:opacity-40">clear strokes</button>
                <button
                  onClick={handleApply}
                  disabled={!strokes.length || busy}
                  className="btn btn-pink py-2 text-[11px] flex items-center justify-center gap-1 disabled:opacity-40"
                >
                  <FiCheck className="w-3 h-3" /> {busy ? 'applying…' : 'apply'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
