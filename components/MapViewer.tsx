import React, { useEffect, useRef, useState } from 'react';
import { SavedLocation } from '../types';

// Declare L global from the script tag in index.html
declare const L: any;

interface MapViewerProps {
  savedLocations: SavedLocation[];
}

export const MapViewer: React.FC<MapViewerProps> = ({ savedLocations }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const [isLeafletReady, setIsLeafletReady] = useState(false);

  // Check for Leaflet availability
  useEffect(() => {
    if (typeof L !== 'undefined') {
      setIsLeafletReady(true);
    } else {
      const interval = setInterval(() => {
        if (typeof L !== 'undefined') {
          setIsLeafletReady(true);
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!isLeafletReady || !mapRef.current) return;
    if (mapInstanceRef.current) return;

    // Safety check for empty or invalid history
    const hasHistory = Array.isArray(savedLocations) && savedLocations.length > 0;
    
    // Default center (Rome) or first saved location
    let defaultCenter = [41.9028, 12.4964]; // Rome
    if (hasHistory) {
        defaultCenter = [savedLocations[0].coords.latitude, savedLocations[0].coords.longitude];
    }

    const defaultZoom = hasHistory ? 15 : 12;

    try {
        mapInstanceRef.current = L.map(mapRef.current).setView(defaultCenter, defaultZoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(mapInstanceRef.current);

        markersLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);
        
        // Fix for grey tiles when map container is resized or hidden initially
        setTimeout(() => {
            mapInstanceRef.current?.invalidateSize();
        }, 100);

    } catch (e) {
        console.error("Error initializing map", e);
    }

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isLeafletReady]); 

  // Update Markers and Center
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !Array.isArray(savedLocations)) return;

    markersLayerRef.current.clearLayers();

    // Define Icons with fallback
    const blueIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    const redIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

    // Add History Markers
    // Index 0 is the latest one (Red), others are Blue
    savedLocations.forEach((loc, index) => {
      const isLatest = index === 0;
      const markerIcon = isLatest ? redIcon : blueIcon;
      const zIndex = isLatest ? 1000 : 0; // Bring latest to front

      const marker = L.marker([loc.coords.latitude, loc.coords.longitude], { 
          icon: markerIcon,
          zIndexOffset: zIndex
      })
        .bindPopup(`
          <div style="font-family: sans-serif;">
            <strong style="color: ${isLatest ? '#DC2626' : '#2563EB'};">${isLatest ? 'Ultima Posizione' : new Date(loc.timestamp).toLocaleDateString()}</strong>
            <p style="margin: 4px 0 0; font-size: 0.9em;">${loc.description.substring(0, 60)}...</p>
          </div>
        `);
      markersLayerRef.current.addLayer(marker);
    });

    // Fly to latest location if available
    if (savedLocations.length > 0) {
        const latest = savedLocations[0];
        mapInstanceRef.current.flyTo([latest.coords.latitude, latest.coords.longitude], 16, {
            animate: true,
            duration: 1.5
        });
    }

  }, [savedLocations, isLeafletReady]);

  if (!isLeafletReady) {
      return (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
              Caricamento mappa...
          </div>
      )
  }

  return <div ref={mapRef} className="w-full h-full bg-gray-50" />;
};