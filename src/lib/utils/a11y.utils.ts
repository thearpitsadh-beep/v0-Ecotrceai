/**
 * Accessibility utilities for WCAG 2.1 AA compliance
 */

/**
 * Generate unique IDs for accessibility attributes
 */
let idCounter = 0;

export function generateId(prefix = 'id'): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Keyboard event handlers
 */
export const KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  TAB: 'Tab',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
} as const;

/**
 * Check if a key event is for a specific key
 */
export function isKey(event: KeyboardEvent, key: (typeof KEYS)[keyof typeof KEYS]): boolean {
  return event.key === key;
}

/**
 * Check if Enter or Space was pressed
 */
export function isActivationKey(event: KeyboardEvent): boolean {
  return isKey(event, KEYS.ENTER) || isKey(event, KEYS.SPACE);
}

/**
 * Trap focus within an element
 */
export function trapFocus(container: HTMLElement, event: KeyboardEvent): void {
  if (!isKey(event, KEYS.TAB)) return;

  const focusableElements = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  if (focusableElements.length === 0) return;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.shiftKey && document.activeElement === firstElement) {
    lastElement.focus();
    event.preventDefault();
  } else if (!event.shiftKey && document.activeElement === lastElement) {
    firstElement.focus();
    event.preventDefault();
  }
}

/**
 * Announce messages to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.setAttribute('class', 'sr-only');
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after screen reader announces (typically 1 second)
  setTimeout(() => {
    announcement.remove();
  }, 1000);
}

/**
 * Focus management utilities
 */
export const focusManagement = {
  /**
   * Focus an element and optionally show focus ring
   */
  focus(element: HTMLElement | null): void {
    if (element) {
      element.focus();
      // Show focus indicator
      element.classList.add('focus-visible');
    }
  },

  /**
   * Restore focus to previously focused element
   */
  restoreFocus(previousElement: HTMLElement | null): void {
    if (previousElement && previousElement !== document.activeElement) {
      this.focus(previousElement);
    }
  },

  /**
   * Get the currently focused element
   */
  getCurrent(): HTMLElement | null {
    return document.activeElement instanceof HTMLElement ? document.activeElement : null;
  },
};

/**
 * Skip link utility
 */
export function createSkipLink(targetId: string, label: string = 'Skip to main content'): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = `#${targetId}`;
  link.textContent = label;
  link.className = 'sr-only focus:not-sr-only';
  return link;
}

/**
 * Validate color contrast (WCAG AA: 4.5:1 for normal text, 3:1 for large text)
 */
export function getContrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const getLuminance = (rgb: [number, number, number]): number => {
    const [r, g, b] = rgb.map((value) => {
      const v = value / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(rgb1);
  const l2 = getLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color contrast meets WCAG AA standards
 */
export function meetsContrastStandard(ratio: number, isLargeText = false): boolean {
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Scroll element into view with smooth behavior
 */
export function scrollIntoView(
  element: HTMLElement,
  options: ScrollIntoViewOptions = { behavior: 'smooth', block: 'center' }
): void {
  element.scrollIntoView(options);
}

/**
 * Create ARIA-compliant button from div
 */
export function makeButtonAccessible(
  element: HTMLElement,
  label?: string,
  ariaLabel?: string
): void {
  element.setAttribute('role', 'button');
  element.setAttribute('tabindex', '0');

  if (ariaLabel) {
    element.setAttribute('aria-label', ariaLabel);
  } else if (label) {
    element.textContent = label;
  }

  element.addEventListener('keydown', (event) => {
    if (isActivationKey(event)) {
      event.preventDefault();
      element.click();
    }
  });
}

/**
 * Text truncation with accessible tooltip
 */
export function truncateWithTooltip(
  text: string,
  maxLength: number,
  id?: string
): { truncated: string; tooltip: string; hasTooltip: boolean } {
  const truncated = text.length > maxLength ? `${text.substring(0, maxLength)}…` : text;
  const hasTooltip = text.length > maxLength;

  return {
    truncated,
    tooltip: hasTooltip ? text : '',
    hasTooltip,
  };
}
