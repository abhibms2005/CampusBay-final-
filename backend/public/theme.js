/**
 * Theme Manager for CampusBay
 * Handles dark mode toggle and persistence
 */

class ThemeManager {
    constructor() {
        this.theme = this.getStoredTheme() || 'light';
        this.init();
    }

    init() {
        // Apply theme on load
        this.applyTheme(this.theme);

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!this.getStoredTheme()) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    getStoredTheme() {
        return localStorage.getItem('campusbay-theme');
    }

    setStoredTheme(theme) {
        localStorage.setItem('campusbay-theme', theme);
        this.theme = theme;
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.theme = theme;

        // Update toggle button if it exists
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            toggleBtn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
            toggleBtn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
        }
    }

    setTheme(theme) {
        this.setStoredTheme(theme);
        this.applyTheme(theme);
    }

    toggle() {
        const newTheme = this.theme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }
}

// Create global instance
const themeManager = new ThemeManager();
