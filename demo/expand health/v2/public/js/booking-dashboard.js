/**
 * Booking Dashboard JavaScript
 * Momence-style dashboard with sales stats, appointments, and activity
 */

// Chart.js instance
let salesChart = null;

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', () => {
  initializeDashboard();
});

async function initializeDashboard() {
  // Load all dashboard data in parallel
  await Promise.all([
    loadDashboardStats(),
    loadSalesChart(),
    loadUpcomingAppointments(),
    loadRecentActivity(),
    loadTodaySummary()
  ]);
}

/**
 * Load main dashboard stats
 */
async function loadDashboardStats() {
  try {
    const response = await fetch('/api/booking-dashboard/stats', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load stats');
    }

    const data = await response.json();

    // Update stats bar pills
    document.getElementById('totalSales').textContent = formatCurrency(data.overview.totalSales);
    document.getElementById('totalBookings').textContent = data.overview.totalBookings;
    document.getElementById('newCustomers').textContent = data.overview.newCustomers;
    document.getElementById('firstTimeVisitors').textContent = data.overview.firstTimeVisitors;

    // Update quick stats
    document.getElementById('completedCount').textContent = data.appointments.completed;
    document.getElementById('cancelledCount').textContent = data.appointments.cancelled;
    document.getElementById('noShowCount').textContent = data.appointments.noShows;

  } catch (error) {
    console.error('Error loading dashboard stats:', error);
    showError('Failed to load dashboard stats');
  }
}

/**
 * Load sales chart data
 */
async function loadSalesChart() {
  try {
    const response = await fetch('/api/booking-dashboard/sales-chart?days=7', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load sales chart');
    }

    const data = await response.json();
    renderSalesChart(data.data);

    // Calculate total sales for the header
    const totalSales = data.data.reduce((sum, d) => sum + d.sales, 0);
    const salesTotalEl = document.getElementById('salesTotal');
    if (salesTotalEl) {
      salesTotalEl.textContent = formatCurrency(totalSales);
    }

    // Calculate week-over-week change (mock for now)
    const changeEl = document.getElementById('salesChange');
    if (changeEl) {
      const change = Math.round((Math.random() * 20) - 5); // Mock: -5% to +15%
      const isPositive = change >= 0;
      changeEl.className = `sales-change ${isPositive ? 'positive' : 'negative'}`;
      changeEl.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
          <polyline points="${isPositive ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}"></polyline>
        </svg>
        <span>${Math.abs(change)}%</span>
      `;
    }

  } catch (error) {
    console.error('Error loading sales chart:', error);
  }
}

/**
 * Render sales chart using Chart.js
 */
function renderSalesChart(data) {
  const canvas = document.getElementById('salesChart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  // Destroy existing chart if any
  if (salesChart) {
    salesChart.destroy();
  }

  const labels = data.map(d => {
    const date = new Date(d.date);
    return date.toLocaleDateString('en-ZA', { weekday: 'short' });
  });

  const salesData = data.map(d => d.sales);

  // Create gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(13, 148, 136, 0.3)');
  gradient.addColorStop(1, 'rgba(13, 148, 136, 0.02)');

  salesChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Sales',
          data: salesData,
          borderColor: '#0d9488',
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#0d9488',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#1e293b',
          titleColor: '#f8fafc',
          bodyColor: '#f8fafc',
          padding: 12,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            title: function(context) {
              return context[0].label;
            },
            label: function(context) {
              return 'R ' + context.parsed.y.toLocaleString('en-ZA', { minimumFractionDigits: 2 });
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#94a3b8',
            font: {
              size: 11
            }
          }
        },
        y: {
          display: false,
          beginAtZero: true
        }
      }
    }
  });
}

/**
 * Load upcoming appointments
 */
async function loadUpcomingAppointments() {
  const container = document.getElementById('upcomingAppointments');
  if (!container) return;

  try {
    const response = await fetch('/api/booking-dashboard/upcoming-appointments?limit=5', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load appointments');
    }

    const data = await response.json();

    if (data.appointments.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <p>No upcoming appointments</p>
        </div>
      `;
      return;
    }

    container.innerHTML = data.appointments.map(apt => {
      const startTime = new Date(apt.startTime);
      const dayStr = startTime.toLocaleDateString('en-ZA', { weekday: 'short' });
      const timeStr = startTime.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
      const serviceColor = apt.service?.color || '#0d9488';
      const paymentClass = apt.paymentStatus === 'paid' ? 'paid' : 'unpaid';

      return `
        <div class="appointment-item" onclick="window.location.href='/appointments?id=${apt.id}'">
          <div class="appointment-time-block">
            <div class="appointment-day">${dayStr}</div>
            <div class="appointment-time">${timeStr}</div>
            <div class="appointment-relative">${apt.relativeTime || ''}</div>
          </div>
          <div class="appointment-info">
            <div class="appointment-service">
              <span class="service-dot" style="background: ${serviceColor}"></span>
              <span class="appointment-title">${apt.title}</span>
            </div>
            <div class="appointment-client">${apt.client?.name || 'No client'}</div>
            <div class="appointment-staff">${apt.staff?.name || 'Unassigned'}</div>
          </div>
          <div class="appointment-meta">
            <span class="appointment-badge ${apt.status}">${apt.status}</span>
            ${apt.price ? `<span class="appointment-price">R ${apt.price.toFixed(2)}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Error loading upcoming appointments:', error);
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p>Failed to load appointments</p>
      </div>
    `;
  }
}

/**
 * Load recent activity
 */
async function loadRecentActivity() {
  const container = document.getElementById('recentActivity');
  if (!container) return;

  try {
    const response = await fetch('/api/booking-dashboard/recent-activity?limit=6', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load activity');
    }

    const data = await response.json();

    if (data.activities.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <p>No recent activity</p>
        </div>
      `;
      return;
    }

    container.innerHTML = data.activities.map(activity => {
      let icon = '';
      let iconClass = activity.type;

      switch (activity.type) {
        case 'booked':
          icon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"></path></svg>';
          break;
        case 'cancelled':
          icon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
          break;
        case 'completed':
          icon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
          break;
        case 'payment':
          icon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>';
          break;
        default:
          icon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle></svg>';
      }

      return `
        <div class="activity-item">
          <div class="activity-icon ${iconClass}">${icon}</div>
          <div class="activity-content">
            <div class="activity-text">${activity.description}</div>
            <div class="activity-timestamp">${activity.relativeTime}</div>
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Error loading recent activity:', error);
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p>Failed to load activity</p>
      </div>
    `;
  }
}

/**
 * Load today's summary
 */
async function loadTodaySummary() {
  try {
    const response = await fetch('/api/booking-dashboard/today-summary', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load today summary');
    }

    const data = await response.json();

    const totalEl = document.getElementById('todayTotal');
    const completedEl = document.getElementById('todayCompleted');
    const upcomingEl = document.getElementById('todayUpcoming');
    const revenueEl = document.getElementById('todayRevenue');

    if (totalEl) totalEl.textContent = data.total;
    if (completedEl) completedEl.textContent = data.completed;
    if (upcomingEl) upcomingEl.textContent = data.scheduled + data.confirmed;
    if (revenueEl) revenueEl.textContent = 'R ' + formatCurrency(data.expectedRevenue);

  } catch (error) {
    console.error('Error loading today summary:', error);
  }
}

/**
 * Format currency
 */
function formatCurrency(value) {
  if (typeof value !== 'number') value = 0;
  return value.toLocaleString('en-ZA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

/**
 * Show error toast
 */
function showError(message) {
  console.error(message);
}
