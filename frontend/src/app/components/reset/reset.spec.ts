import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Reset } from './reset';

describe('Reset', () => {
  let component: Reset;
  let fixture: ComponentFixture<Reset>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Reset]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Reset);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
