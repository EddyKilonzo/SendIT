import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { 
  MapLocation, 
  MapCoordinates, 
  AddressSuggestion, 
  RouteInfo, 
  MapError, 
  GeocodingResult, 
  ReverseGeocodingResult,
  AddressValidationResult,
  MapMarkerType,
  MapMarkerConfig
} from '../types/map.types';

@Injectable({
  providedIn: 'root'
})
export class MapService {
  private readonly DEFAULT_CENTER: MapCoordinates = { lat: -1.2921, lng: 36.8219 }; // Nairobi
  private readonly DEFAULT_ZOOM = 13;
  private geocodingCache = new Map<string, GeocodingResult>();

  constructor() {
    this.initializeLeafletIcons();
  }

  private initializeLeafletIcons(): void {
    const iconRetinaUrl = 'assets/marker-icon-2x.png';
    const iconUrl = 'assets/marker-icon.png';
    const shadowUrl = 'assets/marker-shadow.png';
    
    const iconDefault = L.icon({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      tooltipAnchor: [16, -28],
      shadowSize: [41, 41]
    });
    
    L.Marker.prototype.options.icon = iconDefault;
  }
  /**
   * Creates a Leaflet map instance.
   * @param containerId The ID of the HTML element to contain the map.
   * @param center The initial center coordinates of the map.
   * @param zoom The initial zoom level of the map.
   * @returns The created Leaflet map instance.
   */
  createMap(containerId: string, center?: MapCoordinates, zoom?: number): L.Map {
    try {
      const mapCenter = center || this.DEFAULT_CENTER;
      const mapZoom = zoom || this.DEFAULT_ZOOM;
      
      console.log(`🗺️ Creating map in container: ${containerId}`);
      console.log(`📍 Center: ${mapCenter.lat}, ${mapCenter.lng}, Zoom: ${mapZoom}`);
      
      const map = L.map(containerId).setView([mapCenter.lat, mapCenter.lng], mapZoom);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        // attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
        minZoom: 1
      }).addTo(map);

