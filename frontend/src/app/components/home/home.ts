import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrls: ['./home.css']
})
export class HomeComponent implements OnInit, AfterViewInit {
  @ViewChild('partnershipsSection', { static: false }) partnershipsSection!: ElementRef;
  @ViewChild('processSection', { static: false }) processSection!: ElementRef;
  @ViewChild('featuresSection', { static: false }) featuresSection!: ElementRef;
  @ViewChild('servicesSection', { static: false }) servicesSection!: ElementRef;
  @ViewChild('globalNetworkSection', { static: false }) globalNetworkSection!: ElementRef;

  constructor(private router: Router) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.setupScrollAnimations();
  }

  private setupScrollAnimations(): void {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in-up');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    const sections = [
      this.partnershipsSection?.nativeElement,
      this.processSection?.nativeElement,
      this.featuresSection?.nativeElement,
      this.servicesSection?.nativeElement,
      this.globalNetworkSection?.nativeElement
    ].filter(Boolean);

    sections.forEach(section => {
      if (section) {
        observer.observe(section);
      }
    });
  }

  navigateToSignup(): void {
    this.router.navigate(['/signup']);
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }
}
