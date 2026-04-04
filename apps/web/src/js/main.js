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

// Parallax and scroll-driven animations
function initParallax() {
  const sections = document.querySelectorAll('section');
  const hero = document.querySelector('section:first-of-type');
  const heroContent = hero ? hero.querySelector('div') : null;

  // Elements that fade/slide in on scroll
  const revealEls = document.querySelectorAll(
    '.grid > div, details, blockquote, article, .contact-section > *, .contact-section .headshot'
  );
  revealEls.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(32px)';
    el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
  });

  // Section headings parallax — they move slightly slower than scroll
  const headings = document.querySelectorAll('section h2');

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const scrollY = window.scrollY;
      const vh = window.innerHeight;

      // Hero: content fades out and drifts up as you scroll past
      if (heroContent) {
        const progress = Math.min(scrollY / (vh * 0.6), 1);
        heroContent.style.opacity = 1 - progress;
        heroContent.style.transform = `translateY(${scrollY * -0.3}px)`;
      }

      // Section headings: subtle parallax drift
      headings.forEach(h => {
        const rect = h.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const offset = (center - vh / 2) * 0.06;
        h.style.transform = `translateY(${offset}px)`;
      });

      // Reveal elements when they enter viewport
      revealEls.forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < vh * 0.88) {
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
        }
      });

      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // initial check
}

// Initialize parallax if user prefers reduced motion is not set
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  initParallax();
}

// Log that main.js loaded successfully
console.log('A2Agents site initialized');
