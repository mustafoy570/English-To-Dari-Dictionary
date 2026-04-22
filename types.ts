
export enum TranslationMode {
  TEXT = 'TEXT',
  MEDIA = 'MEDIA'
}

export enum TranslationTone {
  FORMAL = 'FORMAL',
  INFORMAL = 'INFORMAL'
}

export interface GroundingSource {
  title: string;
  uri: string;
  snippet?: string;
}

export interface LocalizationResult {
  sourceLanguage: string;
  targetLanguage: string;
  dariTranslation: string; // Keeping field name for compatibility, but it holds any language
  transliteration?: string;
  localizationNotes: string[];
  visualPrompt?: string;
  imageUrl?: string;
  groundingSources?: GroundingSource[];
  webRefImages?: string[];
  expertAnalysis?: string;
}

export type LoadingStep = 'LOCALIZING' | 'VISUALIZING' | 'ANALYZING' | 'NONE';

export interface ProcessingState {
  loading: boolean;
  step: LoadingStep;
  error: string | null;
  result: LocalizationResult | null;
}
