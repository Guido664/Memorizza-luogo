import React from 'react';
import { SavedLocation } from '../types';
import { MapPin, Calendar, ExternalLink, Trash2, Navigation } from 'lucide-react';

interface LocationCardProps {
  location: SavedLocation;
  onDelete?: (id: string) => void;
}

export const LocationCard: React.FC<LocationCardProps> = ({ location, onDelete }) => {
  const date = new Date(location.timestamp).toLocaleString('it-IT');
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.coords.latitude},${location.coords.longitude}`;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col">
      <div className="p-4 flex flex-col gap-3">
        
        {/* Header: Data e Cestino */}
        <div className="flex justify-between items-center border-b border-gray-100 pb-2">
            <div className="flex items-center text-xs text-gray-500 font-medium">
                <Calendar className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                {date}
            </div>
            {onDelete && (
                <button 
                    onClick={() => onDelete(location.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1.5 rounded-md hover:bg-red-50"
                    title="Elimina posizione"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            )}
        </div>

        {/* Coordinate */}
        <div className="flex items-center text-sm text-gray-800 font-medium py-1">
            <MapPin className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
            <span className="truncate">{location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}</span>
        </div>

        {/* Pulsante Naviga */}
        <a 
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 flex items-center justify-center w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wide rounded-md transition-colors shadow-sm group"
        >
            <Navigation className="w-3.5 h-3.5 mr-2 group-hover:translate-x-0.5 transition-transform" />
            Naviga
        </a>

        {/* Legacy Grounding Chunks (Solo se presenti da vecchi salvataggi, molto compatti) */}
        {location.groundingChunks && location.groundingChunks.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100 flex flex-col gap-1.5">
                {location.groundingChunks.map((chunk, index) => (
                    chunk.maps ? (
                        <a
                            key={index}
                            href={chunk.maps.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-xs text-gray-600 hover:text-blue-600 truncate"
                        >
                            <ExternalLink className="w-3 h-3 mr-1.5 flex-shrink-0" />
                            <span className="truncate">{chunk.maps.title}</span>
                        </a>
                    ) : null
                ))}
            </div>
        )}
      </div>
    </div>
  );
};