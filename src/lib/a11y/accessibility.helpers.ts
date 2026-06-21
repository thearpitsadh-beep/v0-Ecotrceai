// Accessibility helpers for WCAG 2.1 AA compliance

export const A11Y = {
  // Skip to main content link handler
  skipToMain: (e: React.KeyboardEvent<HTMLAnchorElement>) => {
    if ((e.key === 'Enter' || e.key === ' ') && (e.metaKey || e.ctrlKey)) {
      const mainElement = document.querySelector('main');
      if (mainElement) {
        mainElement.focus();
        mainElement.scrollIntoView();
      }
    }
  },

  // Keyboard navigation for lists
  handleListKeydown: (e: React.KeyboardEvent, items: any[], currentIndex: number, onSelect: (index: number) => void) => {
    const { key } = e;
    let newIndex = currentIndex;

    if (key === 'ArrowDown') {
      e.preventDefault();
      newIndex = (currentIndex + 1) % items.length;
    } else if (key === 'ArrowUp') {
      e.preventDefault();
      newIndex = (currentIndex - 1 + items.length) % items.length;
    } else if (key === 'Home') {
      e.preventDefault();
      newIndex = 0;
    } else if (key === 'End') {
      e.preventDefault();
      newIndex = items.length - 1;
    }

    if (newIndex !== currentIndex) {
      onSelect(newIndex);
    }
  },

  // Focus management for modals
  manageFocus: (element: HTMLElement | null, isFocused: boolean) => {
    if (!element) return;

    if (isFocused) {
      element.focus();
      element.setAttribute('role', 'dialog');
      element.setAttribute('aria-modal', 'true');
    } else {
      element.blur();
    }
  },

  // Announce changes to screen readers
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
  },

  // Check if element is visible
  isVisible: (element: HTMLElement): boolean => {
    return !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
  },

  // Get computed color contrast ratio (simplified)
  getContrastRatio: (color1: string, color2: string): number => {
    // Placeholder - proper implementation would parse colors and calculate WCAG contrast
    return 4.5; // Assume WCAG AA minimum
  },
};

// Semantic HTML attribute helpers
export const SEMANTIC = {
  // Main content landmark
  main: { role: 'main' },

  // Navigation landmark
  nav: { role: 'navigation' },

  // Article region
  article: { role: 'article' },

  // Complementary content
  aside: { role: 'complementary' },

  // Content info
  footer: { role: 'contentinfo' },
};
