export interface TranscriptionResult {
    success: boolean;
    transcription: string;
    language: string;
    duration?: number;
    confidence?: number;
}
/**
 * Transcribes audio using Deepgram's nova-3-medical model
 * Optimized for medical dictation with keyterm boosting
 */
export declare function transcribeMedicalAudio(audioBuffer: ArrayBuffer, contentType?: string): Promise<TranscriptionResult>;
