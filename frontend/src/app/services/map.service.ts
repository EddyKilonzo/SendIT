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
  private readonly GEOCODING_TIMEOUT = 10000; // 10 seconds
  private readonly MAX_GEOCODING_RETRIES = 3;

  constructor() {
    this.initializeLeafletIcons();
  }

  /**
   * Initialize Leaflet default icons to fix marker display issues
   */
  private initializeLeafletIcons(): void {
    // Fix for default markers in Leaflet
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
    
    // Also set up fallback icons for different marker types
    this.setupCustomIcons();
  }

  private customIcons: { [key: string]: L.Icon | L.DivIcon } = {};

  private setupCustomIcons(): void {
    // Create custom icons for different marker types
    const createCustomIcon = (color: string) => {
      return L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${color}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
    };

    // Store custom icons for different types
    this.customIcons = {
      pickup: createCustomIcon('#28a745'),
      delivery: createCustomIcon('#dc3545'),
      current: createCustomIcon('#007bff'),
      driver: createCustomIcon('#ffc107')
    };
  }

  /**
   * Create a basic map instance with error handling
   */
  createMap(containerId: string, center?: MapCoordinates, zoom?: number): L.Map {
    try {
      const mapCenter = center || this.DEFAULT_CENTER;
      const mapZoom = zoom || this.DEFAULT_ZOOM;
      
      const map = L.map(containerId).setView([mapCenter.lat, mapCenter.lng], mapZoom);
      
      // Add OpenStreetMap tiles with error handling
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
        minZoom: 1
      }).addTo(map);

      return map;
    } catch (error) {
      throw this.createMapError('MAP_CREATION_FAILED', 'Failed to create map instance', error);
    }
  }

  /**
   * Add a marker to the map with proper error handling
   */
  addMarker(map: L.Map, location: MapLocation, options?: L.MarkerOptions): L.Marker {
    try {
      if (!this.isValidCoordinates(location)) {
        throw new Error('Invalid coordinates provided');
      }

      const marker = L.marker([location.lat, location.lng], options).addTo(map);
      
      if (location.description) {
        marker.bindPopup(location.description);
      }
      
      return marker;
    } catch (error) {
      throw this.createMapError('MARKER_ADDITION_FAILED', 'Failed to add marker to map', error);
    }
  }

  /**
   * Add multiple markers to the map
   */
  addMarkers(map: L.Map, locations: MapLocation[]): L.Marker[] {
    try {
      return locations.map(location => this.addMarker(map, location));
    } catch (error) {
      throw this.createMapError('MULTIPLE_MARKERS_FAILED', 'Failed to add multiple markers', error);
    }
  }

  /**
   * Create a custom marker with specific styling
   */
  createCustomMarker(config: MapMarkerConfig): L.Marker {
    try {
      if (!this.isValidCoordinates(config.location)) {
        throw new Error('Invalid coordinates provided');
      }

      // Use custom icon if available, otherwise fall back to default
      let icon: L.Icon | L.DivIcon;
      
      if (this.customIcons[config.type]) {
        icon = this.customIcons[config.type];
      } else {
        icon = this.createCustomIcon(config);
      }

      const marker = L.marker([config.location.lat, config.location.lng], { icon });
      
      if (config.popupContent) {
        marker.bindPopup(config.popupContent);
      }
      
      return marker;
    } catch (error) {
      throw this.createMapError('CUSTOM_MARKER_FAILED', 'Failed to create custom marker', error);
    }
  }

  /**
   * Create custom icon for different marker types
   */
  private createCustomIcon(config: MapMarkerConfig): L.Icon {
    const colors = {
      [MapMarkerType.PICKUP]: '#28a745',
      [MapMarkerType.DELIVERY]: '#dc3545',
      [MapMarkerType.CURRENT]: '#007bff',
      [MapMarkerType.DRIVER]: '#ffc107'
    };

    const color = config.color || colors[config.type] || '#007bff';
    const iconText = this.getMarkerText(config.type);

    // Create marker element
    const markerElement = document.createElement('div');
    markerElement.className = 'custom-marker-element';
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

  private getMarkerText(type: MapMarkerType): string {
    switch (type) {
      case MapMarkerType.PICKUP: return 'P';
      case MapMarkerType.DELIVERY: return 'D';
      case MapMarkerType.CURRENT: return 'C';
      case MapMarkerType.DRIVER: return 'D';
      default: return '•';
    }
  }

  /**
   * Geocode an address to coordinates with retry logic and error handling
   */
  async geocodeAddress(address: string, retryCount = 0): Promise<GeocodingResult> {
    try {
      if (!address || address.trim().length < 3) {
        return {
          success: false,
          error: this.createMapError('INVALID_ADDRESS', 'Address must be at least 3 characters long')
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.GEOCODING_TIMEOUT);

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
        return {
          success: true,
          location: {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            address: result.display_name
          }
        };
      }

      return {
        success: false,
        error: this.createMapError('ADDRESS_NOT_FOUND', `No coordinates found for address: ${address}`)
      };

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: this.createMapError('GEOCODING_TIMEOUT', 'Geocoding request timed out')
        };
      }

      if (retryCount < this.MAX_GEOCODING_RETRIES) {
        // Retry with exponential backoff
        await this.delay(Math.pow(2, retryCount) * 1000);
        return this.geocodeAddress(address, retryCount + 1);
      }

      return {
        success: false,
        error: this.createMapError('GEOCODING_FAILED', 'Failed to geocode address', error)
      };
    }
  }

  /**
   * Reverse geocode coordinates to address with improved precision
   */
  async reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodingResult> {
    try {
      if (!this.isValidCoordinates({ lat, lng })) {
        return {
          success: false,
          error: this.createMapError('INVALID_COORDINATES', 'Invalid coordinates provided')
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.GEOCODING_TIMEOUT);

      // Use more detailed reverse geocoding parameters
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&extratags=1`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

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
        error: this.createMapError('REVERSE_GEOCODING_FAILED', 'No address found for coordinates')
      };

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: this.createMapError('REVERSE_GEOCODING_TIMEOUT', 'Reverse geocoding request timed out')
        };
      }

      return {
        success: false,
        error: this.createMapError('REVERSE_GEOCODING_FAILED', 'Failed to reverse geocode coordinates', error)
      };
    }
  }

  /**
   * Get address suggestions for autocomplete
   */
  async getAddressSuggestions(query: string): Promise<AddressValidationResult> {
    try {
      if (!query || query.trim().length < 2) {
        return {
          isValid: false,
          suggestions: []
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.GEOCODING_TIMEOUT);

      // Add headers to prevent CORS issues and specify user agent
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query.trim())}&limit=5&countrycodes=ke&addressdetails=1`,
        { 
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'SendIT-Delivery-App/1.0'
          }
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const suggestions: AddressSuggestion[] = await response.json();

      // Filter and enhance suggestions
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
      console.error('Address suggestions error:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          isValid: false,
          error: this.createMapError('SUGGESTIONS_TIMEOUT', 'Address suggestions request timed out')
        };
      }

      // Return fallback suggestions for common locations in Kenya
      const fallbackSuggestions = this.getFallbackSuggestions(query);
      
      return {
        isValid: fallbackSuggestions.length > 0,
        suggestions: fallbackSuggestions,
        error: this.createMapError('SUGGESTIONS_FAILED', 'Using fallback suggestions due to API error', error)
      };
    }
  }

  private getFallbackSuggestions(query: string): AddressSuggestion[] {
    const queryLower = query.toLowerCase();
    const kenyaLocations = [
      {
        display_name: 'Nairobi, Kenya',
        name: 'Nairobi',
        lat: '-1.2921',
        lon: '36.8219',
        type: 'city',
        importance: 0.9
      },
      {
        display_name: 'Mombasa, Kenya',
        name: 'Mombasa',
        lat: '-4.0435',
        lon: '39.6682',
        type: 'city',
        importance: 0.8
      },
      {
        display_name: 'Kisumu, Kenya',
        name: 'Kisumu',
        lat: '-0.1022',
        lon: '34.7617',
        type: 'city',
        importance: 0.7
      },
      {
        display_name: 'Nakuru, Kenya',
        name: 'Nakuru',
        lat: '-0.3031',
        lon: '36.0800',
        type: 'city',
        importance: 0.6
      },
      {
        display_name: 'Eldoret, Kenya',
        name: 'Eldoret',
        lat: '0.5204',
        lon: '35.2699',
        type: 'city',
        importance: 0.5
      }
    ];

    return kenyaLocations
      .filter(location => 
        location.name.toLowerCase().includes(queryLower) ||
        location.display_name.toLowerCase().includes(queryLower)
      )
      .slice(0, 3);
  }



  /**
   * Calculate distance between two points using Haversine formula
   */
  calculateDistance(point1: MapCoordinates, point2: MapCoordinates): number {
    try {
      if (!this.isValidCoordinates(point1) || !this.isValidCoordinates(point2)) {
        throw new Error('Invalid coordinates provided');
      }

      const R = 6371; // Earth's radius in kilometers
      const dLat = this.deg2rad(point2.lat - point1.lat);
      const dLng = this.deg2rad(point2.lng - point1.lng);
      
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(this.deg2rad(point1.lat)) * Math.cos(this.deg2rad(point2.lat)) * 
        Math.sin(dLng/2) * Math.sin(dLng/2);
      
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      return Math.round(distance * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      throw this.createMapError('DISTANCE_CALCULATION_FAILED', 'Failed to calculate distance', error);
    }
  }

  /**
   * Calculate route information between multiple points
   */
  calculateRouteInfo(waypoints: MapCoordinates[]): RouteInfo {
    try {
      if (waypoints.length < 2) {
        throw new Error('At least 2 waypoints required for route calculation');
      }

      let totalDistance = 0;
      
      for (let i = 0; i < waypoints.length - 1; i++) {
        totalDistance += this.calculateDistance(waypoints[i], waypoints[i + 1]);
      }

      // Estimate delivery time (assuming average speed of 30 km/h in city)
      const estimatedTime = Math.round((totalDistance / 30) * 60); // in minutes

      return {
        distance: totalDistance,
        estimatedTime,
        waypoints
      };
    } catch (error) {
      throw this.createMapError('ROUTE_CALCULATION_FAILED', 'Failed to calculate route information', error);
    }
  }

  /**
   * Create a route between points (basic polyline implementation)
   */
  createRoute(map: L.Map, waypoints: MapCoordinates[], options?: { color?: string; weight?: number }): L.Polyline {
    try {
      if (waypoints.length < 2) {
        throw new Error('At least 2 waypoints required for route creation');
      }

      const polyline = L.polyline(
        waypoints.map(wp => [wp.lat, wp.lng]),
        {
          color: options?.color || '#007bff',
          weight: options?.weight || 4,
          opacity: 0.7
        }
      ).addTo(map);

      // Fit map to show the route
      map.fitBounds(polyline.getBounds().pad(0.1));

      return polyline;
    } catch (error) {
      throw this.createMapError('ROUTE_CREATION_FAILED', 'Failed to create route on map', error);
    }
  }

  /**
   * Validate coordinates
   */
  private isValidCoordinates(coords: MapCoordinates): boolean {
    return (
      typeof coords.lat === 'number' &&
      typeof coords.lng === 'number' &&
      coords.lat >= -90 && coords.lat <= 90 &&
      coords.lng >= -180 && coords.lng <= 180
    );
  }

  /**
   * Convert degrees to radians
   */
  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Create a standardized map error
   */
  private createMapError(code: string, message: string, details?: unknown): MapError {
    return {
      code,
      message,
      details
    };
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear all markers from map
   */
  clearMarkers(map: L.Map, markers: L.Marker[]): void {
    try {
      markers.forEach(marker => {
        if (map.hasLayer(marker)) {
          map.removeLayer(marker);
        }
      });
    } catch (error) {
      console.error('Error clearing markers:', error);
    }
  }

  /**
   * Fit map to show all markers
   */
  fitMapToMarkers(map: L.Map, markers: L.Marker[]): void {
    try {
      if (markers.length > 0) {
        const group = new L.FeatureGroup(markers);
        map.fitBounds(group.getBounds().pad(0.1));
      }
    } catch (error) {
      console.error('Error fitting map to markers:', error);
    }
  }


} 