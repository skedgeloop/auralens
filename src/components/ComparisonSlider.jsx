import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

/**
 * Before/After comparison slider over the image.
 * Drag the handle to reveal original (left) vs edited (right).
 */
export default function ComparisonSlider({ originalSrc, editedSrc, isComparing, onToggle }) {
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

  const handleMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);

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
      className="comparison-container absolute inset-0 z-20"
      onMouseDown={handleMouseDown}
    >
      {/* Edited (right side, full width underneath) */}
      <img src={editedSrc} alt="Edited" className="absolute inset-0 w-full h-full object-contain" />

      {/* Original (left side, clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${position}%` }}
      >
        <img
          src={originalSrc}
          alt="Original"
          className="absolute inset-0 w-full h-full object-contain"
          style={{ width: containerRef.current ? containerRef.current.offsetWidth : '100%' }}
        />
      </div>

      {/* Divider line */}
      <div className="comparison-line" style={{ left: `${position}%` }} />

      {/* Handle */}
      <div className="comparison-handle" style={{ left: `${position}%` }}>
        <div className="flex items-center gap-0">
          <FiChevronLeft className="w-3 h-3 text-gray-800" />
          <FiChevronRight className="w-3 h-3 text-gray-800" />
        </div>
      </div>

      {/* Labels */}
      <div className="comparison-label left-4 bg-black/60 text-white backdrop-blur-sm">
        Original
      </div>
      <div className="comparison-label right-4 bg-white/90 text-gray-900">
        Edited
      </div>
    </div>
  );
}
