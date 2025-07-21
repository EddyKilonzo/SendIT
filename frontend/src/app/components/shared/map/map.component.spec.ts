import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapComponent } from './map.component';
import { MapService } from '../../../services/map.service';
import { MapLocation } from '../../../types/map.types';

describe('MapComponent', () => {
  let component: MapComponent;
  let fixture: ComponentFixture<MapComponent>;
  let mapService: jasmine.SpyObj<MapService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('MapService', ['createMap', 'addMarker', 'createCustomMarker']);
    
    await TestBed.configureTestingModule({
      imports: [MapComponent],
      providers: [
        { provide: MapService, useValue: spy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MapComponent);
    component = fixture.componentInstance;
    mapService = TestBed.inject(MapService) as jasmine.SpyObj<MapService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default properties', () => {
    expect(component.height).toBe('400px');
    expect(component.width).toBe('100%');
    expect(component.zoom).toBe(13);
    expect(component.showControls).toBe(true);
    expect(component.markers).toEqual([]);
  });

  it('should emit mapReady event when map is initialized', () => {
    spyOn(component.mapReady, 'emit');
    const mockMap = {} as any;
    mapService.createMap.and.returnValue(mockMap);
    
    component.ngAfterViewInit();
    
    expect(component.mapReady.emit).toHaveBeenCalledWith(mockMap);
  });

  it('should handle marker clicks', () => {
    spyOn(component.markerClick, 'emit');
    const mockLocation: MapLocation = { lat: 0, lng: 0 };
    
    component.onMarkerClick(mockLocation);
    
    expect(component.markerClick.emit).toHaveBeenCalledWith(mockLocation);
  });

  it('should handle map clicks', () => {
    spyOn(component.mapClick, 'emit');
    const mockCoordinates = { lat: 0, lng: 0 };
    
    component.onMapClick(mockCoordinates);
    
    expect(component.mapClick.emit).toHaveBeenCalledWith(mockCoordinates);
  });

  it('should toggle fullscreen mode', () => {
    expect(component.isFullscreen).toBe(false);
    
    component.toggleFullscreen();
    
    expect(component.isFullscreen).toBe(true);
    
    component.toggleFullscreen();
    
    expect(component.isFullscreen).toBe(false);
  });
}); 