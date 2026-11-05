/**
 * Retrieves all focusable elements inside a given container,
 * filtering out disabled, hidden or non-tabbable elements.
 */
export function getFocusableElements(container: HTMLElement | null | undefined): HTMLElement[] {
  if (!container) return [];
  const selector =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const all = Array.from(container.querySelectorAll<HTMLElement>(selector));
  return all.filter((el) => {
    return !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true';
  });
}

/**
 * Handles Tab and Shift+Tab keydown events to trap focus inside a modal panel.
 */
export function handleFocusTrap(event: KeyboardEvent, container: HTMLElement | null | undefined): void {
  if (event.key !== 'Tab') return;
  const focusables = getFocusableElements(container);
  if (focusables.length === 0) {
    event.preventDefault();
    return;
  }

  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (event.shiftKey) {
    if (document.activeElement === first || document.activeElement === container) {
      event.preventDefault();
      last.focus();
    }
  } else {
    if (document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
