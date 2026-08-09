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
      <img src={editedSrc} alt="" className="absolute inset-0 w-full h-full object-contain" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
        <img
          src={originalSrc} alt=""
          className="absolute inset-0 w-full h-full object-contain"
          style={{ width: containerRef.current ? containerRef.current.offsetWidth : '100%' }}
        />
      </div>
      <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg" style={{ left: `${position}%` }} />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg"
        style={{ left: `${position}%`, transform: 'translate(-50%, -50%)' }}
      >
        <FiChevronLeft className="w-3 h-3 text-black" />
        <FiChevronRight className="w-3 h-3 text-black" />
      </div>
      <div className="absolute top-3 left-3 px-2 py-1 rounded-md bg-black/70 text-[10px] font-bold text-white uppercase tracking-wider">
        before
      </div>
      <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-[var(--pink)] text-[10px] font-bold text-black uppercase tracking-wider">
        after
      </div>
    </div>
  );
}
