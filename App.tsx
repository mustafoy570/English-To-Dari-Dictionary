
import React, { useState, useRef } from 'react';
import Header from './components/Header';
import TranslationInput from './components/TranslationInput';
import ResultView from './components/ResultView';
import { TranslationMode, TranslationTone, ProcessingState, LocalizationResult } from './types';
import { localizeText, localizeFile } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<ProcessingState>({
    loading: false,
    step: 'NONE',
    error: null,
    result: null,
  });
  const [lastSourceText, setLastSourceText] = useState<string>('');

  const currentRequestId = useRef<number>(0);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  };

  const handleStop = () => {
    currentRequestId.current += 1;
    setState(prev => ({ ...prev, loading: false, step: 'NONE' }));
  };

  const handleTranslate = async (data: { text?: string; file?: File; mode: TranslationMode; tone: TranslationTone; useSearch: boolean }) => {
    const requestId = currentRequestId.current;
    setState({ loading: true, step: 'LOCALIZING', error: null, result: null });
    const sourceText = data.text || data.file?.name || 'Media Content';
    setLastSourceText(sourceText);

    try {
      let result: LocalizationResult;
      if (data.mode === TranslationMode.TEXT && data.text) {
        result = await localizeText(data.text, data.tone, data.useSearch);
      } else if (data.file) {
        const base64 = await fileToBase64(data.file);
        const isVisual = data.file.type.startsWith('image/') || data.file.type === 'application/pdf';
        const prompt = isVisual ? "OCR and localize this document content into native Afghan Dari." : "Transcribe and localize this media content into native Afghan Dari.";
        result = await localizeFile(base64, data.file.type, prompt, data.tone);
      } else throw new Error("Missing input data");

      if (currentRequestId.current !== requestId) return;
      setState({ loading: false, step: 'NONE', error: null, result });
      
      if (window.innerWidth < 1024) {
        setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
      }
    } catch (err: any) {
      if (currentRequestId.current !== requestId) return;
      setState({ loading: false, step: 'NONE', error: err.message || "Bridge failed.", result: null });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-grow max-w-[1400px] mx-auto px-4 sm:px-6 py-6 w-full">
        {/* Compact Hero Section */}
        <section className="mb-8">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Dari Native Bridge</h2>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Bridging Any World Language to Authentic Afghan Dari</p>
        </section>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Input Area */}
          <div className="lg:col-span-5 space-y-4">
            <TranslationInput onTranslate={handleTranslate} onStop={handleStop} loading={state.loading} />
            
            <div className="hidden lg:block bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <h3 className="text-gray-400 font-black text-[9px] uppercase tracking-widest mb-4 flex items-center">
                <svg className="w-3.5 h-3.5 mr-2 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                Active Fidelity Engine
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-gray-500">Linguistic Reasoning</span>
                  <span className="text-emerald-600">Gemini 3 Pro</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-gray-500">Source Detection</span>
                  <span className="text-emerald-600">Dynamic (Multi-Lingual)</span>
                </div>
                <div className="w-full h-1 bg-emerald-50 rounded-full overflow-hidden">
                  <div className="w-full h-full bg-emerald-500 animate-[pulse_2s_infinite]"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Output Area */}
          <div className="lg:col-span-7 space-y-4 min-h-[400px]">
            {state.error && (
              <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center space-x-3 animate-in fade-in duration-300">
                <p className="text-xs font-black uppercase tracking-wider">{state.error}</p>
              </div>
            )}
            
            {state.result ? (
              <ResultView result={state.result} sourceText={lastSourceText} />
            ) : state.loading ? (
              <div className="h-full min-h-[450px] flex flex-col items-center justify-center space-y-6 bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
                <div className="relative">
                  <div className="w-16 h-16 border-[4px] border-emerald-50 border-t-emerald-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center"><div className="w-2.5 h-2.5 bg-emerald-600 rounded-full animate-pulse"></div></div>
                </div>
                <div className="text-center">
                  <p className="text-gray-900 font-black uppercase tracking-[0.2em] text-[10px] mb-1">Bridging Linguistics</p>
                  <p className="text-gray-400 text-[9px] font-bold uppercase">Mapping to Native Dari...</p>
                  <button onClick={handleStop} className="mt-6 px-6 py-2 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-400 rounded-full text-[9px] font-black uppercase tracking-widest transition-all">Abort</button>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[450px] flex flex-col items-center justify-center bg-white border border-gray-100 rounded-[2.5rem] text-gray-300 p-8 text-center shadow-sm">
                <div className="bg-gray-50 p-6 rounded-full mb-4">
                  <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                </div>
                <h4 className="text-gray-900 font-bold text-base mb-1">Bridge Awaiting Input</h4>
                <p className="text-[11px] font-medium text-gray-400 max-w-[200px]">The Bridge will detect your source language and localize it into native Afghan Dari here.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
