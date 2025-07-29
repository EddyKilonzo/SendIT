import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './components/shared/navbar/navbar';
import { Footer } from './components/shared/footer/footer';
import { Toast } from './components/shared/toast/toast';
import { ScrollToTopComponent } from './components/shared/scroll-to-top/scroll-to-top';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, NavbarComponent, Footer, Toast, ScrollToTopComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected title = 'frontend';
  protected showNavbar = true;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Listen to router events and scroll to top on navigation
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        // Smooth scroll to top with a slight delay to ensure DOM is ready
        setTimeout(() => {
          window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth'
          });
        }, 100);
        
        // Hide navbar on home page since we have a separate home navbar
        this.showNavbar = !['', '/', '/home'].includes(event.url);
      });
  }
}
