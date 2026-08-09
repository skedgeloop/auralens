import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export default function ComparisonSlider({ originalSrc, editedSrc, isComparing }) {
  const containerRef = useRef(null);
  const [position, setPosition] = useState(50);
  const dragging = useRef(false);

  const updatePosition = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    updatePosition(e.clientX);
  }, [updatePosition]);

  const handleMouseMove = useCallback((e) => {
    if (!dragging.current) return;
    updatePosition(e.clientX);
  }, [updatePosition]);

  const handleMouseUp = useCallback(() => { dragging.current = false; }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  if (!isComparing || !originalSrc || !editedSrc) return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-20 cursor-ew-resize select-none"
      onMouseDown={handleMouseDown}
    >
      {/* Edited image (full, underneath) */}
      <img src={editedSrc} alt="" className="absolute inset-0 w-full h-full object-contain" />

      {/* Original image (clipped to left side) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img
          src={originalSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-contain"
        />
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
        style={{ left: `${position}%` }}
      />

      {/* Handle */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg z-20"
        style={{ left: `${position}%`, transform: 'translate(-50%, -50%)' }}
      >
        <FiChevronLeft className="w-3 h-3 text-black" />
        <FiChevronRight className="w-3 h-3 text-black" />
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/70 text-[10px] font-bold text-white uppercase tracking-wider z-10">
        before
      </div>
      <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-[var(--pink)] text-[10px] font-bold text-black uppercase tracking-wider z-10">
        after
      </div>
    </div>
  );
}
