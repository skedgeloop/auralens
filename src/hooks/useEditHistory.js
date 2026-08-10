/* AURA-ORIGIN:skedgeloop@proton.me|github:skedgeloop|auralens */
import { useState, useCallback, useRef } from 'react';

/**
 * Non-destructive edit history hook.
 * Stores edit operations in a stack; images are always derived from
 * the original by replaying the active operations.
 *
 * @param {string|null} originalImage - The pristine uploaded image data URL
 * @returns {Object} - history state and actions
 */
export default function useEditHistory(originalImage) {
  const [history, setHistory] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [displayedImage, setDisplayedImage] = useState(null);

  // The full history stack (past + current + future)
  const pastRef = useRef([]);
  const futureRef = useRef([]);

  const canUndo = currentIndex >= 0;
  const canRedo = futureRef.current.length > 0;

  const pushEdit = useCallback((edit) => {
    // Truncate any redo history, append new edit
    const newPast = [...pastRef.current.slice(0, currentIndex + 1), edit];
    pastRef.current = newPast;
    futureRef.current = [];
    setCurrentIndex(newPast.length - 1);
  }, [currentIndex]);

  const undo = useCallback(() => {
    if (!canUndo) return null;
    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    // Move current to future
    futureRef.current = [pastRef.current[currentIndex], ...futureRef.current];
    return newIndex >= 0 ? pastRef.current[newIndex] : null;
  }, [canUndo, currentIndex]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return null;
    const next = futureRef.current[0];
    futureRef.current = futureRef.current.slice(1);
    pastRef.current = [...pastRef.current.slice(0, currentIndex + 1), next];
    setCurrentIndex(currentIndex + 1);
    return next;
  }, [currentIndex]);

  const getActiveEdits = useCallback(() => {
    return pastRef.current.slice(0, currentIndex + 1);
  }, [currentIndex]);

  const clearHistory = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    setCurrentIndex(-1);
  }, []);

  // Build the timeline for the UI
  const getTimeline = useCallback(() => {
    const past = pastRef.current.slice(0, currentIndex + 1);
    const future = futureRef.current;
    return { past, future, current: currentIndex };
  }, [currentIndex]);

  return {
    history,
    currentIndex,
    canUndo,
    canRedo,
    pushEdit,
    undo,
    redo,
    getActiveEdits,
    clearHistory,
    getTimeline,
    displayedImage,
    setDisplayedImage,
  };
}
