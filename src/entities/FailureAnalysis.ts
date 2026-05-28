export type FailureAnalysisStatus = 'queued' | 'done' | 'unavailable';

export interface FailureAnalysis {
  synopsis?: string;
  summary_text?: string;
}

export interface FailureAnalysisResponse {
  status?: FailureAnalysisStatus;
  analysis?: FailureAnalysis;
}
