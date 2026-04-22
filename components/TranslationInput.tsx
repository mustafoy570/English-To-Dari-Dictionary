
import React, { useState, useRef, useEffect } from 'react';
import { TranslationMode, TranslationTone, TranslationDirection } from '../types';

interface Props {
  onTranslate: (data: { text?: string; file?: File; mode: TranslationMode; tone: TranslationTone; useSearch: boolean; direction: TranslationDirection }) => void;
  onStop: () => void;
  loading: boolean;
}

const TranslationInput: React.FC<Props> = ({ onTranslate, onStop, loading }) => {
  const [mode, setMode] = useState<TranslationMode>(TranslationMode.TEXT);
  const [tone, setTone] = useState<TranslationTone>(TranslationTone.INFORMAL);
  const [direction, setDirection] = useState<TranslationDirection>(TranslationDirection.ANY_TO_DARI);
  const [useSearch, setUseSearch] = useState(false);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('bridge_prefs');
    if (saved) {
      try {
        const { tone, direction, useSearch } = JSON.parse(saved);
        if (tone) setTone(tone);
        if (direction) setDirection(direction);
        if (useSearch !== undefined) setUseSearch(useSearch);
      } catch (e) { console.error('Failed to parse prefs:', e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('bridge_prefs', JSON.stringify({ tone, direction, useSearch }));
  }, [tone, direction, useSearch]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loading) {
      onStop();
      return;
    }
    if (mode === TranslationMode.TEXT && text.trim()) {
      onTranslate({ text, mode, tone, useSearch, direction });
    } else if (file) {
      onTranslate({ file, mode, tone, useSearch, direction });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setIsRecording(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const recordedFile = new File([blob], `recording_${new Date().getTime()}.webm`, { type: 'audio/webm' });
        setFile(recordedFile);
        stream.getTracks().forEach(track => track.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        setRecordingTime(0);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    } catch (err) {
      console.error("Microphone error:", err);
      alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-[1.5rem] shadow-xl border border-gray-100 overflow-hidden">
      {/* Tab Header */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => { setMode(TranslationMode.TEXT); setIsRecording(false); }}
          className={`flex-1 py-4 text-sm font-semibold transition-all ${mode === TranslationMode.TEXT ? 'text-emerald-700 bg-emerald-50' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          Text Translation
        </button>
        <button
          onClick={() => setMode(TranslationMode.MEDIA)}
          className={`flex-1 py-4 text-sm font-semibold transition-all ${mode === TranslationMode.MEDIA ? 'text-emerald-700 bg-emerald-50' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          Media/File Translation
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Settings Bar */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-2">
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as TranslationDirection)}
              className="px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              <option value={TranslationDirection.ANY_TO_DARI}>Any → Dari</option>
              <option value={TranslationDirection.DARI_TO_ENGLISH}>Dari → English</option>
            </select>
            
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as TranslationTone)}
              className="px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              <option value={TranslationTone.FORMAL}>Formal</option>
              <option value={TranslationTone.INFORMAL}>Informal</option>
            </select>
          </div>

          <button 
            onClick={() => setUseSearch(!useSearch)}
            className={`px-4 py-2 text-sm font-medium rounded-lg border flex items-center gap-2 ${useSearch ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-white border-gray-300 text-gray-600'}`}
          >
            Fact Check: {useSearch ? 'On' : 'Off'}
          </button>
        </div>

        {/* Input Area */}
        {mode === TranslationMode.TEXT ? (
          <div className="space-y-4">
            <textarea
              className="w-full p-4 text-base font-normal border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[150px]"
              placeholder="Enter text here..."
              value={text}
              disabled={loading}
              onChange={(e) => setText(e.target.value)}
            />
            
            <button
              onClick={() => handleSubmit()}
              disabled={loading || !text.trim()}
              className={`w-full py-3 text-base font-bold text-white rounded-xl ${loading ? 'bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            >
              {loading ? 'Translating...' : 'Translate'}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div 
              className={`flex-grow border-2 border-dashed rounded-xl p-6 text-center bg-gray-50/30 hover:bg-emerald-50/20 transition-all cursor-pointer ${file ? 'border-emerald-200' : 'border-gray-100'}`} 
              onClick={() => fileInputRef.current?.click()}
            >
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*,application/pdf,audio/*,video/*" />
              <div className="flex flex-col items-center">
                <svg className="w-8 h-8 text-emerald-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" /></svg>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate max-w-[180px]">{file ? file.name : "Upload Media to Dari Bridge"}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-900 text-white hover:bg-black'}`}
              >
                {isRecording ? <div className="w-3 h-3 bg-white rounded-sm" /> : <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8V4a1 1 0 112 0v4a9 9 0 01-8 8.93V19a1 1 0 11-2 0v-2.07A9.001 9.001 0 011 8V4a1 1 0 012 0v4a7 7 0 0014 0z" clipRule="evenodd"/></svg>}
              </button>
              {isRecording && <span className="text-[8px] font-black text-red-500 animate-pulse text-center">{formatTime(recordingTime)}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TranslationInput;
