import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-scroll-to-top',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './scroll-to-top.html',
  styleUrl: './scroll-to-top.css'
})
export class ScrollToTopComponent implements OnInit {
  showScrollButton = false; // Reset to false

  @HostListener('window:scroll', [])
  onWindowScroll() {
    // Show button when user scrolls beyond 103vh (103% of viewport height)
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const viewportHeight = window.innerHeight;
    const threshold = viewportHeight * 1.03; // 103vh
    
    this.showScrollButton = scrollPosition > threshold;
  }

  ngOnInit() {
    // Initial check for scroll position
    this.onWindowScroll();
  }

  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
} 