import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  OnInit, 
  OnDestroy, 
  ElementRef, 
  ViewChild, 
  AfterViewInit,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { MapService } from '../../../services/map.service';
import { 
  MapLocation, 
  MapCoordinates, 
  MapConfig, 
  MapEvent, 
  MapError,
  MapMarkerType,
  MapMarkerConfig
} from '../../../types/map.types';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.css']
})
export class MapComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  
  @Input() height: string = '400px';
  @Input() width: string = '100%';
  @Input() center: MapCoordinates = { lat: -1.2921, lng: 36.8219 }; // Nairobi default
  @Input() zoom: number = 13;
  @Input() markers: MapLocation[] = [];
  @Input() markerTypes: MapMarkerType[] = [];
  @Input() showRoute: boolean = false;
  @Input() showControls: boolean = true;
  @Input() mapId: string = 'map-' + Math.random().toString(36).substring(7);
  @Input() config?: MapConfig;
  
  @Output() mapReady = new EventEmitter<L.Map>();
  @Output() markerClick = new EventEmitter<MapLocation>();
  @Output() mapClick = new EventEmitter<MapCoordinates>();
  @Output() mapErrorEvent = new EventEmitter<MapError>();
  @Output() routeUpdated = new EventEmitter<{ distance: number; estimatedTime: number }>();
  
  private map: L.Map | null = null;
  private mapMarkers: L.Marker[] = [];
  private routePolyline: L.Polyline | null = null;
  private isMapInitialized = false;
  
  public isFullscreen = false;
  public isLoading = false;
  public mapError: MapError | null = null;

  constructor(private mapService: MapService) {}

  ngOnInit(): void {
    // Component initialization
  }

  ngAfterViewInit(): void {
    this.initializeMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.isMapInitialized && this.map) {
      if (changes['markers'] || changes['markerTypes']) {
        this.updateMarkers();
      }
      if (changes['center'] || changes['zoom']) {
        this.updateMapView();
      }
      if (changes['showRoute']) {
        this.updateRoute();
      }
    }
  }

  ngOnDestroy(): void {
    this.destroyMap();
  }
  // Initialize the map with provided configuration
  private async initializeMap(): Promise<void> {
    try {
      this.isLoading = true;
      this.mapError = null;

      if (!this.mapContainer) {
        throw new Error('Map container not found');
      }

      // Apply configuration if provided
      const mapConfig = this.config;
      const center = mapConfig?.center || this.center;
      const zoom = mapConfig?.zoom || this.zoom;

      this.map = this.mapService.createMap(this.mapId, center, zoom);
      
      // Add event listeners
      this.map.on('click', (e: L.LeafletMouseEvent) => {
        this.mapClick.emit({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      // Add markers if provided
      if (this.markers.length > 0) {
        this.addMarkers();
      }

      // Create route if requested and there are at least 2 markers
      if (this.showRoute && this.markers.length >= 2) {
        this.createRoute();
      }

      this.isMapInitialized = true;
      this.mapReady.emit(this.map);
      
    } catch (error) {
      this.handleMapError('MAP_INITIALIZATION_FAILED', 'Failed to initialize map', error);
    } finally {
      this.isLoading = false;
    }
  }
  // Add markers to the map
  private addMarkers(): void {
    if (!this.map) return;

    try {
      // Clear existing markers
      this.clearMarkers();

      this.mapMarkers = this.markers.map((location, index) => {
        const markerConfig: MapMarkerConfig = {
          type: this.getMarkerType(index),
          location,
          popupContent: location.description
        };

        const marker = this.mapService.createCustomMarker(markerConfig);
        
        marker.on('click', () => {
          this.markerClick.emit(location);
        });
        
        marker.addTo(this.map!);
        return marker;
      });

      // Fit map to show all markers
      if (this.mapMarkers.length > 1) {
        this.mapService.fitMapToMarkers(this.map, this.mapMarkers);
      }
    } catch (error) {
      this.handleMapError('MARKER_ADDITION_FAILED', 'Failed to add markers to map', error);
    }
  }
  // Get marker type based on index or provided types
  private getMarkerType(index: number): MapMarkerType {
    // Use provided marker types if available, otherwise fall back to default logic
    if (this.markerTypes && this.markerTypes[index]) {
      return this.markerTypes[index];
    }
    
    if (this.markers.length === 2) {
      return index === 0 ? MapMarkerType.PICKUP : MapMarkerType.DELIVERY;
    }
    return MapMarkerType.CURRENT;
  }
  // Create a route based on the markers
  private createRoute(): void {
    if (!this.map || this.markers.length < 2) return;

    try {
      // Clear existing route
      if (this.routePolyline) {
        this.map.removeLayer(this.routePolyline);
        this.routePolyline = null;
      }

      const waypoints = this.markers.map(marker => ({ lat: marker.lat, lng: marker.lng }));
      this.routePolyline = this.mapService.createRoute(this.map, waypoints);

      // Calculate and emit route information
      const routeInfo = this.mapService.calculateRouteInfo(waypoints);
      this.routeUpdated.emit({
        distance: routeInfo.distance,
        estimatedTime: routeInfo.estimatedTime
      });

    } catch (error) {
      this.handleMapError('ROUTE_CREATION_FAILED', 'Failed to create route', error);
    }
  }
  // Update markers based on input changes
  private updateMarkers(): void {
    if (this.isMapInitialized) {
      this.addMarkers();
    }
  }
  // Update map view based on center and zoom
  private updateMapView(): void {
    if (this.map) {
      this.map.setView([this.center.lat, this.center.lng], this.zoom);
    }
  }
  // Update route if showRoute is enabled and markers are sufficient  
  private updateRoute(): void {
    if (this.showRoute && this.markers.length >= 2) {
      this.createRoute();
    } else if (this.routePolyline && this.map) {
      this.map.removeLayer(this.routePolyline);
      this.routePolyline = null;
    }
  }

  private clearMarkers(): void {
    if (this.map) {
      this.mapService.clearMarkers(this.map, this.mapMarkers);
      this.mapMarkers = [];
    }
  }

  /**
   * Toggle fullscreen mode for the map.
   * This will also trigger a resize to ensure the map displays correctly.
   */
  public toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
    
    // Trigger map resize after animation
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 300);
  }
  /**
   * Toggle the visibility of the route polyline on the map.
   * If the route is already displayed, it will be removed; otherwise, it will be added.
   */
  public toggleRoute(): void {
    if (this.routePolyline && this.map) {
      if (this.map.hasLayer(this.routePolyline)) {
        this.map.removeLayer(this.routePolyline);
      } else {
        this.routePolyline.addTo(this.map);
      }
    }
  }
  /**
   * Retry loading the map in case of an error.
   * This will reset the error state and reinitialize the map.
   */
  public retryMapLoad(): void {
    this.mapError = null;
    this.initializeMap();
  }
  /**
   * Add a custom marker to the map at the specified location.
   * This can be used to add markers dynamically after the map has been initialized.
   * @param location The location where the marker should be added.
   */
  public addMarker(location: MapLocation): void {
    if (this.map) {
      try {
        const marker = this.mapService.createCustomMarker({
          type: MapMarkerType.CURRENT,
          location
        });
        
        marker.addTo(this.map);
        this.mapMarkers.push(marker);
      } catch (error) {
        this.handleMapError('MARKER_ADDITION_FAILED', 'Failed to add marker', error);
      }
    }
  }
  // Update the list of markers displayed on the map.
  public updateMarkersList(newMarkers: MapLocation[]): void {
    this.markers = newMarkers;
    this.updateMarkers();
  }

  public getMap(): L.Map | null {
    return this.map;
  }
  /**
   * Fit the map view to the current markers.
   * This will adjust the map's bounds to ensure all markers are visible.
   */
  public fitToMarkers(): void {
    if (this.map && this.mapMarkers.length > 0) {
      this.mapService.fitMapToMarkers(this.map, this.mapMarkers);
    }
  }
  /**
   * Handle errors that occur during map operations.
   * This will emit an error event and log the error to the console.
   * @param code Error code for identification
   * @param message User-friendly error message
   * @param error Optional detailed error object
   */
  private handleMapError(code: string, message: string, error?: unknown): void {
    this.mapError = {
      code,
      message,
      details: error
    };
    
    this.mapErrorEvent.emit(this.mapError);
    console.error('Map error:', this.mapError);
  }

  private destroyMap(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.isMapInitialized = false;
  }
} 