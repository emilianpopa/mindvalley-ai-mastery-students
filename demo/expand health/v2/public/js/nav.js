/**
 * Navigation JavaScript
 * Handles nav dropdown toggle for all pages
 */

// Initialize nav dropdown click toggle
function initNavDropdowns() {
  const dropdowns = document.querySelectorAll('.nav-dropdown');

  dropdowns.forEach(dropdown => {
    const trigger = dropdown.querySelector('.nav-dropdown-trigger');

    if (trigger) {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();

        // Close other dropdowns
        dropdowns.forEach(other => {
          if (other !== dropdown) {
            other.classList.remove('open');
          }
        });

        // Toggle this dropdown
        dropdown.classList.toggle('open');
      });
    }
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', () => {
    dropdowns.forEach(dropdown => {
      dropdown.classList.remove('open');
    });
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavDropdowns);
} else {
  initNavDropdowns();
}
