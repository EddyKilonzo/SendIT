import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private isOpenSubject = new BehaviorSubject<boolean>(false);
  public isOpen$ = this.isOpenSubject.asObservable();

  constructor() {}

  toggleSidebar(): void {
    this.isOpenSubject.next(!this.isOpenSubject.value);
  }

  openSidebar(): void {
    this.isOpenSubject.next(true);
  }

  closeSidebar(): void {
    this.isOpenSubject.next(false);
  }

  get isOpen(): boolean {
    return this.isOpenSubject.value;
  }
} 