      console.log('✅ Map created successfully');
      return map;
    } catch (error) {
      console.error('❌ Error creating map:', error);
      throw error;
    }
  }
  /**
   * Creates a custom marker with a colored icon based on the type.
   * @param config Configuration for the marker including type, location, and optional popup content.
   * @returns A Leaflet marker with the custom icon.
   */
  createCustomMarker(config: MapMarkerConfig): L.Marker {
    // Create custom colored marker based on type
    console.log('🎯 Creating marker with config:', {
      type: config.type,
      location: config.location,
      color: config.color
    });
    
    const icon = this.createCustomIcon(config);
    const marker = L.marker([config.location.lat, config.location.lng], { icon });
    
    if (config.popupContent) {
      marker.bindPopup(config.popupContent);
    }
    
    return marker;
  }
  /**
   * Creates a custom icon for the marker based on the type and optional color.
   * @param config Configuration for the marker including type and optional color.
   * @returns A Leaflet icon with custom styles.
   */
  private createCustomIcon(config: MapMarkerConfig): L.Icon {
    const colors = {
      [MapMarkerType.PICKUP]: '#28a745',    // Green for pickup
      [MapMarkerType.DELIVERY]: '#dc3545',  // Red for delivery
      [MapMarkerType.CURRENT]: '#007bff',   // Blue for current location
      [MapMarkerType.DRIVER]: '#6f42c1'     // Purple for driver
    };

    const color = config.color || colors[config.type] || '#007bff';
    const iconText = this.getMarkerText(config.type);

    console.log('🎨 Creating icon with:', {
      type: config.type,
      color: color,
      iconText: iconText
    });

    // Create marker element
    const markerElement = document.createElement('div');
    markerElement.className = 'custom-marker-element';
    markerElement.setAttribute('data-type', config.type);
    markerElement.textContent = iconText;
    markerElement.style.cssText = `
      background-color: ${color};
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
    `;

    // Add hover effect
    markerElement.addEventListener('mouseenter', () => {
      markerElement.style.transform = 'scale(1.1)';
      markerElement.style.boxShadow = '0 4px 8px rgba(0,0,0,0.4)';
    });

    markerElement.addEventListener('mouseleave', () => {
      markerElement.style.transform = 'scale(1)';
      markerElement.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
    });

    return L.divIcon({
      className: 'custom-marker',
      html: markerElement.outerHTML,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    }) as L.Icon;
  }
  /**
   * Returns a single character text representation for the marker type.
   * @param type The type of the marker.
   * @returns A single character string representing the marker type.
   */
  private getMarkerText(type: MapMarkerType): string {
    switch (type) {
      case MapMarkerType.PICKUP: return 'P';
      case MapMarkerType.DELIVERY: return 'D';
      case MapMarkerType.CURRENT: return 'C';
      case MapMarkerType.DRIVER: return '🚗';
      default: return '•';
    }
  }
  /**
   *  Geocodes an address to get its latitude and longitude.
   * @param address The address to geocode.
   * @returns A promise that resolves to the geocoding result.
   */
  async geocodeAddress(address: string): Promise<GeocodingResult> {
    try {
      if (!address || address.trim().length < 3) {
        return {
          success: false,
          error: { code: 'INVALID_ADDRESS', message: 'Address must be at least 3 characters long' }
        };
      }

      // Check cache first
      const cachedResult = this.geocodingCache.get(address);
      if (cachedResult) {
        console.log(`💾 Using cached geocoding result for: ${address}`);
        return cachedResult;
      }

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      try {
        // Use Nominatim API for geocoding
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address.trim())}&limit=1&countrycodes=ke`,
          { signal: controller.signal }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data && data.length > 0) {
          const result = data[0];
          const geocodingResult: GeocodingResult = {
            success: true,
            location: {
              lat: parseFloat(result.lat),
              lng: parseFloat(result.lon),
              address: result.display_name
            }
          };
          this.geocodingCache.set(address, geocodingResult);
          return geocodingResult;
        }

        const geocodingResult: GeocodingResult = {
          success: false,
          error: { code: 'ADDRESS_NOT_FOUND', message: `No coordinates found for address: ${address}` }
        };
        this.geocodingCache.set(address, geocodingResult);
        return geocodingResult;

      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          return {
            success: false,
            error: { code: 'TIMEOUT', message: 'Geocoding request timed out' }
          };
        }
        throw error;
      }

    } catch (error) {
      return {
        success: false,
        error: { code: 'GEOCODING_FAILED', message: 'Failed to geocode address', details: error }
      };
    }
  }
  /**
   * Reverse geocodes coordinates to get the address.
   * @param lat Latitude of the location.
   * @param lng Longitude of the location.
   * @returns A promise that resolves to the reverse geocoding result.
   */
  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodingResult> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data && data.display_name) {
        return {
          success: true,
          address: data.display_name
        };
      }

      return {
        success: false,
        error: { code: 'REVERSE_GEOCODING_FAILED', message: 'No address found for coordinates' }
      };

    } catch (error) {
      return {
        success: false,
        error: { code: 'REVERSE_GEOCODING_FAILED', message: 'Failed to reverse geocode coordinates', details: error }
      };
    }
  }
  /**
   * Gets address suggestions based on a query.
   * @param query The search query for address suggestions.
   * @returns A promise that resolves to the address validation result with suggestions.
   */
  async getAddressSuggestions(query: string): Promise<AddressValidationResult> {
    try {
      if (!query || query.trim().length < 2) {
        return {
          isValid: false,
          suggestions: []
        };
      }
      // API call to get address suggestions
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}&limit=5&countrycodes=ke&addressdetails=1`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const suggestions: AddressSuggestion[] = await response.json();

      const enhancedSuggestions = suggestions
        .filter(suggestion => suggestion.display_name && suggestion.lat && suggestion.lon)
        .map(suggestion => ({
          ...suggestion,
          name: suggestion.name || suggestion.display_name.split(',')[0] || 'Unknown Location'
        }))
        .slice(0, 5);

      return {
        isValid: enhancedSuggestions.length > 0,
        suggestions: enhancedSuggestions
      };

    } catch (error) {
      return {
        isValid: false,
        suggestions: [],
        error: { code: 'SUGGESTIONS_FAILED', message: 'Failed to get address suggestions', details: error }
      };
    }
  }
  /**
   * Creates a route on the map based on the provided waypoints.
   * @param map The Leaflet map instance.
   * @param waypoints The array of coordinates for the route.
   * @param options Optional styling options for the route.
   * @returns The created polyline representing the route.
   */
  createRoute(map: L.Map, waypoints: MapCoordinates[], options?: { color?: string; weight?: number }): L.Polyline {
    const polyline = L.polyline(
      waypoints.map(wp => [wp.lat, wp.lng]),
      {
        color: options?.color || '#007bff',
        weight: options?.weight || 4,
        opacity: 0.7
      }
    ).addTo(map);

    return polyline;
  }
  /**
   * Calculates route information such as distance and estimated time.
   * @param waypoints The array of coordinates for the route.
   * @returns An object containing the route information.
   */
  calculateRouteInfo(waypoints: MapCoordinates[]): RouteInfo {
    let totalDistance = 0;
    
    for (let i = 0; i < waypoints.length - 1; i++) {
      totalDistance += this.calculateDistance(waypoints[i], waypoints[i + 1]);
    }

    // Calculate realistic delivery time based on distance
    // For urban delivery, consider traffic, stops, and delivery time
    let estimatedTime: number;
    
    if (totalDistance <= 5) {
      // Local delivery (within 5km): 15-30 minutes
      estimatedTime = Math.max(15, Math.round(totalDistance * 4));
    } else if (totalDistance <= 15) {
      // City delivery (5-15km): 30-90 minutes
      estimatedTime = Math.max(30, Math.round(totalDistance * 3));
    } else if (totalDistance <= 50) {
      // Regional delivery (15-50km): 1-3 hours
      estimatedTime = Math.max(60, Math.round(totalDistance * 2.5));
    } else {
      // Long distance (50km+): 3+ hours
      estimatedTime = Math.max(180, Math.round(totalDistance * 2));
    }
    
    // Add buffer time for pickup and delivery stops
    estimatedTime += 10;

    return {
      distance: totalDistance,
      estimatedTime,
      waypoints
    };
  }
  /**
   * Calculates the distance between two geographical points using the Haversine formula.
   * @param point1 The first point with latitude and longitude.
   * @param point2 The second point with latitude and longitude.
   * @returns The distance in kilometers, rounded to two decimal places.
   */
  calculateDistance(point1: MapCoordinates, point2: MapCoordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(point2.lat - point1.lat);
    const dLng = this.deg2rad(point2.lng - point1.lng);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(point1.lat)) * Math.cos(this.deg2rad(point2.lat)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
  /**
   * Clears markers from the map.
   * @param map The Leaflet map instance.
   * @param markers The array of markers to remove.
   */
  clearMarkers(map: L.Map, markers: L.Marker[]): void {
    markers.forEach(marker => {
      if (map.hasLayer(marker)) {
        map.removeLayer(marker);
      }
    });
  }
  /**
   * Fits the map view to the bounds of the provided markers.
   * @param map The Leaflet map instance.
   * @param markers The array of markers to fit the map to.
   */
  fitMapToMarkers(map: L.Map, markers: L.Marker[]): void {
    if (markers.length > 0) {
      try {
        // Ensure map is properly rendered
        map.invalidateSize();
        
        // Wait a bit for the map to be fully rendered
        setTimeout(() => {
          if (map && markers.length > 0) {
            const group = new L.FeatureGroup(markers);
            const bounds = group.getBounds();
            
            // Check if bounds are valid
            if (bounds.isValid()) {
              // Add padding and fit bounds
              const paddedBounds = bounds.pad(0.1);
              map.fitBounds(paddedBounds, {
                maxZoom: 16, // Prevent excessive zoom
                animate: true,
                duration: 0.5
              });
            } else {
              // Fallback: fit to first marker with some zoom
              const firstMarker = markers[0];
              if (firstMarker) {
                map.setView(firstMarker.getLatLng(), 13, {
                  animate: true,
                  duration: 0.5
                });
              }
            }
          }
        }, 100); // Increased delay for better rendering
      } catch (error) {
        console.error('Error fitting map to markers:', error);
        // Fallback: fit to first marker
        if (markers.length > 0) {
          const firstMarker = markers[0];
          if (firstMarker) {
            map.setView(firstMarker.getLatLng(), 13, {
              animate: true,
              duration: 0.5
            });
          }
        }
      }
    }
  }
  /**
   * Clears the geocoding cache.
   */
  clearGeocodingCache(): void {
    this.geocodingCache.clear();
    console.log('🗑️ Geocoding cache cleared');
  }

  /**
   * Gets the current cache size for debugging purposes.
   */
  getCacheSize(): number {
    return this.geocodingCache.size;
  }
} 