// Map-related TypeScript interfaces and types

export interface MapCoordinates {
  lat: number;
  lng: number;
}

export interface MapLocation extends MapCoordinates {
  address?: string;
  description?: string;
  id?: string;
}

export interface AddressSuggestion {
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
}

export interface RouteInfo {
  distance: number; // in kilometers
  estimatedTime: number; // in minutes
  waypoints: MapCoordinates[];
}

export interface MapError {
  code: string;
  message: string;
  details?: unknown;
}

export interface GeocodingResult {
  success: boolean;
  location?: MapLocation;
  error?: MapError;
}

export interface MapConfig {
  center: MapCoordinates;
  zoom: number;
  height: string;
  width: string;
  showControls?: boolean;
  showRoute?: boolean;
}

export interface MapMarker {
  location: MapLocation;
  icon?: string;
  popup?: string;
  color?: string;
}

export interface MapEvent {
  type: 'click' | 'marker-click' | 'route-update';
  coordinates?: MapCoordinates;
  location?: MapLocation;
  data?: unknown;
}

export enum MapMarkerType {
  PICKUP = 'pickup',
  DELIVERY = 'delivery',
  CURRENT = 'current',
  DRIVER = 'driver'
}

export interface MapMarkerConfig {
  type: MapMarkerType;
  location: MapLocation;
  color?: string;
  icon?: string;
  popupContent?: string;
}

export interface AddressValidationResult {
  isValid: boolean;
  suggestions?: AddressSuggestion[];
  error?: MapError;
}

export interface ReverseGeocodingResult {
  success: boolean;
  address?: string;
  error?: MapError;
} 