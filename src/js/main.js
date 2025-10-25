// Main JavaScript for A2Agents website
// Handles interactions, form submission, and general functionality

document.addEventListener('DOMContentLoaded', () => {
  // Initialize all components
  initContactForm();
  initSmoothScroll();
  initDetailsAnimations();
  initScrollAnimations();
});

// Contact form handling
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    // Get the submit button for state management
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    // Update button state
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    submitBtn.classList.add('opacity-75');
    
    try {
      // TODO: Phase 2+ - Implement actual form submission
      // For now, just log and show success
      console.log('Form submission data:', data);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Show success state
      submitBtn.textContent = '✓ Message Sent!';
      submitBtn.classList.remove('bg-primary-600', 'hover:bg-primary-700');
      submitBtn.classList.add('bg-green-600');
      
      // Reset form
      form.reset();
      
      // Reset button after delay
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        submitBtn.classList.remove('opacity-75', 'bg-green-600');
        submitBtn.classList.add('bg-primary-600', 'hover:bg-primary-700');
      }, 3000);
      
    } catch (error) {
      console.error('Form submission error:', error);
      
      // Show error state
      submitBtn.textContent = 'Error - Please try again';
      submitBtn.classList.remove('bg-primary-600');
      submitBtn.classList.add('bg-red-600');
      
      // Reset button after delay
      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        submitBtn.classList.remove('opacity-75', 'bg-red-600');
        submitBtn.classList.add('bg-primary-600', 'hover:bg-primary-700');
      }, 3000);
    }
  });
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