import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DriverDashboard } from './driver-dashboard';

describe('DriverDashboard', () => {
  let component: DriverDashboard;
  let fixture: ComponentFixture<DriverDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriverDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DriverDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
