import { GoogleGenAI } from "@google/genai";
import { GeoCoordinates, GeminiLocationResponse } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const identifyLocation = async (coords: GeoCoordinates): Promise<GeminiLocationResponse> => {
  if (!apiKey) {
    throw new Error("Chiave API mancante.");
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Analizza questa posizione. Dimmi esattamente dove mi trovo (indirizzo, edificio o punto di riferimento) ed elenca 3 luoghi o strutture interessanti nelle vicinanze (ad esempio ristoranti, parchi, trasporti). Mantieni un tono utile e conciso. Rispondi in italiano.",
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: coords.latitude,
              longitude: coords.longitude
            }
          }
        }
      },
    });

    const text = response.text || "Nessuna descrizione disponibile.";
    
    // Extract grounding chunks if available
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    return {
      text,
      groundingChunks: groundingChunks as any[] // Casting for simplified internal type usage
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};