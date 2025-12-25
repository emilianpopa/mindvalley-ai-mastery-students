/**
 * Feature Flags Module
 * Checks server-side feature flags and updates UI accordingly
 */

(function() {
  // Cache for feature flags
  let featureFlags = null;

  /**
   * Fetch feature flags from server
   */
  async function fetchFeatureFlags() {
    if (featureFlags !== null) {
      return featureFlags;
    }

    try {
      const response = await fetch('/api/features');
      if (response.ok) {
        featureFlags = await response.json();
      } else {
        // Default to disabled if can't fetch
        featureFlags = {
          enableBooking: false,
          enableSchedule: false
        };
      }
    } catch (error) {
      console.error('Error fetching feature flags:', error);
      featureFlags = {
        enableBooking: false,
        enableSchedule: false
      };
    }

    return featureFlags;
  }

  /**
   * Apply feature flags to the UI
   */
  async function applyFeatureFlags() {
    const flags = await fetchFeatureFlags();

    // Hide booking section if disabled
    if (!flags.enableBooking) {
      // Hide the BOOKING nav section
      const bookingSections = document.querySelectorAll('.nav-section');
      bookingSections.forEach(section => {
        const title = section.querySelector('.nav-section-title');
        if (title && title.textContent.trim() === 'BOOKING') {
          section.style.display = 'none';
        }
      });

      // Also hide any direct links to /schedule or /appointments in quick actions
      const scheduleLinks = document.querySelectorAll('a[href="/schedule"], a[href="/appointments"]');
      scheduleLinks.forEach(link => {
        // Check if it's in a quick actions grid
        const actionCard = link.closest('.action-card');
        if (actionCard) {
          actionCard.style.display = 'none';
        }
      });

      // Hide appointment-related stats from dashboard
      const appointmentStats = document.querySelectorAll('[id^="statToday"], [id^="statUpcoming"], [id^="statCompleted"], [id^="statTotal"]');
      appointmentStats.forEach(stat => {
        const card = stat.closest('.stat-card');
        if (card && (stat.id.includes('Appts') || stat.id.includes('Booking'))) {
          card.style.display = 'none';
        }
      });
    }
  }

  /**
   * Check if booking feature is enabled
   */
  async function isBookingEnabled() {
    const flags = await fetchFeatureFlags();
    return flags.enableBooking;
  }

  // Apply feature flags when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyFeatureFlags);
  } else {
    applyFeatureFlags();
  }

  // Expose to global scope
  window.featureFlags = {
    fetch: fetchFeatureFlags,
    apply: applyFeatureFlags,
    isBookingEnabled: isBookingEnabled
  };
})();
