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
  // Set today's date
  const today = new Date();
  document.getElementById('todayDate').textContent = today.toLocaleDateString('en-ZA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

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
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load stats');
    }

    const data = await response.json();

    // Update overview stats
    document.getElementById('totalSales').textContent = formatCurrency(data.overview.totalSales);
    document.getElementById('totalBookings').textContent = data.overview.totalBookings;
    document.getElementById('newCustomers').textContent = data.overview.newCustomers;
    document.getElementById('firstTimeVisitors').textContent = data.overview.firstTimeVisitors;
    document.getElementById('totalMembers').textContent = data.overview.totalMembers;

    // Update quick overview
    document.getElementById('completedCount').textContent = data.appointments.completed;
    document.getElementById('cancelledCount').textContent = data.appointments.cancelled;
    document.getElementById('noShowCount').textContent = data.appointments.noShows;
    document.getElementById('conversionRate').textContent = data.overview.conversionRate + '%';
    document.getElementById('paidCount').textContent = data.payments.paid;
    document.getElementById('unpaidCount').textContent = data.payments.unpaid;

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
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load sales chart');
    }

    const data = await response.json();
    renderSalesChart(data.data);

  } catch (error) {
    console.error('Error loading sales chart:', error);
  }
}

/**
 * Render sales chart using Chart.js
 */
function renderSalesChart(data) {
  const ctx = document.getElementById('salesChart').getContext('2d');

  // Destroy existing chart if any
  if (salesChart) {
    salesChart.destroy();
  }

  const labels = data.map(d => {
    const date = new Date(d.date);
    return date.toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric' });
  });

  const salesData = data.map(d => d.sales);
  const bookingsData = data.map(d => d.bookings);

  salesChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Sales (ZAR)',
          data: salesData,
          borderColor: '#0d9488',
          backgroundColor: 'rgba(13, 148, 136, 0.1)',
          fill: true,
          tension: 0.4,
          yAxisID: 'y'
        },
        {
          label: 'Bookings',
          data: bookingsData,
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          fill: false,
          tension: 0.4,
          yAxisID: 'y1'
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
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              if (context.datasetIndex === 0) {
                return 'Sales: ZAR ' + context.parsed.y.toLocaleString('en-ZA', { minimumFractionDigits: 2 });
              }
              return 'Bookings: ' + context.parsed.y;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Sales (ZAR)'
          },
          ticks: {
            callback: function(value) {
              return 'R ' + value.toLocaleString();
            }
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Bookings'
          },
          grid: {
            drawOnChartArea: false
          }
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

  try {
    const response = await fetch('/api/booking-dashboard/upcoming-appointments?limit=5', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load appointments');
    }

    const data = await response.json();

    if (data.appointments.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
      const dateStr = startTime.toLocaleDateString('en-ZA', { weekday: 'short', month: 'short', day: 'numeric' });
      const timeStr = startTime.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });

      const serviceColor = apt.service?.color || '#0d9488';
      const paymentClass = apt.paymentStatus === 'paid' ? 'paid' : 'unpaid';

      return `
        <div class="appointment-item" onclick="window.location.href='/appointments?id=${apt.id}'">
          <div class="appointment-time">
            <div class="appointment-date">${dateStr}</div>
            <div class="appointment-hour">${timeStr}</div>
            <div class="appointment-relative">${apt.relativeTime}</div>
          </div>
          <div class="appointment-details">
            <div class="appointment-service">
              <span class="service-dot" style="background: ${serviceColor}"></span>
              ${apt.title}
            </div>
            <div class="appointment-client">${apt.client?.name || 'No client'}</div>
            <div class="appointment-staff">${apt.staff?.name || 'Unassigned'}</div>
          </div>
          <div class="appointment-meta">
            <span class="appointment-status ${apt.status}">${apt.status}</span>
            ${apt.price ? `<span class="appointment-status ${paymentClass}">ZAR ${apt.price.toFixed(2)}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Error loading upcoming appointments:', error);
    container.innerHTML = '<div class="empty-state">Failed to load appointments</div>';
  }
}

/**
 * Load recent activity
 */
async function loadRecentActivity() {
  const container = document.getElementById('recentActivity');

  try {
    const response = await fetch('/api/booking-dashboard/recent-activity?limit=8', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load activity');
    }

    const data = await response.json();

    if (data.activities.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
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
          icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>';
          break;
        case 'cancelled':
          icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
          break;
        case 'completed':
          icon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
          break;
      }

      return `
        <div class="activity-item">
          <div class="activity-icon ${iconClass}">${icon}</div>
          <div class="activity-content">
            <div class="activity-description">${activity.description}</div>
            <div class="activity-time">${activity.relativeTime}</div>
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Error loading recent activity:', error);
    container.innerHTML = '<div class="empty-state">Failed to load activity</div>';
  }
}

/**
 * Load today's summary
 */
async function loadTodaySummary() {
  try {
    const response = await fetch('/api/booking-dashboard/today-summary', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load today summary');
    }

    const data = await response.json();

    document.getElementById('todayTotal').textContent = data.total;
    document.getElementById('todayCompleted').textContent = data.completed;
    document.getElementById('todayUpcoming').textContent = data.scheduled + data.confirmed;
    document.getElementById('todayRevenue').textContent = 'ZAR ' + formatCurrency(data.expectedRevenue);

  } catch (error) {
    console.error('Error loading today summary:', error);
  }
}

/**
 * Format currency
 */
function formatCurrency(value) {
  return value.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/**
 * Show error toast
 */
function showError(message) {
  // Simple console error for now - can be enhanced with toast notification
  console.error(message);
}
