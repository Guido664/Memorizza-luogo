import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Loader2, Map as MapIcon, History, AlertTriangle, Navigation, Trash2 } from 'lucide-react';
import { GeoCoordinates, SavedLocation, GeminiLocationResponse } from './types';
import { identifyLocation } from './services/geminiService';
import { LocationCard } from './components/LocationCard';
import { MapViewer } from './components/MapViewer';

const STORAGE_KEY = 'geo_memory_history';

// Simple ID generator fallback to avoid crashes if crypto.randomUUID is missing
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

function App() {
  const [history, setHistory] = useState<SavedLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [tempAnalysis, setTempAnalysis] = useState<GeminiLocationResponse | null>(null);

  // Load history safely
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        } else {
          // If data is corrupted (not an array), reset it
          setHistory([]);
        }
      } catch (e) {
        console.error("Failed to parse history", e);
        setHistory([]);
      }
    }
  }, []);

  const saveToHistory = useCallback((newLocation: SavedLocation) => {
    setHistory(prev => {
      // Ensure prev is an array before spreading
      const currentHistory = Array.isArray(prev) ? prev : [];
      const updated = [newLocation, ...currentHistory];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteFromHistory = useCallback((id: string) => {
    setHistory(prev => {
      const currentHistory = Array.isArray(prev) ? prev : [];
      const updated = currentHistory.filter(item => item.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    if (window.confirm("Sei sicuro di voler cancellare tutta la cronologia?")) {
        setHistory([]);
        localStorage.removeItem(STORAGE_KEY);
        setTempAnalysis(null);
    }
  }, []);

  const processLocation = async (coords: GeoCoordinates) => {
    try {
      setError(null);
      setIsLoading(true);
      // We do NOT set currentCoords here anymore. We wait for the result.
      
      // Call Gemini with Google Maps Grounding
      const response = await identifyLocation(coords);
      
      const newLocation: SavedLocation = {
        id: generateId(), // Safe ID generation
        timestamp: Date.now(),
        coords: coords,
        description: response.text,
        groundingChunks: response.groundingChunks
      };

      setTempAnalysis(response);
      saveToHistory(newLocation);
      setShowManualInput(false); // Hide manual input on success
    } catch (err: any) {
      console.error("Processing Error:", err);
      setError(err.message || "Impossibile identificare la posizione usando Gemini.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleIdentifyLocation = async () => {
    setIsLoading(true);
    setError(null);
    // We keep tempAnalysis visible until new one arrives if user wants, 
    // but usually clearing it indicates new process started.
    // setTempAnalysis(null); 
    setShowManualInput(false);

    if (!navigator.geolocation) {
      setError("La geolocalizzazione non è supportata dal tuo browser.");
      setIsLoading(false);
      setShowManualInput(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords: GeoCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        await processLocation(coords);
      },
      (err) => {
        setIsLoading(false);
        let msg = "Si è verificato un errore sconosciuto.";
        switch (err.code) {
          case 1: // PERMISSION_DENIED
            msg = "Permesso di localizzazione negato. Consenti l'accesso alla posizione nelle impostazioni del browser.";
            break;
          case 2: // POSITION_UNAVAILABLE
            msg = "Informazioni sulla posizione non disponibili.";
            break;
          case 3: // TIMEOUT
            msg = "La richiesta per ottenere la posizione utente è scaduta.";
            break;
          default:
            msg = err.message || msg;
        }
        setError(msg);
        setShowManualInput(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat) || isNaN(lng)) {
      setError("Inserisci coordinate decimali valide.");
      return;
    }
    
    // Basic validation
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
       setError("Coordinate fuori intervallo.");
       return;
    }

    processLocation({ latitude: lat, longitude: lng });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg">
               <MapIcon size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-700">
                GeoMemory
              </h1>
              <p className="text-xs text-gray-500 font-medium">Basato su Gemini e Google Maps</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Main Action Section */}
        <section className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="flex flex-col gap-6">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
              <h2 className="text-2xl font-bold mb-2">Dove sono?</h2>
              <p className="text-gray-500 mb-8">
                Usa l'IA per identificare il tuo ambiente e salvarlo sulla mappa.
              </p>
              
              {!showManualInput && (
                <button
                  onClick={handleIdentifyLocation}
                  disabled={isLoading}
                  className={`
                    relative group overflow-hidden px-8 py-4 rounded-full font-semibold text-white shadow-xl transition-all duration-300 w-full md:w-auto
                    ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-105 hover:shadow-blue-500/25'}
                  `}
                >
                  <div className="flex items-center justify-center gap-3">
                    {isLoading ? (
                      <Loader2 className="animate-spin w-5 h-5" />
                    ) : (
                      <MapPin className="w-5 h-5 group-hover:animate-bounce" />
                    )}
                    <span>{isLoading ? "Consultando Maps..." : "Memorizza Posizione"}</span>
                  </div>
                </button>
              )}
              
              {error && (
                <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-xl flex flex-col items-center gap-2 text-sm w-full animate-fade-in border border-red-100">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <p>Errore</p>
                  </div>
                  <p>{error}</p>
                  {!showManualInput && (
                    <button 
                        onClick={() => setShowManualInput(true)}
                        className="text-indigo-600 underline mt-1 hover:text-indigo-800"
                    >
                      Input manuale
                    </button>
                  )}
                </div>
              )}

              {showManualInput && (
                <form onSubmit={handleManualSubmit} className="w-full mt-6 bg-gray-50 p-6 rounded-xl border border-gray-200 animate-fade-in text-left">
                  <h3 className="text-sm font-bold uppercase text-gray-500 mb-4 flex items-center gap-2">
                    <Navigation className="w-4 h-4" />
                    Coordinate Manuali
                  </h3>
                  <div className="flex gap-4 mb-4">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Lat</label>
                      <input 
                        type="text" 
                        value={manualLat}
                        onChange={(e) => setManualLat(e.target.value)}
                        placeholder="41.90"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">Lon</label>
                      <input 
                        type="text" 
                        value={manualLng}
                        onChange={(e) => setManualLng(e.target.value)}
                        placeholder="12.49"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowManualInput(false)}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg"
                    >
                      Annulla
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md disabled:bg-gray-400"
                    >
                      Analizza
                    </button>
                  </div>
                </form>
              )}
            </div>
            
            {/* Map Container - Only dependent on saved locations */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-[300px] z-0 relative">
                <MapViewer savedLocations={history} />
            </div>
          </div>

          {/* Results Column */}
          <div className="flex flex-col gap-6">
             {/* Map for Mobile */}
             <div className="md:hidden bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-[250px] z-0 relative">
                <MapViewer savedLocations={history} />
            </div>

            {/* Latest Analysis */}
            {tempAnalysis && !isLoading && (
              <div className="animate-fade-in-up">
                  <div className="flex items-center gap-2 mb-2 text-green-700 font-medium text-sm">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
                      Ultimo rilevamento (Salvato)
                  </div>
                  {/* We show the first item from history which corresponds to this analysis */}
                  {history.length > 0 && <LocationCard location={history[0]} onDelete={deleteFromHistory} />}
              </div>
            )}

            {/* History List */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-gray-400" />
                    <h2 className="text-lg font-bold text-gray-800">Cronologia</h2>
                    <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">{history.length}</span>
                </div>
                {history.length > 0 && (
                    <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-600 flex items-center">
                        <Trash2 className="w-3 h-3 mr-1"/> Svuota
                    </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
                  <p className="text-gray-400 text-sm">Nessun luogo salvato.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Don't show the duplicate if it's already shown in "Ultimo rilevamento" section above */}
                  {(tempAnalysis ? history.slice(1) : history).map(loc => (
                      <LocationCard key={loc.id} location={loc} onDelete={deleteFromHistory} />
                    ))}
                  {tempAnalysis && history.length === 1 && (
                       <p className="text-center text-gray-400 text-xs italic mt-2 opacity-50">Le posizioni precedenti appariranno qui.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;