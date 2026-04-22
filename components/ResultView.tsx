
import React, { useState, useRef } from 'react';
import { LocalizationResult } from '../types';
import { generateSpeech, decodeBase64, decodePCM, getExpertAnalysis, encodeWAV } from '../services/geminiService';

interface Props {
  result: LocalizationResult;
  sourceText?: string;
}

const WebLink = ({ uri, title }: { uri: string; title: string }) => {
  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'Source';
    }
  };

  return (
    <a 
      href={uri} 
      target="_blank" 
      rel="noreferrer" 
      className="group flex flex-col items-center justify-center p-3 bg-white border border-gray-100 rounded-xl transition-all hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/5 text-center h-full min-h-[90px]"
    >
      <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-2 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
      </div>
      <span className="text-[8px] font-black text-gray-900 uppercase tracking-tight line-clamp-2 leading-tight mb-0.5">{title}</span>
      <span className="text-[6px] font-bold text-gray-400 uppercase tracking-widest">{getDomain(uri)}</span>
    </a>
  );
};

const ResultView: React.FC<Props> = ({ result, sourceText }) => {
  const [playingVoice, setPlayingVoice] = useState<'Puck' | 'Kore' | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expertAnalysis, setExpertAnalysis] = useState<string | undefined>(result.expertAnalysis);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [downloadConfig, setDownloadConfig] = useState({ filename: 'dari_bridge_export', format: 'WAV' as 'WAV' | 'MP3' });
  const audioCtxRef = useRef<AudioContext | null>(null);

  const handleExpertAnalysis = async () => {
    if (!sourceText || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const analysis = await getExpertAnalysis(result.dariTranslation, sourceText);
      setExpertAnalysis(analysis);
    } catch (err) { console.error(err); } finally { setIsAnalyzing(false); }
  };

  const handlePlayVoice = async (voiceName: 'Puck' | 'Kore') => {
    if (playingVoice) return;
    try {
      setPlayingVoice(voiceName);
      const base64 = await generateSpeech(result.dariTranslation, voiceName);
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      const audioData = decodeBase64(base64);
      const audioBuffer = await decodePCM(audioData, ctx);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = playbackSpeed;
      source.connect(ctx.destination);
      source.onended = () => setPlayingVoice(null);
      source.start(0);
    } catch (error) { setPlayingVoice(null); }
  };

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const base64 = await generateSpeech(result.dariTranslation, 'Puck');
      const pcmBytes = decodeBase64(base64);
      const blob = encodeWAV(pcmBytes);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${downloadConfig.filename}.${downloadConfig.format.toLowerCase()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShowDownloadMenu(false);
    } catch (err) {
      console.error(err);
      alert("Export Failed.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-700 fill-mode-both">
      <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-gray-100 overflow-hidden">
        
        {/* Header Action Bar */}
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-white">
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Native Dari Bridge Verified</span>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <button 
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                className="w-9 h-9 rounded-xl bg-gray-50 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 flex items-center justify-center transition-all border border-gray-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
              </button>
              {showDownloadMenu && (
                <div className="absolute right-0 top-11 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-gray-400 uppercase">Export Name</label>
                      <input 
                        type="text" 
                        className="w-full bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 text-[10px] outline-none" 
                        value={downloadConfig.filename}
                        onChange={(e) => setDownloadConfig(prev => ({ ...prev, filename: e.target.value }))}
                      />
                    </div>
                    <button onClick={handleDownload} disabled={isDownloading} className="w-full bg-emerald-600 text-white py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">
                      {isDownloading ? 'Synthesizing...' : 'Export to WAV'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="w-[1px] h-4 bg-gray-100" />

            <div className="flex items-center space-x-2 bg-gray-50/80 px-3 py-1.5 rounded-xl border border-gray-100">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Speed</span>
              <select 
                value={playbackSpeed} 
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                className="bg-transparent text-[10px] font-black text-emerald-600 outline-none cursor-pointer"
              >
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1.0">1.0x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
              </select>
            </div>

            <div className="w-[1px] h-4 bg-gray-100" />

            <div className="flex space-x-1.5">
              <button onClick={() => handlePlayVoice('Puck')} className={`w-9 h-9 rounded-xl transition-all flex items-center justify-center ${playingVoice === 'Puck' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100'}`} title="Male Voice">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"/></svg>
              </button>
              <button onClick={() => handlePlayVoice('Kore')} className={`w-9 h-9 rounded-xl transition-all flex items-center justify-center ${playingVoice === 'Kore' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'}`} title="Female Voice">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd"/></svg>
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-[1.5rem] border border-gray-100 p-6 flex flex-col shadow-sm">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{result.sourceLanguage || "Source"} Content</span>
              </div>
              <p className="text-sm text-gray-500 font-medium leading-relaxed italic line-clamp-6">{sourceText || "No context provided."}</p>
              <div className="mt-auto pt-6 text-[8px] font-black uppercase text-slate-300 tracking-tighter">Source Identity Detected</div>
            </div>

            <div className="bg-white rounded-[1.5rem] border border-emerald-50 p-6 flex flex-col shadow-sm">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Native Dari Output</span>
              </div>
              <p className="text-3xl sm:text-4xl font-dari text-right leading-relaxed text-gray-900 mb-4" dir="rtl">
                {result.dariTranslation}
              </p>
              {result.transliteration && (
                <div className="mt-auto pt-4 border-t border-emerald-50">
                  <p className="text-[11px] text-emerald-600/60 font-medium italic">{result.transliteration}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {result.groundingSources && result.groundingSources.length > 0 && (
          <div className="p-6 border-t border-gray-50 bg-white">
            <div className="flex items-center space-x-2 mb-4">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <span className="text-[9px] font-black text-emerald-900 uppercase tracking-widest">Bridged Factual Grounding</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {result.groundingSources.map((source, i) => (
                <WebLink key={i} uri={source.uri} title={source.title} />
              ))}
            </div>
          </div>
        )}

        <div className="p-6 border-t border-gray-50 bg-slate-50/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400">Localization Strategy</h3>
            <button 
              onClick={handleExpertAnalysis} 
              disabled={isAnalyzing} 
              className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 underline decoration-emerald-200 decoration-2 underline-offset-4"
            >
              {isAnalyzing ? "Analyzing..." : "Afghan Linguistic Analysis"}
            </button>
          </div>
          
          {expertAnalysis && (
            <div className="bg-emerald-50/40 p-5 rounded-2xl border border-emerald-100/50 mb-6 animate-in slide-in-from-top-2">
              <p className="text-[11px] text-emerald-900 leading-relaxed font-medium">{expertAnalysis}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {result.localizationNotes.map((note, i) => (
              <div key={i} className="flex items-start space-x-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm group">
                <span className="w-5 h-5 bg-gray-50 text-gray-400 group-hover:bg-emerald-600 group-hover:text-white rounded-lg flex items-center justify-center text-[9px] font-black shrink-0 transition-colors">{i+1}</span>
                <p className="text-[10px] text-gray-500 font-medium leading-normal">{note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultView;
