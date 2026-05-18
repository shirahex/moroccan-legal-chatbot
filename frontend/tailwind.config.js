/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Enables class-based dark mode (e.g., <html class="dark">)
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Scans these files for Tailwind classes
  ],
  theme: {
    extend: { // Allows adding custom utilities or overriding existing ones
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'], // Default sans-serif font stack
        arabic: ['"Noto Naskh Arabic"', 'serif'], // Custom Arabic font family
      },
      colors: { // Custom color palette
        'brand-primary': '#1a365d',        // Example: Qanouni Dark Blue
        'brand-primary-light': '#2c4c7c',  // Lighter shade
        'brand-secondary': '#e9b949',      // Example: Qanouni Gold
        'brand-accent': '#c1554d',         // Example: Qanouni Red/Terracotta
        // For dark mode text/backgrounds, often defined directly with dark: prefix
        // e.g., bg-white dark:bg-gray-900
      },
      // You can extend other theme aspects like spacing, borderRadius, etc.
    },
  },
  plugins: [
    // require('@tailwindcss/forms'), // Removed for now to fix the error. Install if needed.
  ],
};