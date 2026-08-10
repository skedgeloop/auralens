/* AURA-ORIGIN:skedgeloop@proton.me|github:skedgeloop|auralens */
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  FiEye, FiLayers, FiZap, FiStar,
  FiSliders, FiFilter, FiZap as FiZapIcon,
  FiCrop, FiImage, FiActivity, FiBarChart2, FiDroplet, FiTool,
} from 'react-icons/fi';
import UploadArea from '../src/components/UploadArea';
import FilterControls from '../src/components/FilterControls';
import EditSuggestions from '../src/components/EditSuggestions';
import AIPanel from '../src/components/AIPanel';
import Toolbar from '../src/components/Toolbar';
import ComparisonSlider from '../src/components/ComparisonSlider';
import SelectionTool from '../src/components/SelectionTool';
import DodgeBurnTool from '../src/components/DodgeBurnTool';
import AdjustmentPanel, { applyAdjustments } from '../src/components/AdjustmentPanel';
import CurvesPanel from '../src/components/CurvesPanel';
import ColorBalancePanel from '../src/components/ColorBalancePanel';
import PalettePanel from '../src/components/PalettePanel';
import WarpPanel from '../src/components/WarpPanel';
import BlurPanel from '../src/components/BlurPanel';
import FreqSepPanel from '../src/components/FreqSepPanel';
import HistogramPanel from '../src/components/HistogramPanel';
import FinishPanel from '../src/components/FinishPanel';
import ExportDialog from '../src/components/ExportDialog';
import EditTimeline from '../src/components/EditTimeline';
import Toast from '../src/components/Toast';
import ExifPanel from '../src/components/ExifPanel';
import SharpenPanel from '../src/components/SharpenPanel';
import {
  applyFilterToDataUrl, blendImages, FILTERS, FILTER_CATEGORIES,
  rotateImage, flipImage, getImageDimensions,
  applyHSL, applyColorBalance, applyPerspective, applyMeshWarp,
  applyBokehBlur, applyMotionBlur,
  applyVignette, applyFilmGrain, frequencySeparate,
  applyUnsharpMask,
} from '../src/lib/imageFilters';
import { readExif } from '../src/lib/exif';
import { applyCurves, applyLevels } from '../src/lib/colorTools';
import { analyzeImage, processNaturalLanguage } from '../src/lib/aiEngine';
import { runTripleAnalysis } from '../src/lib/tripleAi';
import { applyColorGrade, smartAutoEnhance } from '../src/lib/realAi';
import { retouchPortrait } from '../src/lib/portrait';
import useKeyboardShortcuts from '../src/hooks/useKeyboardShortcuts';


const FEATURES = [
  { icon: FiZap, title: 'Zero effort edits', desc: 'Drop a pic, AI does the work. You just vibe.' },
  { icon: FiEye, title: 'Sees everything', desc: '80+ object classes. It knows what you ate for lunch.' },
  { icon: FiSliders, title: 'Smart picks', desc: 'Filters & edits chosen by AI. Not random. Actually smart.' },
];

const SIDEBAR_TABS = [
  { key: 'ai', label: 'AI', icon: FiZapIcon },
  { key: 'adjust', label: 'Adjust', icon: FiSliders },
  { key: 'curves', label: 'Curves', icon: FiActivity },
  { key: 'filter', label: 'Filters', icon: FiFilter },
  { key: 'scope', label: 'Scope', icon: FiBarChart2 },
  { key: 'palette', label: 'Palette', icon: FiDroplet },
  { key: 'tools', label: 'Tools', icon: FiTool },
];

