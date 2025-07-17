import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderConfirmation } from './order-confirmation';

describe('OrderConfirmation', () => {
  let component: OrderConfirmation;
  let fixture: ComponentFixture<OrderConfirmation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderConfirmation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderConfirmation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
