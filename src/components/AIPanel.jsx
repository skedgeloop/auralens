import React, { useState, useEffect, useCallback } from 'react';
import {
  FiZap, FiEye, FiSun, FiDroplet, FiMaximize2,
  FiArrowRight, FiCheck, FiLoader, FiMessageSquare,
} from 'react-icons/fi';
import { analyzeImage, processNaturalLanguage } from '../lib/aiEngine';
import { applyBackgroundBlur, smartAutoEnhance } from '../lib/realAi';

const MOOD_LABELS = {
  'warm-vibrant': { label: 'warm & poppin', color: '#ff2d6f' },
  'warm-muted': { label: 'chill warm', color: '#ff6b9d' },
  'cool-vibrant': { label: 'icy drip', color: '#ff2d6f' },
  'cool-muted': { label: 'cool calm', color: '#999' },
  'desaturated': { label: 'muted vibes', color: '#666' },
  'dark-dramatic': { label: 'dark & moody', color: '#444' },
  'bright-airy': { label: 'bright queen', color: '#fff' },
  'neutral': { label: 'balanced', color: '#888' },
};

export default function AIPanel({
  imageSrc, onApplySuggestion, onAutoEnhance, onNaturalLanguage,
  detectedObjects, isAnalyzing, onAnalysisComplete,
}) {
  const [analysis, setAnalysis] = useState(null);
  const [nlInput, setNlInput] = useState('');
  const [nlResult, setNlResult] = useState(null);
  const [appliedSuggestions, setAppliedSuggestions] = useState(new Set());
  const [activeSection, setActiveSection] = useState('insights');
  const [blurLoading, setBlurLoading] = useState(false);
  const [enhanceLoading, setEnhanceLoading] = useState(false);

  useEffect(() => {
    if (!imageSrc) { setAnalysis(null); return; }
    let cancelled = false;
    analyzeImage(imageSrc).then((result) => {
      if (!cancelled) { setAnalysis(result); setAppliedSuggestions(new Set()); onAnalysisComplete?.(result); }
    });
    return () => { cancelled = true; };
  }, [imageSrc]);

  const handleNlSubmit = useCallback((e) => {
    e.preventDefault();
    if (!nlInput.trim()) return;
    const result = processNaturalLanguage(nlInput);
    setNlResult(result);
    if (result.parsed.length > 0) onNaturalLanguage?.(result.parsed);
  }, [nlInput, onNaturalLanguage]);

  const handleApplySuggestion = useCallback((index, suggestion) => {
    setAppliedSuggestions((prev) => new Set([...prev, index]));
    onApplySuggestion?.(suggestion);
  }, [onApplySuggestion]);

  const handleBackgroundBlur = useCallback(async () => {
    if (!imageSrc) return;
    setBlurLoading(true);
    try {
      const blurred = await applyBackgroundBlur(imageSrc, 12);
      onNaturalLanguage?.([{ type: 'apply-image', image: blurred, reason: 'Background blurred using AI segmentation' }]);
    } catch (err) {
      console.error('Background blur failed:', err);
    } finally {
      setBlurLoading(false);
    }
  }, [imageSrc, onNaturalLanguage]);

  const handleSmartEnhance = useCallback(async () => {
    if (!imageSrc) return;
    setEnhanceLoading(true);
    try {
      const enhanced = await smartAutoEnhance(imageSrc);
      onNaturalLanguage?.([{ type: 'apply-image', image: enhanced, reason: 'Smart enhanced with auto white balance + contrast' }]);
    } catch (err) {
      console.error('Smart enhance failed:', err);
    } finally {
      setEnhanceLoading(false);
    }
  }, [imageSrc, onNaturalLanguage]);

  if (!imageSrc) return null;

  const sections = [
    { key: 'insights', label: 'intel', icon: FiEye },
    { key: 'enhance', label: 'fix it', icon: FiZap },
    { key: 'ask', label: 'ask ai', icon: FiMessageSquare },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-[var(--border)]">
        {sections.map((s) => (
          <button key={s.key} className={`tab flex-1 ${activeSection === s.key ? 'active' : ''}`}
            onClick={() => setActiveSection(s.key)}>
            <s.icon className="w-3.5 h-3.5 inline mr-1" />{s.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isAnalyzing && (
          <div className="flex flex-col items-center gap-3 py-8">
            <FiLoader className="w-6 h-6 text-[var(--pink)] animate-spin" />
            <p className="text-sm text-[var(--text-dim)] font-medium">analyzing...</p>
          </div>
        )}

        {activeSection === 'insights' && analysis && !isAnalyzing && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--text-dim)] uppercase tracking-wider font-bold">vibe</span>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold"
                style={{ color: MOOD_LABELS[analysis.mood]?.color || '#888', background: `${MOOD_LABELS[analysis.mood]?.color || '#888'}15` }}>
                {MOOD_LABELS[analysis.mood]?.label || analysis.mood}
              </span>
            </div>

            <div className="panel p-3">
              <div className="flex items-center gap-2 mb-2">
                <FiSun className="w-3.5 h-3.5 text-[var(--pink)]" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">exposure</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-white capitalize font-medium">{analysis.exposure.state.replace('-', ' ')}</span>
                <span className="text-[11px] text-[var(--text-dim)] font-mono">{Math.round(analysis.exposure.avgLuminance)}</span>
              </div>
              <div className="mt-2 h-6 flex items-end gap-px">
                {analysis.histogram.luminance.filter((_, i) => i % 4 === 0).map((v, i) => {
                  const max = Math.max(...analysis.histogram.luminance);
                  const h = max > 0 ? (v / max) * 100 : 0;
                  return <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: `var(--pink)`, opacity: 0.15 + (h / 100) * 0.4 }} />;
                })}
              </div>
            </div>

            <div className="panel p-3">
              <div className="flex items-center gap-2 mb-2">
                <FiDroplet className="w-3.5 h-3.5 text-[var(--pink)]" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">colors</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><div className="text-xs text-white font-bold">{Math.round(analysis.colorProfile.warmth * 100)}%</div><div className="text-[10px] text-[var(--text-dim)]">{analysis.colorProfile.warmth > 0 ? 'warm' : 'cool'}</div></div>
                <div><div className="text-xs text-white font-bold">{Math.round(analysis.colorProfile.saturation * 100)}%</div><div className="text-[10px] text-[var(--text-dim)]">sat</div></div>
                <div><div className="text-xs text-white font-bold capitalize">{analysis.colorProfile.dominantChannel}</div><div className="text-[10px] text-[var(--text-dim)]">dominant</div></div>
              </div>
              <div className="mt-2 flex gap-1 h-1.5">
                <div className="flex-1 rounded-full bg-red-500" style={{ opacity: 0.3 + analysis.colorProfile.avgR / 255 * 0.7 }} />
                <div className="flex-1 rounded-full bg-green-500" style={{ opacity: 0.3 + analysis.colorProfile.avgG / 255 * 0.7 }} />
                <div className="flex-1 rounded-full bg-blue-500" style={{ opacity: 0.3 + analysis.colorProfile.avgB / 255 * 0.7 }} />
              </div>
            </div>

            <div className="panel p-3">
              <div className="flex items-center gap-2 mb-2">
                <FiMaximize2 className="w-3.5 h-3.5 text-[var(--pink)]" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">composition</span>
              </div>
              <p className="text-xs text-white font-medium">{analysis.composition.suggestion}</p>
            </div>

            {detectedObjects?.length > 0 && (
              <div className="panel p-3">
                <div className="flex items-center gap-2 mb-2">
                  <FiEye className="w-3.5 h-3.5 text-[var(--pink)]" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">objects ({detectedObjects.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {detectedObjects.map((obj, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[rgba(255,45,111,0.1)] text-[var(--pink)] border border-[rgba(255,45,111,0.2)]">
                      {obj.class} · {Math.round(obj.score * 100)}%
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'enhance' && analysis && !isAnalyzing && (
          <div className="flex flex-col gap-3">
            {/* Real AI features */}
            <button onClick={handleSmartEnhance} disabled={enhanceLoading}
              className="btn btn-pink w-full py-3 text-sm">
              {enhanceLoading ? (
                <><span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> enhancing...</>
              ) : (
                <><FiZap className="w-4 h-4" /> smart enhance</>
              )}
            </button>
            <p className="text-[11px] text-[var(--text-dim)] text-center">auto white balance + contrast stretch + saturation</p>

            <button onClick={handleBackgroundBlur} disabled={blurLoading}
              className="btn btn-dark w-full py-3 text-sm">
              {blurLoading ? (
                <><span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> detecting person...</>
              ) : (
                <><FiEye className="w-4 h-4" /> blur background</>
              )}
            </button>
            <p className="text-[11px] text-[var(--text-dim)] text-center">neural network finds the person, blurs everything else</p>

            <button onClick={() => analysis?.autoEnhance && onAutoEnhance?.(analysis.autoEnhance)}
              className="btn btn-dark w-full py-3 text-sm">
              <FiMaximize2 className="w-4 h-4" /> auto-fix sliders
            </button>
            <p className="text-[11px] text-[var(--text-dim)] text-center">adjusts brightness/contrast/sat from histogram analysis</p>

            {analysis.suggestions.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)] mb-2">suggestions</p>
                <div className="flex flex-col gap-2">
                  {analysis.suggestions.map((s, i) => (
                    <div key={i} className={`panel p-3 ${appliedSuggestions.has(i) ? 'border-[var(--pink)]/30 bg-[rgba(255,45,111,0.05)]' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-xs text-white font-medium leading-relaxed">{s.reason}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="h-1 flex-1 bg-[var(--surface-2)] rounded-full overflow-hidden">
                              <div className="h-full bg-[var(--pink)] rounded-full" style={{ width: `${s.confidence * 100}%` }} />
                            </div>
                            <span className="text-[10px] text-[var(--text-dim)] font-mono">{Math.round(s.confidence * 100)}%</span>
                          </div>
                        </div>
                        <button onClick={() => handleApplySuggestion(i, s)} disabled={appliedSuggestions.has(i)}
                          className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center transition-all ${
                            appliedSuggestions.has(i) ? 'bg-[var(--pink)] text-black' : 'bg-[var(--surface-2)] text-[var(--text-dim)] hover:text-[var(--pink)]'
                          }`}>
                          {appliedSuggestions.has(i) ? <FiCheck className="w-3.5 h-3.5" /> : <FiArrowRight className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'ask' && (
          <div className="flex flex-col gap-3">
            <form onSubmit={handleNlSubmit} className="flex gap-2">
              <input type="text" value={nlInput} onChange={(e) => setNlInput(e.target.value)}
                placeholder='try "make it warmer" or "vintage look"'
                className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[var(--text-dim)] outline-none focus:border-[var(--pink)]/50 transition-colors" />
              <button type="submit" className="btn btn-dark px-3">
                <FiArrowRight className="w-4 h-4" />
              </button>
            </form>

            {nlResult && (
              <div className="panel p-3">
                <p className="text-xs text-white font-medium mb-2">{nlResult.interpretation}</p>
                {nlResult.parsed.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {nlResult.parsed.map((action, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[rgba(255,45,111,0.1)] text-[var(--pink)] border border-[rgba(255,45,111,0.2)]">
                        {action.reason || action.type}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)] mb-2">quick hits</p>
              <div className="flex flex-wrap gap-1.5">
                {['warm it up', 'add contrast', 'vintage', 'cinematic', 'brighten', 'cool tones', 'enhance', 'noir', 'dreamy'].map((cmd) => (
                  <button key={cmd} onClick={() => setNlInput(cmd)}
                    className="px-2.5 py-1 rounded-md text-[11px] text-[var(--text-dim)] bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--pink)]/30 hover:text-white transition-all font-medium">
                    {cmd}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
