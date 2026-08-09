import React, { useState, useEffect, useCallback } from 'react';
import {
  FiZap, FiEye, FiSun, FiDroplet, FiMaximize2,
  FiArrowRight, FiCheck, FiLoader, FiMessageSquare, FiSmile,
} from 'react-icons/fi';
import { analyzeImage, processNaturalLanguage } from '../lib/aiEngine';
import { runTripleAnalysis } from '../lib/tripleAi';
import { applyBackgroundBlur, smartAutoEnhance } from '../lib/realAi';

export default function AIPanel({
  imageSrc, onApplySuggestion, onAutoEnhance, onNaturalLanguage,
  detectedObjects, isAnalyzing, onAnalysisComplete,
}) {
  const [analysis, setAnalysis] = useState(null);
  const [tripleAi, setTripleAi] = useState(null);
  const [nlInput, setNlInput] = useState('');
  const [nlResult, setNlResult] = useState(null);
  const [appliedSuggestions, setAppliedSuggestions] = useState(new Set());
  const [activeSection, setActiveSection] = useState('all');
  const [blurLoading, setBlurLoading] = useState(false);
  const [enhanceLoading, setEnhanceLoading] = useState(false);

  useEffect(() => {
    if (!imageSrc) { setAnalysis(null); setTripleAi(null); return; }
    let cancelled = false;

    // Run all analyses in parallel
    (async () => {
      const [imgAnalysis, tripleResult] = await Promise.allSettled([
        analyzeImage(imageSrc),
        runTripleAnalysis(imageSrc),
      ]);

      if (!cancelled) {
        if (imgAnalysis.status === 'fulfilled') setAnalysis(imgAnalysis.value);
        if (tripleResult.status === 'fulfilled') setTripleAi(tripleResult.value);
        onAnalysisComplete?.(imgAnalysis.value);
      }
    })();

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
      onNaturalLanguage?.([{ type: 'apply-image', image: blurred, reason: 'Background blurred using AI' }]);
    } catch (err) { console.error('Blur failed:', err); }
    finally { setBlurLoading(false); }
  }, [imageSrc, onNaturalLanguage]);

  const handleSmartEnhance = useCallback(async () => {
    if (!imageSrc) return;
    setEnhanceLoading(true);
    try {
      const enhanced = await smartAutoEnhance(imageSrc);
      onNaturalLanguage?.([{ type: 'apply-image', image: enhanced, reason: 'Smart enhanced' }]);
    } catch (err) { console.error('Enhance failed:', err); }
    finally { setEnhanceLoading(false); }
  }, [imageSrc, onNaturalLanguage]);

  if (!imageSrc) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-[var(--border)]">
        {[
          { key: 'all', label: 'all ai', icon: FiZap },
          { key: 'fix', label: 'fix it', icon: FiSun },
          { key: 'ask', label: 'ask', icon: FiMessageSquare },
        ].map((s) => (
          <button key={s.key} className={`tab flex-1 ${activeSection === s.key ? 'active' : ''}`}
            onClick={() => setActiveSection(s.key)}>
            <s.icon className="w-3.5 h-3.5 inline mr-1" />{s.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* Loading */}
        {isAnalyzing && (
          <div className="flex flex-col items-center gap-2 py-6">
            <FiLoader className="w-5 h-5 text-[var(--pink)] animate-spin" />
            <p className="text-xs text-[var(--text-dim)] font-medium">running 3 AI models...</p>
          </div>
        )}

        {/* ALL AI - show every value */}
        {activeSection === 'all' && !isAnalyzing && (
          <div className="flex flex-col gap-3">

            {/* === MAIN AURA — the first thing people see === */}
            {tripleAi?.vibe?.hasVibe && (
              <div className="panel p-4 border-[var(--pink)]/30 bg-[rgba(255,45,111,0.06)]">
                <div className="flex items-center gap-2 mb-1">
                  <FiZap className="w-4 h-4 text-[var(--pink)]" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--pink)]">your aura</span>
                </div>
                <div className="text-xl font-bold text-white mb-1">
                  {tripleAi.vibe.topLabel}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--pink)] rounded-full" style={{ width: `${tripleAi.vibe.topScore}%` }} />
                  </div>
                  <span className="text-sm text-[var(--pink)] font-bold font-mono">{tripleAi.vibe.topScore}%</span>
                </div>
                <p className="text-[11px] text-[var(--text-dim)] mt-2">
                  {tripleAi.summary}
                </p>
              </div>
            )}

            {/* === FACE EMOTIONS (face-api) === */}
            <div className="panel p-3">
              <div className="flex items-center gap-2 mb-2">
                <FiSmile className="w-3.5 h-3.5 text-[var(--pink)]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">face emotions</span>
                <span className="text-[9px] text-[var(--text-dim)] opacity-50">face-api</span>
              </div>

              {tripleAi?.face?.hasFace ? (
                <div className="flex flex-col gap-1.5">
                  {[
                    { label: 'Happiness', value: tripleAi.face.happiness, color: '#22c55e' },
                    { label: 'Sadness', value: tripleAi.face.sadness, color: '#3b82f6' },
                    { label: 'Anger', value: tripleAi.face.anger, color: '#ef4444' },
                    { label: 'Surprise', value: tripleAi.face.surprise, color: '#f59e0b' },
                    { label: 'Neutral', value: tripleAi.face.neutral, color: '#6b7280' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <span className="text-[10px] text-[var(--text-dim)] w-14 shrink-0">{item.label}</span>
                      <div className="flex-1 h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${item.value}%`, background: item.color }} />
                      </div>
                      <span className="text-[10px] text-white font-mono w-7 text-right">{item.value}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-[var(--text-dim)]">no face detected</p>
              )}
            </div>

            {/* === SASSINESS (MediaPipe blendshapes) === */}
            <div className="panel p-3">
              <div className="flex items-center gap-2 mb-2">
                <FiZap className="w-3.5 h-3.5 text-[var(--pink)]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">sassiness</span>
                <span className="text-[9px] text-[var(--text-dim)] opacity-50">mediapipe</span>
              </div>
              {tripleAi?.face?.hasFace ? (
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-[var(--pink)]">{tripleAi.face.sassiness}%</span>
                    <div className="flex-1 h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--pink)] rounded-full" style={{ width: `${tripleAi.face.sassiness}%` }} />
                    </div>
                  </div>
                  <div className="mt-1.5 flex gap-3 text-[10px] text-[var(--text-dim)]">
                    <span>eye ratio: {tripleAi.face.eyeRatio}</span>
                    <span>mouth asym: {tripleAi.face.mouthAsymmetry}</span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-[var(--text-dim)]">need a face to calculate sass</p>
              )}
            </div>

            {/* === VIBE / AURA (CLIP) === */}
            <div className="panel p-3">
              <div className="flex items-center gap-2 mb-2">
                <FiEye className="w-3.5 h-3.5 text-[var(--pink)]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">vibe / aura</span>
                <span className="text-[9px] text-[var(--text-dim)] opacity-50">CLIP</span>
              </div>
              {tripleAi?.vibe?.hasVibe ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-[var(--pink)]">{tripleAi.vibe.topLabel}</span>
                    <span className="text-[10px] text-[var(--text-dim)]">{tripleAi.vibe.topScore}%</span>
                  </div>
                  {/* Top 5 vibe scores */}
                  <div className="flex flex-col gap-1">
                    {Object.entries(tripleAi.vibe.scores)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([label, score]) => (
                        <div key={label} className="flex items-center gap-2">
                          <span className="text-[10px] text-[var(--text-dim)] w-24 truncate shrink-0">{label}</span>
                          <div className="flex-1 h-1 bg-[var(--surface-2)] rounded-full overflow-hidden">
                            <div className="h-full bg-[var(--pink)] rounded-full" style={{ width: `${score}%` }} />
                          </div>
                          <span className="text-[10px] text-white font-mono w-6 text-right">{score}%</span>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-[var(--text-dim)]">analyzing vibe...</p>
              )}
            </div>

            {/* === IMAGE ANALYSIS === */}
            {analysis && (
              <>
                <div className="panel p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <FiSun className="w-3.5 h-3.5 text-[var(--pink)]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">exposure</span>
                  </div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-white capitalize font-medium">{analysis.exposure.state.replace('-', ' ')}</span>
                    <span className="text-[10px] text-[var(--text-dim)] font-mono">lum: {Math.round(analysis.exposure.avgLuminance)}</span>
                  </div>
                  <div className="h-5 flex items-end gap-px">
                    {analysis.histogram.luminance.filter((_, i) => i % 4 === 0).map((v, i) => {
                      const max = Math.max(...analysis.histogram.luminance);
                      const h = max > 0 ? (v / max) * 100 : 0;
                      return <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: 'var(--pink)', opacity: 0.15 + (h / 100) * 0.4 }} />;
                    })}
                  </div>
                  <div className="flex gap-3 mt-1 text-[10px] text-[var(--text-dim)] font-mono">
                    <span>dark: {Math.round(analysis.exposure.darkRatio * 100)}%</span>
                    <span>mid: {Math.round(analysis.exposure.midRatio * 100)}%</span>
                    <span>bright: {Math.round(analysis.exposure.brightRatio * 100)}%</span>
                    <span>range: {analysis.exposure.dynamicRange}</span>
                  </div>
                </div>

                <div className="panel p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <FiDroplet className="w-3.5 h-3.5 text-[var(--pink)]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">colors</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div><div className="text-[11px] text-white font-bold">{Math.round(analysis.colorProfile.warmth * 100)}%</div><div className="text-[9px] text-[var(--text-dim)]">{analysis.colorProfile.warmth > 0 ? 'warm' : 'cool'}</div></div>
                    <div><div className="text-[11px] text-white font-bold">{Math.round(analysis.colorProfile.saturation * 100)}%</div><div className="text-[9px] text-[var(--text-dim)]">saturation</div></div>
                    <div><div className="text-[11px] text-white font-bold capitalize">{analysis.colorProfile.dominantChannel}</div><div className="text-[9px] text-[var(--text-dim)]">dominant</div></div>
                  </div>
                  <div className="mt-1.5 flex gap-1 h-1.5">
                    <div className="flex-1 rounded-full bg-red-500" style={{ opacity: 0.3 + analysis.colorProfile.avgR / 255 * 0.7 }} />
                    <div className="flex-1 rounded-full bg-green-500" style={{ opacity: 0.3 + analysis.colorProfile.avgG / 255 * 0.7 }} />
                    <div className="flex-1 rounded-full bg-blue-500" style={{ opacity: 0.3 + analysis.colorProfile.avgB / 255 * 0.7 }} />
                  </div>
                  <div className="mt-1 flex gap-3 text-[10px] text-[var(--text-dim)] font-mono">
                    <span>R: {Math.round(analysis.colorProfile.avgR)}</span>
                    <span>G: {Math.round(analysis.colorProfile.avgG)}</span>
                    <span>B: {Math.round(analysis.colorProfile.avgB)}</span>
                  </div>
                </div>

                <div className="panel p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <FiMaximize2 className="w-3.5 h-3.5 text-[var(--pink)]" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">composition</span>
                  </div>
                  <p className="text-[11px] text-white font-medium">{analysis.composition.suggestion}</p>
                  <div className="mt-1 flex gap-3 text-[10px] text-[var(--text-dim)]">
                    <span>subject: {analysis.composition.subject.name}</span>
                    <span>on third: {analysis.composition.onThirdLine ? 'yes' : 'no'}</span>
                  </div>
                </div>
              </>
            )}

            {/* === DETECTED OBJECTS === */}
            {detectedObjects?.length > 0 && (
              <div className="panel p-3">
                <div className="flex items-center gap-2 mb-2">
                  <FiEye className="w-3.5 h-3.5 text-[var(--pink)]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">objects ({detectedObjects.length})</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {detectedObjects.map((obj, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-[10px] font-bold bg-[rgba(255,45,111,0.1)] text-[var(--pink)] border border-[rgba(255,45,111,0.2)]">
                      {obj.class} {Math.round(obj.score * 100)}%
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* === SUMMARY === */}
            {tripleAi?.summary && (
              <div className="panel p-3">
                <p className="text-[11px] text-[var(--text-dim)] font-medium">{tripleAi.summary}</p>
              </div>
            )}
          </div>
        )}

        {/* FIX IT section */}
        {activeSection === 'fix' && !isAnalyzing && (
          <div className="flex flex-col gap-3">
            <button onClick={handleSmartEnhance} disabled={enhanceLoading}
              className="btn btn-pink w-full py-3 text-sm">
              {enhanceLoading ? (
                <><span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> enhancing...</>
              ) : <><FiZap className="w-4 h-4" /> smart enhance</>}
            </button>
            <p className="text-[10px] text-[var(--text-dim)] text-center">auto white balance + contrast stretch + saturation</p>

            <button onClick={handleBackgroundBlur} disabled={blurLoading}
              className="btn btn-dark w-full py-3 text-sm">
              {blurLoading ? (
                <><span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> detecting person...</>
              ) : <><FiEye className="w-4 h-4" /> blur background</>}
            </button>
            <p className="text-[10px] text-[var(--text-dim)] text-center">neural network finds the person, blurs everything else</p>

            <button onClick={() => analysis?.autoEnhance && onAutoEnhance?.(analysis.autoEnhance)}
              className="btn btn-dark w-full py-3 text-sm">
              <FiMaximize2 className="w-4 h-4" /> auto-fix sliders
            </button>
            <p className="text-[10px] text-[var(--text-dim)] text-center">adjusts brightness/contrast/sat from histogram</p>

            {analysis?.suggestions?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] mb-2">suggestions</p>
                {analysis.suggestions.map((s, i) => (
                  <div key={i} className={`panel p-2.5 mb-1.5 ${appliedSuggestions.has(i) ? 'border-[var(--pink)]/30' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-white">{s.reason}</p>
                      <button onClick={() => handleApplySuggestion(i, s)} disabled={appliedSuggestions.has(i)}
                        className={`shrink-0 w-6 h-6 rounded flex items-center justify-center ${
                          appliedSuggestions.has(i) ? 'bg-[var(--pink)] text-black' : 'bg-[var(--surface-2)] text-[var(--text-dim)]'
                        }`}>
                        {appliedSuggestions.has(i) ? <FiCheck className="w-3 h-3" /> : <FiArrowRight className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ASK section */}
        {activeSection === 'ask' && (
          <div className="flex flex-col gap-3">
            <form onSubmit={handleNlSubmit} className="flex gap-2">
              <input type="text" value={nlInput} onChange={(e) => setNlInput(e.target.value)}
                placeholder='try "make it warmer"'
                className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-white placeholder-[var(--text-dim)] outline-none focus:border-[var(--pink)]/50 transition-colors" />
              <button type="submit" className="btn btn-dark px-3"><FiArrowRight className="w-4 h-4" /></button>
            </form>

            {nlResult && (
              <div className="panel p-3">
                <p className="text-[11px] text-white mb-2">{nlResult.interpretation}</p>
                {nlResult.parsed.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {nlResult.parsed.map((a, i) => (
                      <span key={i} className="px-2 py-0.5 rounded text-[10px] font-bold bg-[rgba(255,45,111,0.1)] text-[var(--pink)] border border-[rgba(255,45,111,0.2)]">
                        {a.reason || a.type}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] mb-2">quick hits</p>
              <div className="flex flex-wrap gap-1.5">
                {['warm it up', 'add contrast', 'vintage', 'cinematic', 'brighten', 'cool tones', 'enhance', 'noir', 'dreamy'].map((cmd) => (
                  <button key={cmd} onClick={() => setNlInput(cmd)}
                    className="px-2.5 py-1 rounded text-[11px] text-[var(--text-dim)] bg-[var(--surface-2)] border border-[var(--border)] hover:border-[var(--pink)]/30 hover:text-white transition-all font-medium">
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
