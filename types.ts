export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
    placeAnswerSources?: {
      reviewSnippets?: {
        content: string;
        author?: string;
      }[];
    }[];
  };
}

export interface SavedLocation {
  id: string;
  timestamp: number;
  coords: GeoCoordinates;
  description: string;
  groundingChunks: GroundingChunk[];
}

export interface GeminiLocationResponse {
  text: string;
  groundingChunks: GroundingChunk[];
}