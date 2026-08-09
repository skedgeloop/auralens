import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  FiEye, FiLayers, FiZap, FiStar,
  FiSliders, FiFilter, FiZap as FiZapIcon,
  FiCrop, FiImage,
} from 'react-icons/fi';
import UploadArea from '../src/components/UploadArea';
import FilterControls from '../src/components/FilterControls';
import EditSuggestions from '../src/components/EditSuggestions';
import AIPanel from '../src/components/AIPanel';
import Toolbar from '../src/components/Toolbar';
import ComparisonSlider from '../src/components/ComparisonSlider';
import AdjustmentPanel, { applyAdjustments } from '../src/components/AdjustmentPanel';
import ExportDialog from '../src/components/ExportDialog';
import EditTimeline from '../src/components/EditTimeline';
import Toast from '../src/components/Toast';
import {
  applyFilterToDataUrl, blendImages, FILTERS, FILTER_CATEGORIES,
  rotateImage, flipImage, getImageDimensions,
} from '../src/lib/imageFilters';
import { analyzeImage, processNaturalLanguage } from '../src/lib/aiEngine';
import { runTripleAnalysis } from '../src/lib/tripleAi';
import { smartAutoEnhance } from '../src/lib/realAi';
import SAMPLES from '../src/lib/samples';
import useKeyboardShortcuts from '../src/hooks/useKeyboardShortcuts';


const FEATURES = [
  { icon: FiZap, title: 'Zero effort edits', desc: 'Drop a pic, AI does the work. You just vibe.' },
  { icon: FiEye, title: 'Sees everything', desc: '80+ object classes. It knows what you ate for lunch.' },
  { icon: FiSliders, title: 'Smart picks', desc: 'Filters & edits chosen by AI. Not random. Actually smart.' },
];