export default function Home() {
  // Core image state
  const [originalImage, setOriginalImage] = useState(null);
  const [editHistory, setEditHistory] = useState([]); // array of snapshots: { image, description }
  const [historyIndex, setHistoryIndex] = useState(-1);

  // AI analysis
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysisReady, setAiAnalysisReady] = useState(false);
  const [editSuggestions, setEditSuggestions] = useState([]);
  const [tripleAi, setTripleAi] = useState(null);
  const [aiTier, setAiTier] = useState('');
  const [showAiPanel, setShowAiPanel] = useState(true);
  const [expandAiPanel, setExpandAiPanel] = useState(false);
  const [aiPanelWidth, setAiPanelWidth] = useState(300); // px, adjustable
  const [sidebarWidth, setSidebarWidth] = useState(320); // px, drag-resizable right panel
  const sidebarResize = useRef(null);

  // Adjustments (non-destructive, computed on top of current image)
  const [adjustments, setAdjustments] = useState({
    brightness: 0, contrast: 0, saturation: 0,
    temperature: 0, hue: 0, sharpness: 0, exposure: 0,
  });

  // Filter state
  const [activeFilter, setActiveFilter] = useState('none');
  const [filterIntensity, setFilterIntensity] = useState(100);
  const [filterCategory, setFilterCategory] = useState('all');

  // UI state
  const [activeTab, setActiveTab] = useState('ai');
  const [zoom, setZoom] = useState(1);
  const [isComparing, setIsComparing] = useState(true);
  const [showExport, setShowExport] = useState(false);
  const [toast, setToast] = useState(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [exifData, setExifData] = useState(null);
  const [applying, setApplying] = useState(false);
  // Auto-apply the AI smart-enhance after analysis. Toggle OFF to work fully manually.
  const [autoEnhance, setAutoEnhance] = useState(true);

  // The "current" edited image (after filter, before adjustments)
  const currentImage = historyIndex >= 0 ? editHistory[historyIndex]?.image : originalImage;

  // The final displayed image (with adjustments applied)
  const [displayedImage, setDisplayedImage] = useState(null);

  // Re-render displayed image whenever currentImage or adjustments change
  useEffect(() => {
    if (!currentImage) { setDisplayedImage(null); return; }
    let cancelled = false;
    applyAdjustments(currentImage, adjustments).then((result) => {
      if (!cancelled) setDisplayedImage(result);
    });
    return () => { cancelled = true; };
  }, [currentImage, adjustments]);

  // Image dimensions
  useEffect(() => {
    if (!originalImage) { setImageDimensions({ width: 0, height: 0 }); return; }
    getImageDimensions(originalImage).then(setImageDimensions);
  }, [originalImage]);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, key: Date.now() });
  }, []);

  // ---- History management ----
  const pushSnapshot = useCallback((image, description) => {
    setEditHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, { image, description }];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < editHistory.length - 1;

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    setHistoryIndex((prev) => prev - 1);
    showToast('Undo', 'info');
  }, [canUndo, showToast]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    setHistoryIndex((prev) => prev + 1);
    showToast('Redo', 'info');
  }, [canRedo, showToast]);

  // Undo ALL edits — reset to the original image (keeps the photo in the editor).
  const handleUndoAll = useCallback(() => {
    if (historyIndex < 0) return; // already at original
    setHistoryIndex(-1);
    setDisplayedImage(originalImage);
    setEditSuggestions([]);
    showToast('Reset to original', 'info');
  }, [historyIndex, originalImage, showToast]);

  // ---- Upload ----
  const handleImageUpload = useCallback((file, dataUrl) => {
    setOriginalImage(dataUrl);
    setEditHistory([]);
    setHistoryIndex(-1);
    setEditSuggestions([]);
    setActiveFilter('none');
    setFilterIntensity(100);
    setAdjustments({ brightness: 0, contrast: 0, saturation: 0, temperature: 0, hue: 0, sharpness: 0, exposure: 0 });
    setZoom(1);
    setIsComparing(false);
    setDisplayedImage(dataUrl);
    setActiveTab('ai');
    readExif(dataUrl).then(setExifData);

    // Run AI analysis + triple analysis on upload
    (async () => {
      setIsAnalyzing(true);
      try {
        const [analysisResult, tripleResult] = await Promise.allSettled([
          analyzeImage(dataUrl),
          runTripleAnalysis(dataUrl),
        ]);

        if (analysisResult.status === 'fulfilled' && analysisResult.value) {
          setAiAnalysis(analysisResult.value);
          const suggestions = analysisResult.value.suggestions || [];
          setEditSuggestions(suggestions.map(s => ({
            text: s.reason,
            filter: s.action?.name || s.action,
            reason: `Confidence: ${Math.round((s.confidence || 0.5) * 100)}%`,
          })));
        }

        if (tripleResult.status === 'fulfilled') {
          setTripleAi(tripleResult.value);
          setAiTier(tripleResult.value.tier || 'pixel');
        }
      } catch (err) {
        console.error('AI error:', err);
      } finally {
        setIsAnalyzing(false);
        setAiAnalysisReady(true);
        // Auto-apply the recommended smart-enhance after analysis (or ~5s)
        autoApplyEnhance(dataUrl);
      }
    })();
  }, [showToast]);

  // ---- Auto-apply smart enhance after analysis (once per upload) ----
  const autoApplyEnhance = useCallback(async (src) => {
    if (!autoEnhance) return; // auto-enhance disabled — user works manually
    // Show a brief "applying recommended changes" state
    setApplying(true);
    try {
      const enhanced = await smartAutoEnhance(src);
      if (enhanced && enhanced !== src) {
        // Push as a revertable step so the user can undo it
        setEditHistory((prev) => {
          const trimmed = prev.slice(0, historyIndex + 1);
          return [...trimmed, { image: enhanced, description: 'Smart enhance' }];
        });
        setHistoryIndex((prev) => prev + 1);
        // Auto-open the compare slider right after the AI correction so the
        // user can see original vs enhanced immediately.
        setIsComparing(true);
      }
    } catch (err) { console.error('Auto-enhance failed:', err); }
    finally { setApplying(false); }
  }, [historyIndex, autoEnhance]);

  const handleNewImage = useCallback(() => {
    setOriginalImage(null);
    setEditHistory([]);
    setHistoryIndex(-1);
    setDisplayedImage(null);
    setEditSuggestions([]);
    setExifData(null);
  }, []);

  // ---- Filters ----
  const handleFilterSelect = useCallback(async (filterName) => {
    if (!currentImage) return;
    if (filterName === 'none') {
      setActiveFilter('none');
      return;
    }
    setActiveFilter(filterName);
    const filtered = await applyFilterToDataUrl(currentImage, filterName);
    pushSnapshot(filtered, `Filter: ${FILTERS[filterName]?.name || filterName}`);
    showToast(`Applied ${FILTERS[filterName]?.name || filterName}`, 'success');
  }, [currentImage, pushSnapshot, showToast]);

  const handleFilterIntensity = useCallback(async (value) => {
    setFilterIntensity(value);
    if (activeFilter === 'none' || !currentImage) return;
    const filtered = await applyFilterToDataUrl(currentImage, activeFilter);
    const blended = await blendImages(currentImage, filtered, value / 100);
    // Don't push to history on every slider move, just update display
    setDisplayedImage(
      await applyAdjustments(blended, adjustments)
    );
  }, [activeFilter, currentImage, adjustments]);

  // ---- Adjustments ----
  const handleAdjust = useCallback((key, value) => {
    setAdjustments((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleAdjustResetAll = useCallback(() => {
    setAdjustments({ brightness: 0, contrast: 0, saturation: 0, temperature: 0, hue: 0, sharpness: 0, exposure: 0 });
  }, []);

  // ---- Color grade (RGB + gradient) — commits as a revertable step ----
  const handleApplyGradient = useCallback(async (opts) => {
    if (!currentImage) return;
    try {
      const graded = await applyColorGrade(currentImage, opts);
      pushSnapshot(graded, 'Color grade');
      showToast('Color grade applied', 'success');
    } catch (err) { console.error('Gradient failed:', err); }
  }, [currentImage, pushSnapshot, showToast]);

  // ---- Unsharp mask (sharpen / clarity) — commits as a revertable step ----
  const handleApplySharpen = useCallback(async (opts) => {
    if (!currentImage) return;
    try {
      const sharpened = await applyUnsharpMask(currentImage, opts);
      pushSnapshot(sharpened, 'Sharpen');
      showToast('Sharpen applied', 'success');
    } catch (err) { console.error('Sharpen failed:', err); }
  }, [currentImage, pushSnapshot, showToast]);

  // ---- Selective selection (magic wand) — commits as a revertable step ----
  const handleApplySelectionEffect = useCallback(async (result, description) => {
    if (!result) return;
    try {
      pushSnapshot(result, description);
      showToast(`Applied ${description}`, 'success');
    } catch (err) { console.error('Selection edit failed:', err); }
  }, [pushSnapshot, showToast]);

  // ---- Dodge & burn — commits as a revertable step ----
  const handleApplyDodgeBurn = useCallback(async (result) => {
    if (!result) return;
    try {
      pushSnapshot(result, 'Dodge/Burn');
      showToast('Dodge & burn applied', 'success');
    } catch (err) { console.error('Dodge & burn failed:', err); }
  }, [pushSnapshot, showToast]);

  // Live preview of color grade — updates the display instantly on drag
  // (no history push; only "apply" commits a step).
  const gradePreviewRef = useRef(null);
  const handlePreviewGrade = useCallback(async (opts) => {
    if (!currentImage) return;
    const base = currentImage;
    const run = async () => {
      try {
        const graded = await applyColorGrade(base, opts);
        setDisplayedImage(graded);
      } catch (err) { console.error('Grade preview failed:', err); }
    };
    clearTimeout(gradePreviewRef.current);
    gradePreviewRef.current = setTimeout(run, 60); // debounce drag
  }, [currentImage]);

  // ---- Selective blur / bokeh — commits a revertable step on apply ----
  const handleApplyBlur = useCallback(async (opts) => {
    if (!currentImage) return;
    try {
      const fn = opts?.type === 'motion' ? applyMotionBlur : applyBokehBlur;
      const blurred = await fn(currentImage, opts);
      pushSnapshot(blurred, opts?.type === 'motion' ? 'Motion blur' : 'Bokeh blur');
      showToast(opts?.type === 'motion' ? 'Motion blur applied' : 'Bokeh blur applied', 'success');
    } catch (err) { console.error('Blur failed:', err); }
  }, [currentImage, pushSnapshot, showToast]);

  // Live preview of blur — updates the display instantly on drag
  // (no history push; only "apply" commits a step).
  const blurPreviewRef = useRef(null);
  const handlePreviewBlur = useCallback(async (opts) => {
    if (!currentImage) return;
    const base = currentImage;
    const run = async () => {
      try {
        const fn = opts?.type === 'motion' ? applyMotionBlur : applyBokehBlur;
        const blurred = await fn(base, opts);
        setDisplayedImage(blurred);
      } catch (err) { console.error('Blur preview failed:', err); }
    };
    clearTimeout(blurPreviewRef.current);
    blurPreviewRef.current = setTimeout(run, 60); // debounce drag
  }, [currentImage]);

  // ---- Frequency separation — commits `combined` as a revertable step ----
  const handleApplyFreqSep = useCallback(async (opts) => {
    if (!currentImage) return;
    try {
      const { combined } = await frequencySeparate(currentImage, opts);
      if (!combined || combined === currentImage) return;
      pushSnapshot(combined, 'Frequency separation');
      showToast('Frequency separation applied', 'success');
    } catch (err) { console.error('Frequency separation failed:', err); }
  }, [currentImage, pushSnapshot, showToast]);

  // Live preview — updates the display instantly on drag (no history push).
  const freqSepPreviewRef = useRef(null);
  const handlePreviewFreqSep = useCallback(async (opts) => {
    if (!currentImage) return;
    const base = currentImage;
    const run = async () => {
      try {
        const { combined, low, high } = await frequencySeparate(base, opts);
        setDisplayedImage(opts?.view === 'low' ? low : opts?.view === 'high' ? high : combined);
      } catch (err) { console.error('Frequency separation preview failed:', err); }
    };
    clearTimeout(freqSepPreviewRef.current);
    freqSepPreviewRef.current = setTimeout(run, 60); // debounce drag
  }, [currentImage]);

  // ---- Vignette & film grain — commits both as one revertable step ----
  const handleApplyFinish = useCallback(async (opts) => {
    if (!currentImage) return;
    const { vignette = {}, grain = {} } = opts || {};
    try {
      let result = currentImage;
      if (vignette.strength > 0) result = await applyVignette(result, vignette);
      if (grain.amount > 0) result = await applyFilmGrain(result, grain);
      if (result !== currentImage) {
        pushSnapshot(result, 'Vignette & grain');
        showToast('Finish applied', 'success');
      } else {
        showToast('No finish applied', 'info');
      }
    } catch (err) { console.error('Finish failed:', err); }
  }, [currentImage, pushSnapshot, showToast]);

  // Live preview of vignette + grain — updates the display instantly on drag
  // (no history push; only "apply" commits a step).
  const finishPreviewRef = useRef(null);
  const handlePreviewFinish = useCallback(async (opts) => {
    if (!currentImage) return;
    const base = currentImage;
    const { vignette = {}, grain = {} } = opts || {};
    const run = async () => {
      try {
        let result = base;
        if (vignette.strength > 0) result = await applyVignette(result, vignette);
        if (grain.amount > 0) result = await applyFilmGrain(result, grain);
        setDisplayedImage(result);
      } catch (err) { console.error('Finish preview failed:', err); }
    };
    clearTimeout(finishPreviewRef.current);
    finishPreviewRef.current = setTimeout(run, 60); // debounce drag
  }, [currentImage]);

  // ---- Portrait retouch (skin, teeth, red-eye) — commits as a revertable step ----
  const handleRetouchPortrait = useCallback(async (opts) => {
    if (!currentImage) return;
    try {
      const retouched = await retouchPortrait(currentImage, opts);
      if (retouched !== currentImage) {
        pushSnapshot(retouched, 'Portrait retouch');
        showToast('Portrait retouched', 'success');
      } else {
        showToast('No retouch applied', 'info');
      }
    } catch (err) {
      console.error('Retouch failed:', err);
      showToast('Retouch failed', 'error');
    }
  }, [currentImage, pushSnapshot, showToast]);

  // ---- Color balance & HSL — commits as a revertable step ----
  const isNeutralColorBalance = (opts) => {
    const h = opts?.hsl || {};
    const hasHsl = (h.hue || 0) !== 0 || (h.saturation ?? 100) !== 100 || (h.lightness ?? 100) !== 100;
    const hasBalance = Object.values(opts?.balance || {}).some(
      (b) => (b?.c || 0) !== 0 || (b?.m || 0) !== 0 || (b?.y || 0) !== 0
    );
    return !hasHsl && !hasBalance;
  };

  const applyColorBalanceToImage = useCallback(async (src, opts) => {
    let result = src;
    result = await applyHSL(result, opts?.hsl || {});
    result = await applyColorBalance(result, opts?.balance || {});
    return result;
  }, []);

  const handleApplyColorBalance = useCallback(async (opts) => {
    if (!currentImage || isNeutralColorBalance(opts)) return;
    try {
      const result = await applyColorBalanceToImage(currentImage, opts);
      pushSnapshot(result, 'Color balance');
      showToast('Color balance applied', 'success');
    } catch (err) { console.error('Color balance failed:', err); }
  }, [currentImage, applyColorBalanceToImage, pushSnapshot, showToast]);

  // Live preview — updates display on drag, no history push.
  const colorBalancePreviewRef = useRef(null);
  const handlePreviewColorBalance = useCallback(async (opts) => {
    if (!currentImage) return;
    const base = currentImage;
    const run = async () => {
      try {
        const result = await applyColorBalanceToImage(base, opts);
        setDisplayedImage(result);
      } catch (err) { console.error('Color balance preview failed:', err); }
    };
    clearTimeout(colorBalancePreviewRef.current);
    colorBalancePreviewRef.current = setTimeout(run, 60); // debounce drag
  }, [currentImage, applyColorBalanceToImage]);

  // ---- Curves & Levels — LIVE preview (debounced, no history) ----
  const curvesPreviewRef = useRef(null);
  const handlePreviewCurves = useCallback(async (opts) => {
    if (!currentImage) return;
    const base = currentImage;
    const run = async () => {
      try {
        let result = await applyCurves(base, opts?.curves || {});
        result = await applyLevels(result, opts?.levels || {});
        setDisplayedImage(result); // live, no history push
      } catch (err) { console.error('Curves preview failed:', err); }
    };
    clearTimeout(curvesPreviewRef.current);
    curvesPreviewRef.current = setTimeout(run, 50); // debounce during drag
  }, [currentImage]);

  // ---- Curves & Levels — commits as a revertable step ----
  const handleApplyCurves = useCallback(async (opts) => {
    if (!currentImage) return;
    try {
      let result = await applyCurves(currentImage, opts?.curves || {});
      result = await applyLevels(result, opts?.levels || {});
      pushSnapshot(result, 'Curves');
      showToast('Curves applied', 'success');
    } catch (err) { console.error('Curves failed:', err); }
  }, [currentImage, pushSnapshot, showToast]);

  // ---- Transform ----
  const handleRotate = useCallback(async (degrees) => {
    if (!currentImage) return;
    const rotated = await rotateImage(currentImage, degrees);
    pushSnapshot(rotated, `Rotate ${degrees}°`);
    showToast(`Rotated ${degrees > 0 ? 'right' : 'left'}`, 'success');
  }, [currentImage, pushSnapshot, showToast]);

  const handleFlip = useCallback(async (direction) => {
    if (!currentImage) return;
    const flipped = await flipImage(currentImage, direction);
    pushSnapshot(flipped, `Flip ${direction === 'h' ? 'horizontal' : 'vertical'}`);
    showToast(`Flipped ${direction === 'h' ? 'horizontally' : 'vertically'}`, 'success');
  }, [currentImage, pushSnapshot, showToast]);

  // ---- Perspective / mesh warp — commits as a revertable step ----
  const handleApplyWarp = useCallback(async (opts) => {
    if (!currentImage || !opts) return;
    try {
      const warped = opts.type === 'mesh'
        ? await applyMeshWarp(currentImage, opts)
        : await applyPerspective(currentImage, opts);
      if (!warped || warped === currentImage) return;
      pushSnapshot(warped, opts.type === 'mesh' ? 'Mesh warp' : 'Perspective');
      showToast(opts.type === 'mesh' ? 'Mesh warp applied' : 'Perspective applied', 'success');
    } catch (err) { console.error('Warp failed:', err); }
  }, [currentImage, pushSnapshot, showToast]);

  // ---- Right sidebar drag-resize ----
  const startSidebarResize = useCallback((e) => {
    e.preventDefault();
    sidebarResize.current = { startX: e.clientX, startW: sidebarWidth };
    const onMove = (ev) => {
      if (!sidebarResize.current) return;
      // Handle sits on the sidebar's LEFT edge. Dragging the handle RIGHT
      // moves the left edge rightward => panel gets NARROWER. So negate dx.
      const dx = ev.clientX - sidebarResize.current.startX;
      setSidebarWidth(Math.max(240, Math.min(560, sidebarResize.current.startW - dx)));
    };
    const onUp = () => {
      sidebarResize.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [sidebarWidth]);

  // ---- Zoom ----
  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(z + 0.25, 4)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(z - 0.25, 0.25)), []);
  const handleFitZoom = useCallback(() => setZoom(1), []);

  // ---- Export ----
  const handleExport = useCallback(async ({ format, quality }) => {
    if (!displayedImage) return;
    try {
      // Convert to desired format
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      await new Promise((r, e) => { img.onload = r; img.onerror = e; img.src = displayedImage; });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
      const dataUrl = canvas.toDataURL(mimeType, quality);

      const link = document.createElement('a');
      link.download = `auralens-${Date.now()}.${format}`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setShowExport(false);
      showToast(`Exported as ${format.toUpperCase()}`, 'success');
    } catch (err) {
      showToast('Export failed', 'error');
    }
  }, [displayedImage, showToast]);

  // ---- Keyboard shortcuts ----
  useKeyboardShortcuts({
    onUndo: handleUndo,
    onRedo: handleRedo,
    onExport: () => setShowExport(true),
    onCompareStart: () => originalImage && setIsComparing(true),
    onCompareEnd: () => setIsComparing(false),
    onZoomIn: handleZoomIn,
    onZoomOut: handleZoomOut,
    onFitZoom: handleFitZoom,
    onEscape: () => { setShowExport(false); setIsComparing(false); },
  });

  const hasImage = !!originalImage;

  return (
    <main className="h-screen flex flex-col overflow-hidden">
      {/* ===== Toolbar ===== */}
      {hasImage && (
        <Toolbar
          canUndo={canUndo} canRedo={canRedo}
          onUndo={handleUndo} onRedo={handleRedo} onUndoAll={handleUndoAll}
          onExport={() => setShowExport(true)}
          onRotateLeft={() => handleRotate(-90)}
          onRotateRight={() => handleRotate(90)}
          onFlipH={() => handleFlip('h')}
          onFlipV={() => handleFlip('v')}
          zoom={zoom} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onFitZoom={handleFitZoom}
          onNewImage={handleNewImage}
          isComparing={isComparing}
          onCompareToggle={() => setIsComparing((c) => !c)}
          autoEnhance={autoEnhance}
          onAutoEnhanceToggle={() => setAutoEnhance((v) => !v)}
        />
      )}

      {/* ===== Main content ===== */}
      {!hasImage ? (
        /* ===== Landing page ===== */
        <div className="flex-1 flex items-center justify-center px-6 py-10 bg-[var(--bg)]">
          <div className="w-full max-w-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-dim)] mb-4">
                <FiStar className="w-3 h-3 text-pink" />
                no account · no cloud · just vibes
              </div>
              <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight mb-3">
                your photos,<br />
                <span className="text-pink">but make it iconic.</span>
              </h1>
              <p className="text-[var(--text-dim)] text-sm md:text-base max-w-md mx-auto">
                drop a pic. AI detects what's in it, slaps on the right edits, and hands you the wheel. or just let it cook.
              </p>
            </div>

            <UploadArea onImageUpload={handleImageUpload} />

            {/* Post-edit journey — makes what happens after visible */}
            <p className="text-center mt-4 text-xs text-[var(--text-dim)]">
              edit → <span className="text-[var(--pink)] font-semibold">download or share</span> in one tap
            </p>

            {/* Features */}
            <div className="mt-8 grid grid-cols-3 gap-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="panel panel-hover p-4 text-center rounded-xl">
                  <f.icon className="w-5 h-5 mx-auto mb-2 text-[var(--accent)]" />
                  <p className="text-xs font-semibold text-white">{f.title}</p>
                  <p className="text-[11px] text-[var(--text-dim)] mt-1">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ===== Editor ===== */
        <div className="flex-1 flex overflow-hidden">
          {/* --- Canvas area --- */}
          <div className="flex-1 flex flex-col overflow-hidden bg-black/30">
            <div className="flex-1 flex items-center justify-center p-4 overflow-auto relative">
              <div
                className="relative"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease',
                  maxWidth: '100%',
                  maxHeight: '100%',
                }}
              >
                {displayedImage && (
                  <>
                    <img
                      src={displayedImage}
                      alt="Edited"
                      className="max-w-full max-h-[calc(100vh-160px)] object-contain rounded-lg shadow-2xl"
                    />

                    {/* Comparison slider */}
                    <ComparisonSlider
                      originalSrc={originalImage}
                      editedSrc={displayedImage}
                      isComparing={isComparing}
                    />

                    {/* Magic wand / selective selection tool */}
                    <SelectionTool
                      imageSrc={currentImage}
                      onApply={handleApplySelectionEffect}
                      naturalWidth={imageDimensions.width}
                      naturalHeight={imageDimensions.height}
                    />

                    {/* Dodge & burn tool */}
                    <DodgeBurnTool
                      imageSrc={currentImage}
                      onApply={handleApplyDodgeBurn}
                      naturalWidth={imageDimensions.width}
                      naturalHeight={imageDimensions.height}
                    />

                    {/* Analyzing overlay — smooth, single spinner (no stutter) */}
                    {isAnalyzing && (
                      <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg bg-black/55">
                        <div className="flex flex-col items-center gap-4">
                          <div className="relative w-20 h-20">
                            {/* One clean spinning ring, steady 1s rotation */}
                            <div className="absolute inset-0 rounded-full border-[3px] border-[var(--pink)]/15" />
                            <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[var(--pink)] animate-spin"
                              style={{ animationDuration: '1s', animationTimingFunction: 'linear' }} />
                            <div className="absolute inset-4 rounded-full bg-[var(--pink)]/20 flex items-center justify-center">
                              <span className="text-[10px] text-[var(--pink)] font-bold uppercase tracking-wider">AI</span>
                            </div>
                          </div>
                          <p className="text-base text-white font-semibold">analyzing…</p>
                          <p className="text-xs text-white/60">reading your aura & fixing your photo</p>
                        </div>
                      </div>
                    )}

                    {/* Applying recommended changes overlay */}
                    {applying && (
                      <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg bg-black/50 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-10 h-10 border-2 border-white/20 border-t-[var(--pink)] rounded-full animate-spin" />
                          <p className="text-sm text-white/90 font-medium">applying recommended changes…</p>
                        </div>
                      </div>
                    )}

                    {/* Floating AI panel — left side */}
                    {tripleAi && showAiPanel && (
                      <div className="absolute top-3 left-3 z-40 pointer-events-auto">
                        <div className="bg-black/80 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden"
                          style={{ width: `${expandAiPanel ? aiPanelWidth : 220}px`, transition: 'width 0.15s ease' }}>

                          {/* Header — always visible */}
                          <div className="p-3 pb-2">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  aiTier === 'server' ? 'bg-emerald-400' :
                                  aiTier === 'browser' ? 'bg-amber-400' : 'bg-gray-400'
                                }`} />
                                <span className="text-[9px] text-white/50 uppercase tracking-wider font-bold">
                                  {aiTier === 'server' ? 'cloud ai' : aiTier === 'browser' ? 'browser ai' : 'pixel'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => setExpandAiPanel(!expandAiPanel)}
                                  className="text-[9px] text-[var(--pink)] hover:text-white transition-colors font-bold">
                                  {expandAiPanel ? 'less' : 'more'}
                                </button>
                                <button onClick={() => setShowAiPanel(false)}
                                  className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white text-[8px]">×</button>
                              </div>
                            </div>

                            {/* Panel width slider — drag to narrow/widen */}
                            {expandAiPanel && (
                              <div className="flex items-center gap-2 mt-1 px-0.5">
                                <span className="text-[8px] text-white/40 font-bold">width</span>
                                <input
                                  type="range" min={200} max={520} value={aiPanelWidth}
                                  aria-label="AI panel width"
                                  onChange={(e) => setAiPanelWidth(Number(e.target.value))}
                                  className="slider flex-1"
                                  style={{
                                    background: `linear-gradient(to right, var(--pink) 0%, var(--pink) ${((aiPanelWidth - 200) / 320) * 100}%, #222 ${((aiPanelWidth - 200) / 320) * 100}%)`,
                                  }}
                                />
                                <span className="text-[8px] text-white/40 font-mono w-7 text-right">{aiPanelWidth}</span>
                              </div>
                            )}

                            {/* Aura */}
                            {tripleAi.vibe?.hasVibe && (
                              <div>
                                <p className="text-[9px] text-[var(--pink)] uppercase tracking-wider font-bold">aura</p>
                                <p className="text-lg font-bold text-white leading-tight">{tripleAi.vibe.topLabel}</p>
                                <div className="h-1.5 bg-white/10 rounded-full mt-1.5">
                                  <div className="h-full bg-[var(--pink)] rounded-full" style={{ width: `${tripleAi.vibe.topScore}%` }} />
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Expanded details */}
                          {expandAiPanel && (
                            <div className="px-3 pb-3 space-y-3 border-t border-white/5 pt-2.5 max-h-[500px] overflow-y-auto">

                              {/* Emotions — show even if no face (shows 0%) */}
                              <div>
                                <p className="text-[9px] text-[var(--pink)] uppercase tracking-wider font-bold mb-1.5">emotions</p>
                                {[
                                  { key: 'happiness', label: '😊 happy', color: '#22c55e' },
                                  { key: 'sadness', label: '😢 sad', color: '#3b82f6' },
                                  { key: 'anger', label: '😠 angry', color: '#ef4444' },
                                  { key: 'surprise', label: '😲 surprise', color: '#f59e0b' },
                                  { key: 'neutral', label: '😐 neutral', color: '#6b7280' },
                                  { key: 'sassiness', label: '💅 sassy', color: '#ff2d6f' },
                                ].map(({ key, label, color }) => {
                                  const val = tripleAi.face?.emotions?.[key] || 0;
                                  return (
                                    <div key={key} className="flex items-center gap-1.5 mb-1">
                                      <span className="text-[9px] w-14 shrink-0 truncate">{label}</span>
                                      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full" style={{ width: `${val}%`, background: color }} />
                                      </div>
                                      <span className="text-[9px] text-white font-mono w-6 text-right">{val}%</span>
                                    </div>
                                  );
                                })}
                                {!tripleAi.face?.hasFace && (
                                  <p className="text-[8px] text-white/60 mt-1">no face — showing defaults</p>
                                )}
                              </div>

                              {/* Vibe breakdown */}
                              {tripleAi.vibe?.hasVibe && tripleAi.vibe.scores && (
                                <div>
                                  <p className="text-[9px] text-[var(--pink)] uppercase tracking-wider font-bold mb-1.5">vibe breakdown</p>
                                  {Object.entries(tripleAi.vibe.scores)
                                    .sort((a, b) => b[1] - a[1])
                                    .slice(0, 6)
                                    .map(([label, score]) => (
                                      <div key={label} className="flex items-center gap-1.5 mb-1">
                                        <span className="text-[9px] text-white/60 w-20 truncate shrink-0">{label}</span>
                                        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                          <div className="h-full bg-[var(--pink)] rounded-full" style={{ width: `${score}%` }} />
                                        </div>
                                        <span className="text-[9px] text-white font-mono w-6 text-right">{score}%</span>
                                      </div>
                                    ))}
                                </div>
                              )}

                              {/* Objects */}
                              {tripleAi.objects?.hasObjects && (
                                <div>
                                  <p className="text-[9px] text-[var(--pink)] uppercase tracking-wider font-bold mb-1.5">objects</p>
                                  <div className="flex flex-wrap gap-1">
                                    {tripleAi.objects.objects.slice(0, 6).map((obj, i) => (
                                      <span key={i} className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-white/5 text-white/70 border border-white/10">
                                        {obj.label} {obj.score}%
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Models run */}
                              {tripleAi.models && tripleAi.models.length > 0 && (
                                <div>
                                  <p className="text-[9px] text-[var(--pink)] uppercase tracking-wider font-bold mb-1.5">models</p>
                                  {tripleAi.models.map((m, i) => (
                                    <div key={i} className="flex items-center gap-1.5 mb-0.5">
                                      <span className={`w-1 h-1 rounded-full ${m.status === 'ok' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                      <span className="text-[8px] text-white/50 w-16 shrink-0">{m.name}</span>
                                      <span className="text-[8px] text-white/70 truncate">{m.detail}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Summary */}
                              {tripleAi.summary && (
                                <p className="text-[8px] text-white/60 leading-relaxed border-t border-white/5 pt-2">{tripleAi.summary}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Show AI panel button when hidden */}
                    {!showAiPanel && tripleAi && (
                      <button
                        onClick={() => setShowAiPanel(true)}
                        className="absolute top-3 left-3 z-40 w-8 h-8 rounded-full bg-[var(--pink)] flex items-center justify-center text-black font-bold text-xs shadow-lg hover:scale-110 transition-transform"
                      >
                        AI
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Edit timeline */}
            {editHistory.length > 0 && (
              <EditTimeline past={editHistory} future={[]} currentIndex={historyIndex} />
            )}
          </div>

          {/* --- Right sidebar (drag-resizable) --- */}
          <div className="relative border-l border-[var(--border)] bg-[var(--bg-elevated)] flex flex-col overflow-hidden shrink-0"
            style={{ width: `${sidebarWidth}px` }}>
            {/* Drag handle on the left edge to resize the whole panel */}
            <div
              onMouseDown={startSidebarResize}
              className="absolute -left-1.5 top-0 bottom-0 w-3 cursor-col-resize z-40 group flex items-center justify-center"
              title="Drag to resize panel"
              aria-label="Resize edit panel"
            >
              <div className="w-1 h-10 rounded-full bg-[var(--border)] group-hover:bg-[var(--pink)] transition-colors" />
            </div>
            {/* Tabs */}
            <div className="flex border-b border-[var(--border)] px-2">
              {SIDEBAR_TABS.map((tab) => (
                <button
                  key={tab.key}
                  className={`tab ${activeTab === tab.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <tab.icon className="w-3.5 h-3.5 inline mr-1.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === 'adjust' && (
                <>
                  <AdjustmentPanel
                    onAdjust={handleAdjust}
                    activeAdjustments={adjustments}
                    onResetAll={handleAdjustResetAll}
                    onApplyGradient={handleApplyGradient}
                    onPreviewGrade={handlePreviewGrade}
                    previewImage={currentImage}
                  />
                  <ColorBalancePanel
                    onPreviewColorBalance={handlePreviewColorBalance}
                    onApplyColorBalance={handleApplyColorBalance}
                  />
                  <WarpPanel
                    previewImage={currentImage}
                    onApplyWarp={handleApplyWarp}
                  />
                  <BlurPanel
                    onApplyBlur={handleApplyBlur}
                    onPreviewBlur={handlePreviewBlur}
                  />
                  <FreqSepPanel
                    onApply={handleApplyFreqSep}
                    onPreview={handlePreviewFreqSep}
                  />
                  <FinishPanel
                    onPreview={handlePreviewFinish}
                    onApplyFinish={handleApplyFinish}
                  />
                </>
              )}

              {activeTab === 'curves' && (
                <CurvesPanel
                  onApply={handleApplyCurves}
                  onPreview={handlePreviewCurves}
                />
              )}

              {activeTab === 'scope' && (
                <HistogramPanel imageSrc={currentImage} />
              )}

              {activeTab === 'filter' && (
                <FilterControls
                  filters={FILTERS}
                  categories={FILTER_CATEGORIES}
                  activeCategory={filterCategory}
                  onCategoryChange={setFilterCategory}
                  activeFilter={activeFilter}
                  onFilterSelect={handleFilterSelect}
                  filterIntensity={filterIntensity}
                  onIntensityChange={setFilterIntensity}
                  previewImage={originalImage}
                />
              )}

              {activeTab === 'ai' && (
                <AIPanel
                  imageSrc={currentImage}
                  isAnalyzing={isAnalyzing}
                  tripleAi={tripleAi}
                  aiTier={aiTier}
                  onApplySuggestion={(suggestion) => {
                    if (suggestion.type === 'adjustment' && suggestion.action) {
                      setAdjustments(prev => ({ ...prev, ...suggestion.action }));
                      showToast(`Applied: ${suggestion.reason}`, 'success');
                    } else if (suggestion.type === 'filter' && suggestion.action) {
                      handleFilterSelect(suggestion.action);
                    }
                  }}
                  onAutoEnhance={(settings) => {
                    setAdjustments(settings);
                    showToast('AI Enhanced — brightness, contrast, saturation adjusted', 'success');
                  }}
                  onNaturalLanguage={(actions) => {
                    actions.forEach(action => {
                      if (action.type === 'adjustment') {
                        setAdjustments(prev => ({ ...prev, [action.key]: action.value }));
                      } else if (action.type === 'filter') {
                        handleFilterSelect(action.name);
                      } else if (action.type === 'auto-enhance' && aiAnalysis?.autoEnhance) {
                        setAdjustments(aiAnalysis.autoEnhance);
                      } else if (action.type === 'apply-image' && action.image) {
                        // Apply AI-generated image directly (background blur, smart enhance)
                        pushSnapshot(action.image, action.reason || 'AI edit');
                        showToast(action.reason || 'AI edit applied', 'success');
                      }
                    });
                    if (!actions.some(a => a.type === 'apply-image')) {
                      showToast('Applied AI edits', 'success');
                    }
                  }}
                  onAnalysisComplete={(analysis) => setAiAnalysis(analysis)}
                  onRetouchPortrait={handleRetouchPortrait}
                />
              )}

              {activeTab === 'palette' && (
                <PalettePanel imageSrc={currentImage} />
              )}

              {activeTab === 'tools' && (
                <>
                  <SharpenPanel onApplySharpen={handleApplySharpen} />
                  <ExifPanel exif={exifData} />
                </>
              )}
            </div>

            {/* Sidebar footer: image info */}
            {imageDimensions.width > 0 && (
              <div className="border-t border-[var(--border)] px-4 py-2.5 text-[10px] text-[var(--text-dim)] flex items-center justify-between">
                <span>{imageDimensions.width} × {imageDimensions.height}px</span>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== Export Dialog ===== */}
      <ExportDialog
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        onExport={handleExport}
        imageSrc={displayedImage}
        imageWidth={imageDimensions.width}
        imageHeight={imageDimensions.height}
      />

      {/* ===== Toast ===== */}
      {toast && (
        <Toast
          key={toast.key}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </main>
  );
}
