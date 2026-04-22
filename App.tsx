
import React, { useState, useRef, useEffect } from 'react';
import Header from './components/Header';
import TranslationInput from './components/TranslationInput';
import ResultView from './components/ResultView';
import { TranslationMode, TranslationTone, ProcessingState, LocalizationResult, TranslationDirection } from './types';
import { localizeText, localizeFile } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<ProcessingState>({
    loading: false,
    step: 'NONE',
    error: null,
    result: null,
  });
  const [lastSourceText, setLastSourceText] = useState<string>('');
  const [history, setHistory] = useState<LocalizationResult[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('bridge_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) { console.error('Failed to parse history:', e); }
    }
  }, []);

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

  const handleTranslate = async (data: { text?: string; file?: File; mode: TranslationMode; tone: TranslationTone; useSearch: boolean; direction: TranslationDirection }) => {
    const requestId = currentRequestId.current;
    setState({ loading: true, step: 'LOCALIZING', error: null, result: null });
    const sourceText = data.text || data.file?.name || 'Media Content';
    setLastSourceText(sourceText);

    try {
      let result: LocalizationResult;
      if (data.mode === TranslationMode.TEXT && data.text) {
        result = await localizeText(data.text, data.tone, data.useSearch, data.direction);
      } else if (data.file) {
        const base64 = await fileToBase64(data.file);
        const isVisual = data.file.type.startsWith('image/') || data.file.type === 'application/pdf';
        const prompt = isVisual ? "OCR and localize/translate this document content." : "Transcribe and localize/translate this media content.";
        result = await localizeFile(base64, data.file.type, prompt, data.tone, data.direction);
      } else throw new Error("Missing input data");

      if (currentRequestId.current !== requestId) return;
      setState({ loading: false, step: 'NONE', error: null, result });
      
      const newHistory = [result, ...history].slice(0, 5);
      setHistory(newHistory);
      localStorage.setItem('bridge_history', JSON.stringify(newHistory));
      
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
      <main className="flex-grow max-w-[1000px] mx-auto px-4 py-8 w-full">
        <section className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dari Native Bridge</h1>
          <p className="text-gray-600 mt-2">Professional translation and localization for Dari/English.</p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <TranslationInput onTranslate={handleTranslate} onStop={handleStop} loading={state.loading} />
          </div>

          <div className="space-y-6">
            {state.error && (
              <div className="bg-red-50 text-red-800 p-4 rounded-xl border border-red-200">
                <p className="text-sm font-semibold">{state.error}</p>
              </div>
            )}
            
            {state.result ? (
              <ResultView result={state.result} sourceText={lastSourceText} />
            ) : state.loading ? (
              <div className="p-8 text-center bg-white border border-gray-200 rounded-xl">
                 <p className="text-gray-600 font-medium">Processing...</p>
                 <button onClick={handleStop} className="mt-4 text-sm text-red-600">Abort</button>
              </div>
            ) : (
              <div className="p-8 text-center bg-gray-50 border border-gray-200 rounded-xl text-gray-500">
                <p className="text-base font-medium">Ready to translate</p>
                <p className="text-sm mt-2">Enter text or upload a file to begin.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
