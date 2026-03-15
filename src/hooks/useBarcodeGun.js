import { useEffect, useRef } from 'react';

/**
 * useBarcodeGun
 * Detects input from a USB/HID barcode gun (keyboard-emulation mode).
 *
 * Barcode guns type characters very quickly (< 50 ms between keystrokes)
 * and end with an Enter key. This hook buffers keystrokes and fires
 * `onScan(barcode)` when a valid scan is detected.
 *
 * @param {function} onScan  - called with the scanned barcode string
 * @param {boolean}  enabled - set false to pause listening (e.g. when a modal is open)
 * @param {number}   minLen  - minimum barcode length (default 4)
 * @param {number}   timeout - max ms between keystrokes to count as a scan (default 80)
 */
export function useBarcodeGun({ onScan, enabled = true, minLen = 4, timeout = 80 }) {
  const bufferRef   = useRef('');
  const lastKeyRef  = useRef(0);
  const timerRef    = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const flush = () => {
      const code = bufferRef.current.trim();
      bufferRef.current = '';
      if (code.length >= minLen) onScan(code);
    };

    const handleKeyDown = (e) => {
      // Ignore if the user is typing in a text/number/search input
      const tag = e.target?.tagName?.toLowerCase();
      const type = e.target?.type?.toLowerCase();
      const isInput = (tag === 'input' && !['button','submit','reset','checkbox','radio'].includes(type))
                    || tag === 'textarea';

      const now = Date.now();
      const gap = now - lastKeyRef.current;

      // If Enter and we have a buffer — that's the end of a barcode scan
      if (e.key === 'Enter' && bufferRef.current.length >= minLen) {
        e.preventDefault();
        e.stopPropagation();
        clearTimeout(timerRef.current);
        flush();
        return;
      }

      // If the key arrived quickly enough to be a barcode gun (even inside an input)
      if (gap < timeout) {
        if (e.key.length === 1) {           // printable character
          bufferRef.current += e.key;
          lastKeyRef.current = now;
          // Reset auto-flush timer
          clearTimeout(timerRef.current);
          timerRef.current = setTimeout(flush, timeout + 20);
        }
        return;
      }

      // Regular (slow) keystroke — ignore if in an input field, else start/clear buffer
      if (isInput) {
        bufferRef.current = '';             // user typing manually — don't accumulate
        lastKeyRef.current = now;
        return;
      }

      // Outside inputs: start accumulating
      if (e.key.length === 1) {
        bufferRef.current = e.key;
        lastKeyRef.current = now;
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(flush, timeout + 20);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      clearTimeout(timerRef.current);
      bufferRef.current = '';
    };
  }, [enabled, onScan, minLen, timeout]);
}
