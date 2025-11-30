import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Loader2, Map as MapIcon, History, AlertTriangle, Navigation } from 'lucide-react';
import { GeoCoordinates, SavedLocation, GeminiLocationResponse } from './types';
import { identifyLocation } from './services/geminiService';
import { LocationCard } from './components/LocationCard';

const STORAGE_KEY = 'geo_memory_history';

function App() {
  const [history, setHistory] = useState<SavedLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [tempAnalysis, setTempAnalysis] = useState<GeminiLocationResponse | null>(null);
  const [currentCoords, setCurrentCoords] = useState<GeoCoordinates | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const saveToHistory = useCallback((newLocation: SavedLocation) => {
    setHistory(prev => {
      const updated = [newLocation, ...prev];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteFromHistory = useCallback((id: string) => {
    setHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const processLocation = async (coords: GeoCoordinates) => {
    try {
      setError(null);
      setIsLoading(true);
      setCurrentCoords(coords);
      
      // Call Gemini with Google Maps Grounding
      const response = await identifyLocation(coords);
      
      const newLocation: SavedLocation = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        coords: coords,
        description: response.text,
        groundingChunks: response.groundingChunks
      };

      setTempAnalysis(response);
      saveToHistory(newLocation);
      setShowManualInput(false); // Hide manual input on success
    } catch (err: any) {
      setError(err.message || "Impossibile identificare la posizione usando Gemini.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleIdentifyLocation = async () => {
    setIsLoading(true);
    setError(null);
    setTempAnalysis(null);
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
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
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

      <main className="max-w-3xl mx-auto px-4 py-8">
        
        {/* Main Action Section */}
        <section className="mb-10 text-center">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center">
            <h2 className="text-2xl font-bold mb-2">Dove sono?</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Usa l'IA di Gemini basata sui dati di Google Maps per identificare con precisione l'ambiente circostante e memorizzare questo luogo.
            </p>
            
            {!showManualInput && (
              <button
                onClick={handleIdentifyLocation}
                disabled={isLoading}
                className={`
                  relative group overflow-hidden px-8 py-4 rounded-full font-semibold text-white shadow-xl transition-all duration-300
                  ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-105 hover:shadow-blue-500/25'}
                `}
              >
                <div className="flex items-center gap-3">
                  {isLoading ? (
                    <Loader2 className="animate-spin w-5 h-5" />
                  ) : (
                    <MapPin className="w-5 h-5 group-hover:animate-bounce" />
                  )}
                  <span>{isLoading ? "Consultando Google Maps..." : "Memorizza la mia posizione"}</span>
                </div>
              </button>
            )}
            
            {error && (
              <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-xl flex flex-col items-center gap-2 text-sm max-w-lg animate-fade-in border border-red-100 mx-auto">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <p>Errore di Posizione</p>
                </div>
                <p>{error}</p>
                {!showManualInput && (
                   <button 
                      onClick={() => setShowManualInput(true)}
                      className="text-indigo-600 underline mt-1 hover:text-indigo-800"
                   >
                     Prova a inserire le coordinate manualmente
                   </button>
                )}
              </div>
            )}

            {showManualInput && (
              <form onSubmit={handleManualSubmit} className="w-full max-w-md mt-6 bg-gray-50 p-6 rounded-xl border border-gray-200 animate-fade-in">
                <h3 className="text-lg font-semibold mb-4 text-gray-700 flex items-center justify-center gap-2">
                   <Navigation className="w-4 h-4" />
                   Coordinate Manuali
                </h3>
                <div className="flex gap-4 mb-4">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Latitudine</label>
                    <input 
                      type="text" 
                      value={manualLat}
                      onChange={(e) => setManualLat(e.target.value)}
                      placeholder="es. 41.9028"
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Longitudine</label>
                    <input 
                      type="text" 
                      value={manualLng}
                      onChange={(e) => setManualLng(e.target.value)}
                      placeholder="es. 12.4964"
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                   <button
                    type="button"
                    onClick={() => setShowManualInput(false)}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md disabled:bg-gray-400"
                  >
                    {isLoading ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : "Analizza Posizione"}
                  </button>
                </div>
              </form>
            )}

          </div>
        </section>

        {/* Latest Result */}
        {tempAnalysis && !isLoading && (
            <div className="mb-10 animate-fade-in-up">
                <div className="flex items-center gap-2 mb-4 text-green-700 font-medium px-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
                    Appena memorizzato
                </div>
                {history.length > 0 && <LocationCard location={history[0]} onDelete={deleteFromHistory} />}
            </div>
        )}

        {/* History Section */}
        <section>
          <div className="flex items-center gap-2 mb-6 px-2">
            <History className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-bold text-gray-800">Luoghi Salvati</h2>
            <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">{history.length}</span>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nessuna posizione salvata ancora.</p>
              <p className="text-sm text-gray-400 mt-1">
                {showManualInput ? "Inserisci le coordinate sopra." : "Clicca il pulsante sopra per iniziare."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tempAnalysis 
                ? history.slice(1).map(loc => (
                    <LocationCard key={loc.id} location={loc} onDelete={deleteFromHistory} />
                  ))
                : history.map(loc => (
                    <LocationCard key={loc.id} location={loc} onDelete={deleteFromHistory} />
                  ))
              }
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;