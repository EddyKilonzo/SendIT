import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignedParcels } from './assigned-parcels';

describe('AssignedParcels', () => {
  let component: AssignedParcels;
  let fixture: ComponentFixture<AssignedParcels>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignedParcels]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssignedParcels);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
