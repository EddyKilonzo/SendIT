import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { AssignDriver } from './assign-driver';
import { ToastService } from '../../../shared/toast/toast.service';

describe('AssignDriver', () => {
  let component: AssignDriver;
  let fixture: ComponentFixture<AssignDriver>;
  let toastService: jasmine.SpyObj<ToastService>;

  beforeEach(async () => {
    const toastServiceSpy = jasmine.createSpyObj('ToastService', ['showSuccess', 'showError', 'showInfo']);

    await TestBed.configureTestingModule({
      imports: [AssignDriver, ReactiveFormsModule],
      providers: [
        { provide: ToastService, useValue: toastServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AssignDriver);
    component = fixture.componentInstance;
    toastService = TestBed.inject(ToastService) as jasmine.SpyObj<ToastService>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load available drivers on init', () => {
    expect(component.availableDrivers.length).toBeGreaterThan(0);
    expect(component.filteredDrivers.length).toBeGreaterThan(0);
  });

  it('should filter drivers based on vehicle type', () => {
    component.assignForm.patchValue({ vehicleType: 'Van' });
    component.applyFilters();
    
    const vanDrivers = component.filteredDrivers.filter(driver => driver.vehicleType === 'Van');
    expect(component.filteredDrivers.length).toBe(vanDrivers.length);
  });

  it('should select a driver when clicked', () => {
    const driver = component.availableDrivers[0];
    component.selectDriver(driver);
    
    expect(driver.isSelected).toBe(true);
    expect(component.selectedDriver).toBe(driver);
  });

  it('should emit driver assignment event', () => {
    spyOn(component.driverAssigned, 'emit');
    const driver = component.availableDrivers[0];
    component.parcelDetails = {
      id: '12345',
      pickupAddress: '123 Maple Street, Anytown',
      deliveryAddress: '456 Oak Avenue, Anytown',
      weight: 5.5,
      price: 550.00
    };
    
    component.selectDriver(driver);
    component.assignDriver();
    
    expect(component.driverAssigned.emit).toHaveBeenCalledWith({
      parcelId: '12345',
      driverId: driver.id
    });
  });

  it('should show error when no driver is selected', () => {
    component.assignDriver();
    expect(toastService.showError).toHaveBeenCalledWith('Please select a driver first.');
  });

  it('should show error when no parcel details are available', () => {
    const driver = component.availableDrivers[0];
    component.selectDriver(driver);
    component.parcelDetails = null;
    
    component.assignDriver();
    expect(toastService.showError).toHaveBeenCalledWith('No parcel details available.');
  });
}); 