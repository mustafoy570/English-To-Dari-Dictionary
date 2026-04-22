
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { LocalizationResult, TranslationTone, GroundingSource, TranslationDirection } from "../types";

const getSystemInstruction = (direction: TranslationDirection): string => {
  if (direction === TranslationDirection.DARI_TO_ENGLISH) {
    return `
You are the "Dari Native Bridge," a specialized linguistic AI expert.
Your goal is to translate text from authentic, native Dari (Afghan Persian) into natural, fluent English.
Maintain the cultural nuance and meaning of the original Dari.

Output format MUST be a JSON object:
{
  "sourceLanguage": "Dari (Native Afghan)",
  "targetLanguage": "English",
  "dariTranslation": "The English translation",
  "transliteration": "Optional: Latin script transliteration of the Dari input",
  "localizationNotes": ["Array of strings explaining specific cultural or idiomatic aspects of the Dari input"]
}
`;
  }
  return `
You are the "Dari Native Bridge," a specialized linguistic AI expert. Your primary goal is to localize and translate text from any world language into authentic, native Dari (Afghan Persian). 
You prioritize "Dari-first" native Afghan vocabulary, avoiding Iranian-specific neologisms or textbook Persian.

Linguistic Rules:
1. Vocabulary: Use native Afghan terms (e.g., using 'Pohantun' instead of 'Daneshgah').
2. Accent/Cadence: The output must reflect the natural, neutral speech patterns of Afghanistan (Kabul/Mazar/Herat).
3. Precision: Focus on factual accuracy and deep cultural context for the Afghan audience.

Output format MUST be a JSON object:
{
  "sourceLanguage": "Detected source language",
  "targetLanguage": "Dari (Native Afghan)",
  "dariTranslation": "The localized translation in the Dari (Persian) script",
  "transliteration": "Latin script transliteration for pronunciation",
  "localizationNotes": ["Array of strings explaining specific word choices and cultural nuances relative to the source language"]
}
`;
};

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const msg = String(error).toLowerCase();
    const isRetryable = msg.includes('500') || msg.includes('429') || msg.includes('other') || msg.includes('finish reason');
    if (isRetryable && retries > 0) {
      await new Promise(r => setTimeout(r, delay));
      return withRetry(fn, retries - 1, delay * 1.5);
    }
    throw error;
  }
}

export const localizeText = async (text: string, tone: TranslationTone, useSearch = false, direction: TranslationDirection = TranslationDirection.ANY_TO_DARI): Promise<LocalizationResult> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelName = "gemini-2.0-flash-exp";
    
    const config: any = {
      systemInstruction: getSystemInstruction(direction),
    };

    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    } else {
      config.responseMimeType = "application/json";
      config.responseSchema = {
        type: Type.OBJECT,
        properties: {
          sourceLanguage: { type: Type.STRING },
          targetLanguage: { type: Type.STRING },
          dariTranslation: { type: Type.STRING },
          transliteration: { type: Type.STRING },
          localizationNotes: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["sourceLanguage", "targetLanguage", "dariTranslation", "localizationNotes"]
      };
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: `Translate the following ${direction === TranslationDirection.DARI_TO_ENGLISH ? 'from Dari to English' : 'into native Afghan Dari'} (${tone.toLowerCase()} tone): "${text}".
      
      ${useSearch ? `IMPORTANT: Use the Google Search tool to find exactly 3 high-quality web references (articles, facts, or image-hosting sources) that ground the context of this specific translation for an Afghan audience. These must be reflected in your grounding metadata.` : ""}
      
      MANDATORY: Return the result strictly as a JSON object inside your response text according to the system instructions.` ,
      config
    });

    let result: any = {};
    const textResponse = response.text || '';
    
    try {
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : textResponse);
    } catch (e) {
      result = { dariTranslation: textResponse, localizationNotes: ["Native Contextual Bridge Mode"], targetLanguage: "Dari (Native Afghan)" };
    }

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks) {
      const seenUris = new Set<string>();
      result.groundingSources = groundingChunks
        .map((chunk: any) => {
          if (chunk.web && !seenUris.has(chunk.web.uri)) {
            seenUris.add(chunk.web.uri);
            return { 
              title: chunk.web.title, 
              uri: chunk.web.uri 
            };
          }
          return null;
        })
        .filter(Boolean)
        .slice(0, 3) as GroundingSource[];
    }
    
    return result as LocalizationResult;
  });
};

export const generateSpeech = async (text: string, voiceName: 'Puck' | 'Kore'): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: { parts: [{ text: text }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    });
    const audioData = response.candidates?.[0]?.content?.parts.find(p => p.inlineData)?.inlineData?.data;
    if (!audioData) throw new Error("No audio returned");
    return audioData;
  });
};

export const getExpertAnalysis = async (translatedText: string, sourceText: string): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Expert linguistic analysis: Native Dari translation "${translatedText}" vs Source "${sourceText}". Focus on Afghan cultural authenticity and idiomatic accuracy. Provide a concise breakdown.`,
      config: { systemInstruction: `You are an expert Afghan linguist specializing in native Dari localization.` }
    });
    return response.text || "Analysis unavailable.";
  });
};

export const localizeFile = async (base64: string, mimeType: string, prompt: string, tone: TranslationTone, direction: TranslationDirection = TranslationDirection.ANY_TO_DARI): Promise<LocalizationResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-exp",
    contents: { parts: [{ inlineData: { data: base64, mimeType: mimeType } }, { text: `${prompt} Localize/translate the content ${direction === TranslationDirection.DARI_TO_ENGLISH ? 'from Dari to English' : 'into native Afghan Dari'} (${tone.toLowerCase()} tone).` }] },
    config: { systemInstruction: getSystemInstruction(direction), responseMimeType: "application/json" }
  });
  return JSON.parse(response.text || '{}');
};

export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

export async function decodePCM(data: Uint8Array, ctx: AudioContext, sampleRate = 24000, numChannels = 1): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const buffer = ctx.createBuffer(numChannels, dataInt16.length / numChannels, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < channelData.length; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

export function encodeWAV(pcmBytes: Uint8Array, sampleRate = 24000): Blob {
  const buffer = new ArrayBuffer(44 + pcmBytes.length);
  const view = new DataView(buffer);
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + pcmBytes.length, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, pcmBytes.length, true);
  const pcmBuffer = new Uint8Array(buffer, 44);
  pcmBuffer.set(pcmBytes);
  return new Blob([buffer], { type: 'audio/wav' });
}
