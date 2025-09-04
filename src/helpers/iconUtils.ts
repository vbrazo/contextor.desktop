// ============================================================================
// ICON UTILITIES
// ============================================================================

/**
 * Creates a default SVG icon buffer for the application tray
 * @returns Buffer containing SVG icon data
 */
export function createDefaultIcon(): Buffer {
  return Buffer.from(`
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="#FF2D55"/>
      <path d="M16 8v16M8 16h16" stroke="white" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `);
}

/**
 * Creates a custom SVG icon with specified colors
 * @param backgroundColor - Background color for the circle
 * @param strokeColor - Color for the cross stroke
 * @returns Buffer containing custom SVG icon data
 */
export function createCustomIcon(backgroundColor: string = "#FF2D55", strokeColor: string = "white"): Buffer {
  return Buffer.from(`
    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="14" fill="${backgroundColor}"/>
      <path d="M16 8v16M8 16h16" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `);
} 