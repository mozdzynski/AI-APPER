export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  sources?: Array<{ title: string; uri: string }>;
}

export interface DesignStyle {
  id: string;
  name: string;
  prompt: string;
  thumbnailColor: string;
}

export enum AppState {
  UPLOAD = 'UPLOAD',
  EDITOR = 'EDITOR',
}
