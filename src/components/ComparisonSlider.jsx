import React, { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Before/After comparison slider.
 * Renders as an overlay on top of the image area.
 */
export default function ComparisonSlider({ originalSrc, editedSrc, isComparing }) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef(null);
  const dragging = useRef(false);

  const updatePosition = useCallback((e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

  useEffect(() => {
    const onMove = (e) => { if (dragging.current) updatePosition(e); };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [updatePosition]);

  // Reset position when toggling on
  useEffect(() => {
    if (isComparing) setPosition(50);
  }, [isComparing]);

  if (!isComparing || !originalSrc || !editedSrc) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-30 cursor-ew-resize"
      onMouseDown={(e) => { dragging.current = true; updatePosition(e); }}
    >
      {/* Edited (right side) — full image underneath */}
      <img
        src={editedSrc}
        alt=""
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
      />

      {/* Original (left side) — clipped */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img
          src={originalSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-contain"
          draggable={false}
        />
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-[2px] bg-white/80 z-10 pointer-events-none"
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      />

      {/* Drag handle */}
      <div
        className="absolute top-1/2 w-10 h-10 rounded-full bg-white shadow-2xl flex items-center justify-center z-20 pointer-events-none"
        style={{ left: `${position}%`, transform: 'translate(-50%, -50%)' }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round">
          <path d="M8 3l-5 9 5 9M16 3l5 9-5 9" />
        </svg>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 px-2 py-1 rounded bg-black/70 text-[11px] font-bold text-white uppercase tracking-wider z-10 pointer-events-none">
        original
      </div>
      <div className="absolute top-3 right-3 px-2 py-1 rounded bg-[var(--pink)] text-[11px] font-bold text-black uppercase tracking-wider z-10 pointer-events-none">
        edited
      </div>
    </div>
  );
}
