import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';

import { CreateDelivery } from './create-delivery';

describe('CreateDelivery', () => {
  let component: CreateDelivery;
  let fixture: ComponentFixture<CreateDelivery>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateDelivery, ReactiveFormsModule, RouterTestingModule]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CreateDelivery);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with an empty form', () => {
    expect(component.deliveryForm).toBeTruthy();
    expect(component.deliveryForm.get('senderName')?.value).toBe('');
    expect(component.deliveryForm.get('recipientName')?.value).toBe('');
  });

  it('should validate required fields', () => {
    const form = component.deliveryForm;
    expect(form.valid).toBeFalsy();
    
    // Fill required fields
    form.patchValue({
      senderName: 'John Doe',
      senderAddress: '123 Main St',
      senderContact: '+1234567890',
      senderEmail: 'john@example.com',
      recipientName: 'Jane Doe',
      recipientAddress: '456 Oak St',
      recipientContact: '+0987654321',
      recipientEmail: 'jane@example.com',
      pickupLocation: 'Downtown',
      destination: 'Uptown',
      parcelWeight: 5,
      pricePerKg: 10
    });
    
    expect(form.valid).toBeTruthy();
  });
});
