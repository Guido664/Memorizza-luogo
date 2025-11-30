import React from 'react';
import { SavedLocation } from '../types';
import { MapPin, Navigation, Calendar, ExternalLink, Trash2 } from 'lucide-react';

interface LocationCardProps {
  location: SavedLocation;
  onDelete?: (id: string) => void;
}

export const LocationCard: React.FC<LocationCardProps> = ({ location, onDelete }) => {
  const date = new Date(location.timestamp).toLocaleString('it-IT');

  // Parse markdown for basic formatting if needed, but for now we just display text
  // We will try to make links clickable if they appear in text, but primarily we rely on chunks.
  
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center text-blue-600 font-semibold">
            <MapPin className="w-5 h-5 mr-2" />
            <span>Posizione Salvata</span>
          </div>
          {onDelete && (
             <button 
                onClick={() => onDelete(location.id)}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
                aria-label="Elimina posizione"
             >
               <Trash2 className="w-4 h-4" />
             </button>
          )}
        </div>

        <div className="mb-4">
            <h3 className="text-gray-800 font-medium text-lg leading-tight mb-2">Analisi di Gemini</h3>
            <div className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">
              {location.description}
            </div>
        </div>

        <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-100">
             <div className="flex items-center text-xs text-gray-500">
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                {date}
            </div>
            <div className="flex items-center text-xs text-gray-500">
                <Navigation className="w-3.5 h-3.5 mr-1.5" />
                {location.coords.latitude.toFixed(5)}, {location.coords.longitude.toFixed(5)}
            </div>
        </div>
      </div>

      {location.groundingChunks && location.groundingChunks.length > 0 && (
        <div className="bg-gray-50 p-4 border-t border-gray-100">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Dati Sorgente (Google Maps)
          </h4>
          <div className="flex flex-col gap-2">
            {location.groundingChunks.map((chunk, index) => {
              if (chunk.maps) {
                return (
                  <a
                    key={index}
                    href={chunk.maps.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-2 bg-white rounded border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                  >
                    <div className="bg-green-100 text-green-600 p-1.5 rounded mr-3">
                        <MapPin className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-700">
                        {chunk.maps.title || "Luogo Sconosciuto"}
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                  </a>
                );
              }
              if (chunk.web) {
                 return (
                  <a
                    key={index}
                    href={chunk.web.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center p-2 bg-white rounded border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                  >
                    <div className="bg-blue-100 text-blue-600 p-1.5 rounded mr-3">
                        <ExternalLink className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-700">
                        {chunk.web.title || "Risultato Web"}
                      </p>
                    </div>
                  </a>
                );
              }
              return null;
            })}
          </div>
        </div>
      )}
    </div>
  );
};