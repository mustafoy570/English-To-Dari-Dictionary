
import React, { useState, useRef } from 'react';
import { TranslationMode, TranslationTone } from '../types';

interface Props {
  onTranslate: (data: { text?: string; file?: File; mode: TranslationMode; tone: TranslationTone; useSearch: boolean }) => void;
  onStop: () => void;
  loading: boolean;
}

const TranslationInput: React.FC<Props> = ({ onTranslate, onStop, loading }) => {
  const [mode, setMode] = useState<TranslationMode>(TranslationMode.TEXT);
  const [tone, setTone] = useState<TranslationTone>(TranslationTone.INFORMAL);
  const [useSearch, setUseSearch] = useState(false);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (loading) {
      onStop();
      return;
    }
    if (mode === TranslationMode.TEXT && text.trim()) {
      onTranslate({ text, mode, tone, useSearch });
    } else if (file) {
      onTranslate({ file, mode, tone, useSearch });
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
      <div className="flex bg-gray-50 border-b border-gray-100">
        <button
          onClick={() => { setMode(TranslationMode.TEXT); setIsRecording(false); }}
          className={`flex-1 py-2 text-[10px] font-black tracking-widest transition-all ${mode === TranslationMode.TEXT ? 'text-emerald-600 bg-white' : 'text-gray-400'}`}
        >
          TEXT BRIDGE
        </button>
        <button
          onClick={() => setMode(TranslationMode.MEDIA)}
          className={`flex-1 py-2 text-[10px] font-black tracking-widest transition-all ${mode === TranslationMode.MEDIA ? 'text-emerald-600 bg-white' : 'text-gray-400'}`}
        >
          MEDIA BRIDGE
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Compact Settings Bar */}
        <div className="flex items-center justify-between">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setTone(TranslationTone.FORMAL)}
              className={`px-4 py-1 text-[8px] font-black tracking-tighter rounded-md transition-all ${tone === TranslationTone.FORMAL ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}
            >
              FORMAL
            </button>
            <button
              onClick={() => setTone(TranslationTone.INFORMAL)}
              className={`px-4 py-1 text-[8px] font-black tracking-tighter rounded-md transition-all ${tone === TranslationTone.INFORMAL ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}
            >
              INFORMAL
            </button>
          </div>

          <button 
            onClick={() => setUseSearch(!useSearch)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all ${useSearch ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-gray-100 text-gray-400'}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${useSearch ? 'bg-emerald-500 animate-pulse' : 'bg-gray-200'}`} />
            <span>Fact Check</span>
          </button>
        </div>

        {/* Input Area */}
        {mode === TranslationMode.TEXT ? (
          <div className="flex items-end gap-2 bg-gray-50/50 p-3 rounded-xl border border-gray-100 focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all">
            <textarea
              className="flex-grow bg-transparent border-0 text-sm font-medium outline-none resize-none placeholder:text-gray-300 min-h-[80px] leading-relaxed"
              placeholder="Enter text from any world language..."
              value={text}
              disabled={loading}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            />
            
            <button
              onClick={() => handleSubmit()}
              disabled={loading || !text.trim()}
              className={`shrink-0 w-12 h-12 flex items-center justify-center rounded-xl transition-all shadow-md ${loading ? 'bg-red-50 text-red-500 shadow-red-100' : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-emerald-100'}`}
              title="Localize to Dari"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              )}
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
