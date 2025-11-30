import React, { useEffect, useRef, useState } from 'react';
import { SavedLocation } from '../types';

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

    // Filter valid locations for initial center
    const validLocations = savedLocations.filter(l => 
        l.coords && 
        !isNaN(Number(l.coords.latitude)) && 
        !isNaN(Number(l.coords.longitude))
    );

    const hasHistory = validLocations.length > 0;
    
    // Default center (Rome) or first saved location
    let defaultCenter = [41.9028, 12.4964]; // Rome
    if (hasHistory) {
        defaultCenter = [validLocations[0].coords.latitude, validLocations[0].coords.longitude];
    }

    const defaultZoom = hasHistory ? 15 : 6;

    try {
        mapInstanceRef.current = L.map(mapRef.current).setView(defaultCenter, defaultZoom);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(mapInstanceRef.current);

        markersLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);
        
        // Fix for grey tiles when map container is resized or hidden initially
        // This is crucial when opening in a modal
        setTimeout(() => {
            mapInstanceRef.current?.invalidateSize();
        }, 200);

    } catch (e) {
        console.error("Error initializing map", e);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isLeafletReady]); // Only run once when leaflet is ready

  // Update Markers and Center when savedLocations changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    // Always invalidate size when data changes (implies visibility might have changed)
    mapInstanceRef.current.invalidateSize();

    markersLayerRef.current.clearLayers();

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

    // Filter valid locations specifically to prevent NaN errors
    const validLocations = savedLocations.filter(l => 
        l.coords && 
        typeof l.coords.latitude === 'number' && !isNaN(l.coords.latitude) &&
        typeof l.coords.longitude === 'number' && !isNaN(l.coords.longitude)
    );

    validLocations.forEach((loc, index) => {
      const isLatest = index === 0;
      const markerIcon = isLatest ? redIcon : blueIcon;
      const zIndex = isLatest ? 1000 : 0;

      const marker = L.marker([loc.coords.latitude, loc.coords.longitude], { 
          icon: markerIcon,
          zIndexOffset: zIndex
      })
        .bindPopup(`
          <div style="font-family: sans-serif;">
            <strong style="color: ${isLatest ? '#DC2626' : '#2563EB'};">${isLatest ? 'Ultima Posizione' : 'Posizione Salvata'}</strong>
            <br/>
            <span style="font-size: 0.85em; color: #555;">${new Date(loc.timestamp).toLocaleString()}</span>
            <br/>
            <span style="font-size: 0.8em; color: #777;">Lat: ${loc.coords.latitude.toFixed(5)}, Lon: ${loc.coords.longitude.toFixed(5)}</span>
          </div>
        `);
      markersLayerRef.current.addLayer(marker);
    });

    if (validLocations.length > 0) {
        const latest = validLocations[0];
        mapInstanceRef.current.setView([latest.coords.latitude, latest.coords.longitude], 16);
    }

  }, [savedLocations, isLeafletReady]);

  if (!isLeafletReady) {
      return (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
              Inizializzazione mappa...
          </div>
      )
  }

  return <div ref={mapRef} className="w-full h-full bg-gray-50 z-10" />;
};