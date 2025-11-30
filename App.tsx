import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MapPin, Loader2, Map as MapIcon, History, AlertTriangle, Navigation, Trash2, X, Tag } from 'lucide-react';
import { GeoCoordinates, SavedLocation } from './types';
import { LocationCard } from './components/LocationCard';
import { MapViewer } from './components/MapViewer';

const STORAGE_KEY = 'geo_memory_history';

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
  const [showMap, setShowMap] = useState(false);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

  // Load and sanitize history
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // STRICT FILTERING to remove corrupt data causing NaN errors
          const validHistory = parsed.filter((item: any) => 
            item && item.coords && 
            typeof item.coords.latitude === 'number' && !isNaN(item.coords.latitude) &&
            typeof item.coords.longitude === 'number' && !isNaN(item.coords.longitude)
          );
          setHistory(validHistory);
        } else {
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

  const updateLocationTag = useCallback((id: string, newTag: string) => {
    setHistory(prev => {
        const currentHistory = Array.isArray(prev) ? prev : [];
        const updated = currentHistory.map(item => 
            item.id === id ? { ...item, tag: newTag } : item
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    if (window.confirm("Sei sicuro di voler cancellare tutta la cronologia?")) {
        setHistory([]);
        localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Simplified process: Just save, no AI analysis
  const processLocation = (coords: GeoCoordinates) => {
    try {
      setError(null);
      setIsLoading(true);

      const newLocation: SavedLocation = {
        id: generateId(),
        timestamp: Date.now(),
        coords: coords,
        description: "Posizione acquisita manualmente o via GPS."
      };

      saveToHistory(newLocation);
      setShowManualInput(false);
      setIsLoading(false);
    } catch (err: any) {
      console.error("Processing Error:", err);
      setError("Errore nel salvataggio della posizione.");
      setIsLoading(false);
    }
  };

  const handleIdentifyLocation = () => {
    setIsLoading(true);
    setError(null);
    setShowManualInput(false);

    if (!navigator.geolocation) {
      setError("La geolocalizzazione non è supportata dal tuo browser.");
      setIsLoading(false);
      setShowManualInput(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: GeoCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        processLocation(coords);
      },
      (err) => {
        setIsLoading(false);
        let msg = "Si è verificato un errore sconosciuto.";
        switch (err.code) {
          case 1: // PERMISSION_DENIED
            msg = "Permesso negato. Abilita la posizione o usa l'input manuale.";
            break;
          case 2: // POSITION_UNAVAILABLE
            msg = "Posizione non disponibile.";
            break;
          case 3: // TIMEOUT
            msg = "Timeout richiesta posizione.";
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
    
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
       setError("Coordinate fuori intervallo.");
       return;
    }

    processLocation({ latitude: lat, longitude: lng });
  };

  // Extract unique tags
  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    history.forEach(loc => {
        if (loc.tag && loc.tag.trim() !== '') {
            tags.add(loc.tag.trim());
        }
    });
    return Array.from(tags).sort();
  }, [history]);

  // Filter history based on active tag
  const filteredHistory = useMemo(() => {
    if (!activeTagFilter) return history;
    return history.filter(loc => loc.tag === activeTagFilter);
  }, [history, activeTagFilter]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20 font-sans">
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
              <p className="text-xs text-gray-500 font-medium">Logger Posizione GPS</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        
        {/* Main Action Section */}
        <section className="mb-8 flex flex-col items-center">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center w-full max-w-lg">
              <h2 className="text-2xl font-bold mb-2">Traccia Posizione</h2>
              <p className="text-gray-500 mb-8">
                Salva le tue coordinate attuali e visualizzale sulla mappa.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 w-full">
                {!showManualInput && (
                    <button
                    onClick={handleIdentifyLocation}
                    disabled={isLoading}
                    className={`
                        flex-1 relative overflow-hidden px-6 py-4 rounded-xl font-semibold text-white shadow-lg transition-all duration-300
                        ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-blue-500/25 active:scale-95'}
                    `}
                    >
                    <div className="flex items-center justify-center gap-2">
                        {isLoading ? (
                        <Loader2 className="animate-spin w-5 h-5" />
                        ) : (
                        <MapPin className="w-5 h-5" />
                        )}
                        <span>{isLoading ? "Acquisizione..." : "Memorizza Posizione"}</span>
                    </div>
                    </button>
                )}

                <button
                    onClick={() => setShowMap(true)}
                    className="flex-1 px-6 py-4 rounded-xl font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors shadow-sm active:scale-95 flex items-center justify-center gap-2"
                >
                    <MapIcon className="w-5 h-5" />
                    Apri Mappa
                </button>
              </div>
              
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
                      Inserisci manualmente
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
                      Salva
                    </button>
                  </div>
                </form>
              )}
            </div>
        </section>

        {/* History List */}
        <section>
            <div className="flex flex-col gap-4 mb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-gray-400" />
                        <h2 className="text-lg font-bold text-gray-800">Cronologia Posizioni</h2>
                        <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">{filteredHistory.length}</span>
                    </div>
                    {history.length > 0 && (
                        <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-600 flex items-center transition-colors">
                            <Trash2 className="w-3 h-3 mr-1"/> Svuota
                        </button>
                    )}
                </div>

                {/* Tags Filter */}
                {uniqueTags.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                         <button
                            onClick={() => setActiveTagFilter(null)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border whitespace-nowrap
                                ${activeTagFilter === null 
                                    ? 'bg-blue-600 text-white border-blue-600' 
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                        >
                            Tutti
                        </button>
                        {uniqueTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => setActiveTagFilter(tag)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border whitespace-nowrap flex items-center gap-1
                                    ${activeTagFilter === tag 
                                        ? 'bg-blue-600 text-white border-blue-600' 
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                            >
                                <Tag className="w-3 h-3" />
                                {tag}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {filteredHistory.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-400 text-sm">
                    {activeTagFilter ? `Nessuna posizione trovata con il tag "${activeTagFilter}"` : "Nessun luogo salvato."}
                </p>
                {activeTagFilter && (
                    <button 
                        onClick={() => setActiveTagFilter(null)} 
                        className="text-blue-500 text-xs mt-2 underline"
                    >
                        Mostra tutti
                    </button>
                )}
            </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredHistory.map(loc => (
                    <LocationCard 
                        key={loc.id} 
                        location={loc} 
                        onDelete={deleteFromHistory}
                        onUpdateTag={updateLocationTag}
                    />
                ))}
            </div>
            )}
        </section>

        {/* Map Modal */}
        {showMap && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden relative">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white z-10">
                        <div className="flex items-center gap-2">
                             <MapIcon className="w-5 h-5 text-blue-600" />
                             <h3 className="font-bold text-lg">Mappa Posizioni</h3>
                        </div>
                        <button 
                            onClick={() => setShowMap(false)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-6 h-6 text-gray-500" />
                        </button>
                    </div>
                    <div className="flex-1 relative bg-gray-100">
                        <MapViewer savedLocations={history} />
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
}

export default App;