const SIDEBAR_TABS = [
  { key: 'ai', label: 'AI', icon: FiZapIcon },
  { key: 'adjust', label: 'Adjust', icon: FiSliders },
  { key: 'filter', label: 'Filters', icon: FiFilter },
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
  const [tripleAi, setTripleAi] = useState(null);
  const [aiTier, setAiTier] = useState('');
  const [showAiPanel, setShowAiPanel] = useState(true);
  const [expandAiPanel, setExpandAiPanel] = useState(true);

  // Pre-analyzed sample results + auto-fixed "after" images (shown on landing)
  const [sampleResults, setSampleResults] = useState({});
  const [sampleEdited, setSampleEdited] = useState({});

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
      }
    })();
  }, [showToast]);

  const handleNewImage = useCallback(() => {
    setOriginalImage(null);
    setEditHistory([]);
    setHistoryIndex(-1);
    setDisplayedImage(null);
    setEditSuggestions([]);
    setAiAnalysis(null);
    setTripleAi(null);
    setAiTier('');
    setShowAiPanel(true);
    setExpandAiPanel(true);
    setActiveFilter('none');
    setFilterIntensity(100);
    setAdjustments({ brightness: 0, contrast: 0, saturation: 0, temperature: 0, hue: 0, sharpness: 0, exposure: 0 });
    setZoom(1);
    setIsComparing(false);
    setImageDimensions({ width: 0, height: 0 });
  }, []);

  // ---- Sample: load a curated photo + server-analyze (KV-cached) ----
  const handleSampleSelect = useCallback(async (sample) => {
    const zero = { brightness: 0, contrast: 0, saturation: 0, temperature: 0, hue: 0, sharpness: 0, exposure: 0 };
    setOriginalImage(sample.src);
    setEditHistory([]);
    setHistoryIndex(-1);
    setEditSuggestions([]);
    setActiveFilter('none');
    setFilterIntensity(100);
    setAdjustments(zero);
    setZoom(1);
    setIsComparing(true); // show before/after at 50%
    setDisplayedImage(sample.src);
    setActiveTab('ai');
    setShowAiPanel(true);
    setAiAnalysisReady(false);

    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sample: sample.name, src: sample.src }),
      });
      const data = await res.json();
      if (data && !data.error) {
        const vibe = data.vibe || { hasVibe: false };
        setTripleAi({
          models: [],
          face: data.emotion || { hasFace: false, emotions: {}, faceCount: 0 },
          vibe,
          objects: data.objects || { objects: [], hasObjects: false },
          tier: 'server',
          summary: vibe.hasVibe ? `aura: ${vibe.topLabel} · cloud ai` : 'cloud ai',
          cached: !!data.cached,
        });
        setAiTier('server');
        if (data.cached) showToast('analyzed before — instant', 'success');
      }
      // Client pixel analysis for edit suggestions
      const analysisResult = await analyzeImage(sample.src);
      if (analysisResult) {
        setAiAnalysis(analysisResult);
        const suggestions = analysisResult.suggestions || [];
        setEditSuggestions(suggestions.map(s => ({
          text: s.reason,
          filter: s.action?.name || s.action,
          reason: `Confidence: ${Math.round((s.confidence || 0.5) * 100)}%`,
        })));
      }
    } catch (err) {
      console.error('Sample AI error:', err);
    } finally {
      setIsAnalyzing(false);
      setAiAnalysisReady(true);
    }
  }, [showToast]);

  // Pre-analyze samples once on landing: server results (KV-cached) + auto-fixed "after".
  // The auto-fixed thumbnails are SAVED in KV so they never recompute per visit.
  useEffect(() => {
    if (hasImage) return;
    let cancelled = false;

    SAMPLES.forEach(async (s) => {
      // 1) Get analysis (KV-cached) — also returns the saved edited thumbnail if any
      let savedEdited = null;
      try {
        const res = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sample: s.name, src: s.src }),
        });
        const data = await res.json();
        if (!cancelled && data && !data.error) {
          setSampleResults((prev) => ({
            ...prev,
            [s.name]: {
              vibe: data.vibe || { hasVibe: false },
              face: data.emotion || { hasFace: false },
              cached: !!data.cached,
            },
          }));
          savedEdited = data.edited || null;
        }
      } catch (err) { console.error('Sample pre-analyze failed:', s.name, err); }

      if (cancelled) return;

      // 2) If KV has a saved edited thumbnail, use it (saved state, instant)
      if (savedEdited) {
        setSampleEdited((prev) => ({ ...prev, [s.name]: savedEdited }));
        return;
      }

      // 3) Otherwise generate once + persist to KV for next time
      const edited = await smartAutoEnhance(s.src);
      if (cancelled || !edited) return;
      setSampleEdited((prev) => ({ ...prev, [s.name]: edited }));
      fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sample: s.name, edited }),
      }).catch(() => {});
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="h-screen flex flex-col overflow-hidden">
      {/* ===== Toolbar ===== */}
      {hasImage && (
        <Toolbar
          canUndo={canUndo} canRedo={canRedo}
          onUndo={handleUndo} onRedo={handleRedo}
          onExport={() => setShowExport(true)}
          onRotateLeft={() => handleRotate(-90)}
          onRotateRight={() => handleRotate(90)}
          onFlipH={() => handleFlip('h')}
          onFlipV={() => handleFlip('v')}
          zoom={zoom} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onFitZoom={handleFitZoom}
          onNewImage={handleNewImage}
          isComparing={isComparing}
          onCompareToggle={() => setIsComparing((c) => !c)}
        />
      )}

      {/* ===== Main content ===== */}
      {!hasImage ? (
        /* ===== Premium landing page ===== */
        <div className="flex-1 overflow-y-auto bg-[var(--bg)]">
          <div className="w-full max-w-6xl mx-auto px-4 md:px-8 py-12 md:py-16">
            {/* Header */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--pink-glow)] px-4 py-1.5 text-xs text-[var(--pink-dim)] mb-6">
                <FiStar className="w-3 h-3 text-pink" />
                no account · no cloud · just vibes
              </div>
              <h1 className="type-display mb-5">
                your photos,<br />
                <span className="text-pink">but make it iconic.</span>
              </h1>
              <p className="type-body text-[var(--text-dim)] max-w-md mx-auto">
                drop a pic. AI detects what's in it, slaps on the right edits, and hands you the wheel. or just let it cook.
              </p>
            </div>

            {/* Drop section — on top */}
            <UploadArea onImageUpload={handleImageUpload} />

            {/* Try now — sample gallery */}
            <div className="mt-12">
              <div className="text-center mb-5">
                <p className="type-caption mb-1">try now</p>
                <h2 className="type-h3 text-white">pick a sample, watch it get cooked</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {SAMPLES.map((s) => {
                  const edited = sampleEdited[s.name];
                  const res = sampleResults[s.name];
                  return (
                    <div
                      key={s.name}
                      className="group relative aspect-[4/5] rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface)] transition-all hover:border-[var(--pink)]/50 hover:shadow-[0_8px_40px_-12px_var(--pink)]"
                    >
                      {/* Original image underneath */}
                      <img
                        src={s.src}
                        alt={s.hint}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />

                      {/* Before/after slider once auto-fixed image is ready */}
                      {edited ? (
                        <ComparisonSlider
                          originalSrc={s.src}
                          editedSrc={edited}
                          isComparing
                        />
                      ) : (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
                          <div className="w-6 h-6 border-2 border-white/20 border-t-[var(--pink)] rounded-full animate-spin" />
                        </div>
                      )}

                      {/* Bottom overlay: hint + aura badge */}
                      <div className="absolute inset-x-0 bottom-0 p-3 text-left z-30">
                        {res?.vibe?.hasVibe && (
                          <span className="inline-block mb-1 px-2 py-0.5 rounded-full bg-[var(--pink)] text-black text-[10px] font-bold shadow">
                            aura: {res.vibe.topLabel}
                          </span>
                        )}
                        <p className="text-xs font-bold text-white">{s.hint}</p>
                      </div>

                      {/* Custom changes — opens the editor */}
                      <button
                        onClick={() => handleSampleSelect(s)}
                        className="absolute top-2 right-2 z-30 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur border border-white/10 text-[10px] font-bold text-white hover:bg-[var(--pink)] hover:text-black hover:border-[var(--pink)] transition-colors"
                      >
                        custom changes →
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Features */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="panel panel-hover p-5 text-center rounded-xl">
                  <div className="w-10 h-10 rounded-lg bg-[var(--pink-glow)] border border-[var(--border-soft)] flex items-center justify-center mx-auto mb-3">
                    <f.icon className="w-5 h-5 text-pink" />
                  </div>
                  <p className="type-h3 text-white mb-1">{f.title}</p>
                  <p className="type-caption text-[var(--text-dim)] normal-case tracking-normal text-[11px]">{f.desc}</p>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-12 text-center text-[11px] text-[var(--text-faint)]">
              <p className="font-display font-bold text-white text-sm mb-1">aura</p>
              <p>your photos stay on your device · no signup · no tracking</p>
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


                    {/* Floating AI panel — left side */}
                    {tripleAi && showAiPanel && (
                      <div className="absolute top-3 left-3 z-40 pointer-events-auto">
                        <div className="bg-black/80 backdrop-blur-lg rounded-xl border border-white/10 overflow-hidden"
                          style={{ width: expandAiPanel ? '300px' : '220px', transition: 'width 0.2s ease' }}>

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
                                  <p className="text-[8px] text-white/30 mt-1">no face — showing defaults</p>
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
                                <p className="text-[8px] text-white/30 leading-relaxed border-t border-white/5 pt-2">{tripleAi.summary}</p>
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

          {/* --- Right sidebar --- */}
          <div className="w-[320px] border-l border-[var(--border)] bg-[var(--bg-elevated)] flex flex-col overflow-hidden shrink-0">
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
                <AdjustmentPanel
                  onAdjust={handleAdjust}
                  activeAdjustments={adjustments}
                  onResetAll={handleAdjustResetAll}
                />
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
                />
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
    </div>
  );
}
