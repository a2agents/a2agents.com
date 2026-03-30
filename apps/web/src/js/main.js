// Main JavaScript for A2Agents website
// Handles interactions, form submission, and general functionality

document.addEventListener('DOMContentLoaded', () => {
  // Initialize all components
  initSmoothScroll();
  initDetailsAnimations();
  initIntakeTransition();
  initStickyBookingCta();
  // Temporarily disable scroll animations causing content to disappear
  // initScrollAnimations();
});

function initIntakeTransition() {
  const links = document.querySelectorAll('a[data-intake-cta]');
  if (!links.length) return;

  links.forEach((link) => {
    link.addEventListener('click', (event) => {
      const href = link.getAttribute('href');
      if (!href) return;
      event.preventDefault();

      if (typeof document.startViewTransition === 'function') {
        document.startViewTransition(() => {
          window.location.assign(href);
        });
        return;
      }

      document.body.classList.add('page-transition-out');
      setTimeout(() => {
        window.location.assign(href);
      }, 160);
    });
  });
}

function initStickyBookingCta() {
  const stickyCta = document.getElementById('sticky-booking-cta');
  if (!stickyCta) return;

  const shouldShowStickyCta = () => {
    const pageOffset = window.scrollY || window.pageYOffset || 0;
    const viewportHeight = window.innerHeight || 0;
    const pageHeight = document.documentElement.scrollHeight || 0;
    const nearFooter = pageOffset + viewportHeight >= pageHeight - 240;
    const show = pageOffset > 280 && !nearFooter;

    stickyCta.classList.toggle('is-visible', show);
    stickyCta.setAttribute('aria-hidden', show ? 'false' : 'true');
  };

  shouldShowStickyCta();
  window.addEventListener('scroll', shouldShowStickyCta, { passive: true });
  window.addEventListener('resize', shouldShowStickyCta);
}

// Smooth scroll enhancement for anchor links
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      
      const target = document.querySelector(targetId);
      if (!target) return;
      
      e.preventDefault();
      
      // Calculate offset for better positioning
      const offset = 100; // Adjust based on any fixed headers
      const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
      
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    });
  });
}

// Enhance details/summary animations
function initDetailsAnimations() {
  const details = document.querySelectorAll('details');
  
  details.forEach(detail => {
    const summary = detail.querySelector('summary');
    const content = detail.querySelector('summary ~ *');
    
    if (!summary || !content) return;
    
    // Add smooth height animation
    detail.addEventListener('toggle', () => {
      if (detail.open) {
        // Opening animation
        content.style.opacity = '0';
        content.style.transform = 'translateY(-10px)';
        
        requestAnimationFrame(() => {
          content.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
          content.style.opacity = '1';
          content.style.transform = 'translateY(0)';
        });
      }
    });
  });
}

// Scroll-based animations
function initScrollAnimations() {
  // Create Intersection Observer for fade-in animations
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-slide-up');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);
  
  // Observe all cards and sections that should animate
  const animateElements = document.querySelectorAll('.card, section > div > h2');
  animateElements.forEach(el => {
    el.style.opacity = '0';
    observer.observe(el);
  });
}

// Utility function for debouncing
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Add parallax effect to hero section (subtle)
function initParallax() {
  const hero = document.querySelector('section:first-of-type');
  if (!hero) return;
  
  const handleScroll = debounce(() => {
    const scrolled = window.pageYOffset;
    const rate = scrolled * -0.5;
    
    if (Math.abs(rate) < window.innerHeight) {
      hero.style.transform = `translateY(${rate}px)`;
    }
  }, 10);
  
  window.addEventListener('scroll', handleScroll);
}

// Initialize parallax if user prefers reduced motion is not set
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  initParallax();
}

// Log that main.js loaded successfully
console.log('A2Agents site initialized');
