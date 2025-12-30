/**
 * Navigation JavaScript
 * Handles nav dropdown positioning for all pages
 */

// Initialize nav dropdown positioning
function initNavDropdowns() {
  const dropdowns = document.querySelectorAll('.nav-dropdown');

  dropdowns.forEach(dropdown => {
    const trigger = dropdown.querySelector('.nav-dropdown-trigger');
    const menu = dropdown.querySelector('.nav-dropdown-menu');

    if (trigger && menu) {
      // Position menu on hover
      const positionMenu = () => {
        const triggerRect = trigger.getBoundingClientRect();
        menu.style.top = triggerRect.top + 'px';
      };

      // Use mouseover for immediate response before CSS :hover kicks in
      trigger.addEventListener('mouseover', positionMenu);

      // Also position when menu itself is hovered (for bridge area)
      menu.addEventListener('mouseover', positionMenu);

      // Initial position call
      positionMenu();
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavDropdowns);
} else {
  initNavDropdowns();
}
