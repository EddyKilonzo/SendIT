import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageParcels } from './manage-parcels';

describe('ManageParcels', () => {
  let component: ManageParcels;
  let fixture: ComponentFixture<ManageParcels>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageParcels]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageParcels);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
