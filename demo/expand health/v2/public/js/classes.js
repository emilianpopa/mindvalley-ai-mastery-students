/**
 * Classes Module
 * Handles class scheduling, management, and display
 */

(function() {
  // State
  let currentView = 'schedule';
  let currentWeekStart = getWeekStart(new Date());
  let classes = [];
  let classTypes = [];

  // DOM Elements
  const scheduleView = document.getElementById('scheduleView');
  const listView = document.getElementById('listView');
  const typesView = document.getElementById('typesView');
  const calendarBody = document.getElementById('calendarBody');
  const classesList = document.getElementById('classesList');
  const classTypesGrid = document.getElementById('classTypesGrid');
  const weekDisplay = document.getElementById('weekDisplay');
  const createClassModal = document.getElementById('createClassModal');

  // Initialize
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    loadClasses();
    loadClassTypes();
    renderCalendar();
    setupEventListeners();
    updateWeekDisplay();
  }

  function setupEventListeners() {
    // View tabs
    document.querySelectorAll('.view-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        switchView(e.target.dataset.view);
      });
    });

    // Week navigation
    document.getElementById('prevWeekBtn')?.addEventListener('click', () => navigateWeek(-1));
    document.getElementById('nextWeekBtn')?.addEventListener('click', () => navigateWeek(1));
    document.getElementById('todayBtn')?.addEventListener('click', goToToday);

    // Create class
    document.getElementById('createClassBtn')?.addEventListener('click', openCreateModal);
    document.getElementById('closeCreateModal')?.addEventListener('click', closeCreateModal);
    document.getElementById('cancelCreateBtn')?.addEventListener('click', closeCreateModal);
    document.getElementById('saveClassBtn')?.addEventListener('click', saveClass);

    // Modal overlay
    document.querySelector('#createClassModal .modal-overlay')?.addEventListener('click', closeCreateModal);

    // Recurring checkbox
    document.getElementById('classRecurring')?.addEventListener('change', (e) => {
      document.getElementById('recurringOptions')?.classList.toggle('hidden', !e.target.checked);
    });
  }

  // View switching
  function switchView(view) {
    currentView = view;

    scheduleView?.classList.toggle('hidden', view !== 'schedule');
    listView?.classList.toggle('hidden', view !== 'list');
    typesView?.classList.toggle('hidden', view !== 'types');

    if (view === 'list') {
      renderClassesList();
    } else if (view === 'types') {
      renderClassTypes();
    }
  }

  // Week navigation
  function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  function navigateWeek(direction) {
    currentWeekStart.setDate(currentWeekStart.getDate() + (direction * 7));
    updateWeekDisplay();
    renderCalendar();
  }

  function goToToday() {
    currentWeekStart = getWeekStart(new Date());
    updateWeekDisplay();
    renderCalendar();
  }

  function updateWeekDisplay() {
    const endDate = new Date(currentWeekStart);
    endDate.setDate(endDate.getDate() + 6);

    const options = { month: 'long', day: 'numeric' };
    const startStr = currentWeekStart.toLocaleDateString('en-US', options);
    const endStr = endDate.toLocaleDateString('en-US', { ...options, year: 'numeric' });

    if (weekDisplay) {
      weekDisplay.textContent = `${startStr} - ${endStr}`;
    }

    // Update calendar header
    updateCalendarHeader();
  }

  function updateCalendarHeader() {
    const dayColumns = document.querySelectorAll('.calendar-header .day-column');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    dayColumns.forEach((col, index) => {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + index);

      const dayDate = col.querySelector('.day-date');
      if (dayDate) {
        dayDate.textContent = date.getDate();
      }

      // Highlight today
      const isToday = date.getTime() === today.getTime();
      col.classList.toggle('today', isToday);
    });
  }

  // Calendar rendering
  function renderCalendar() {
    if (!calendarBody) return;

    // Generate time slots (6 AM to 9 PM)
    const hours = [];
    for (let h = 6; h <= 21; h++) {
      hours.push(h);
    }

    let html = '';

    hours.forEach((hour, rowIndex) => {
      // Time column
      const timeStr = hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
      html += `<div class="time-slot">${timeStr}</div>`;

      // Day slots
      for (let day = 0; day < 7; day++) {
        const slotDate = new Date(currentWeekStart);
        slotDate.setDate(slotDate.getDate() + day);
        slotDate.setHours(hour, 0, 0, 0);

        const slotClasses = getClassesForSlot(slotDate);

        html += `<div class="day-slot" data-date="${slotDate.toISOString()}" data-hour="${hour}">`;

        slotClasses.forEach(cls => {
          const topOffset = ((cls.startHour - hour) + (cls.startMinute / 60)) * 60;
          const height = cls.duration;

          html += `
            <div class="class-event ${cls.type}" style="top: ${topOffset}px; height: ${height}px;"
                 data-id="${cls.id}" onclick="viewClass(${cls.id})">
              <div class="class-event-title">${cls.name}</div>
              <div class="class-event-time">${formatTime(cls.startHour, cls.startMinute)}</div>
              <div class="class-event-spots">${cls.enrolled}/${cls.capacity} spots</div>
            </div>
          `;
        });

        html += '</div>';
      }
    });

    calendarBody.innerHTML = html;
  }

  function getClassesForSlot(slotDate) {
    const slotDay = slotDate.getDay();
    const slotHour = slotDate.getHours();

    return classes.filter(cls => {
      const clsDate = new Date(cls.date);
      return clsDate.getDay() === slotDay && cls.startHour === slotHour;
    });
  }

  // List view rendering
  function renderClassesList() {
    if (!classesList) return;

    const sortedClasses = [...classes].sort((a, b) => new Date(a.date) - new Date(b.date));

    classesList.innerHTML = sortedClasses.map(cls => {
      const date = new Date(cls.date);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      return `
        <div class="class-list-item" data-id="${cls.id}">
          <div class="class-date-badge">
            <span class="month">${monthNames[date.getMonth()]}</span>
            <span class="day">${date.getDate()}</span>
          </div>
          <div class="class-details">
            <div class="class-title">${cls.name}</div>
            <div class="class-meta">
              <span>
                <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
                ${formatTime(cls.startHour, cls.startMinute)} - ${cls.duration} min
              </span>
              <span>
                <svg viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/></svg>
                ${cls.instructor}
              </span>
              <span>
                <svg viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2"/></svg>
                ${cls.location}
              </span>
            </div>
          </div>
          <div class="class-spots">
            <div class="spots-count">${cls.enrolled}/${cls.capacity}</div>
            <div class="spots-label">spots filled</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Class types rendering
  function renderClassTypes() {
    if (!classTypesGrid) return;

    classTypesGrid.innerHTML = classTypes.map(type => `
      <div class="class-type-card" data-id="${type.id}">
        <div class="class-type-icon ${type.category}">
          ${getTypeIcon(type.category)}
        </div>
        <div class="class-type-name">${type.name}</div>
        <div class="class-type-description">${type.description}</div>
        <div class="class-type-stats">
          <span>${type.classCount} classes</span>
          <span>R ${type.price}</span>
          <span>${type.duration} min</span>
        </div>
      </div>
    `).join('');
  }

  function getTypeIcon(category) {
    const icons = {
      yoga: '<svg viewBox="0 0 24 24" fill="none" width="24" height="24"><circle cx="12" cy="6" r="2" stroke="currentColor" stroke-width="2"/><path d="M12 8v3M8 21l4-7 4 7M6 14l6-3 6 3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
      meditation: '<svg viewBox="0 0 24 24" fill="none" width="24" height="24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
      fitness: '<svg viewBox="0 0 24 24" fill="none" width="24" height="24"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11M4 10h16M4 14h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
      workshop: '<svg viewBox="0 0 24 24" fill="none" width="24" height="24"><rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" stroke-width="2"/><path d="M9 9h6M9 12h6M9 15h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
      nutrition: '<svg viewBox="0 0 24 24" fill="none" width="24" height="24"><path d="M12 2c-4 0-7 3-7 7v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9c0-4-3-7-7-7z" stroke="currentColor" stroke-width="2"/><path d="M12 2v7M8 9h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
    };
    return icons[category] || icons.workshop;
  }

  // Modal functions
  function openCreateModal() {
    createClassModal?.classList.remove('hidden');
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('classDate').value = today;
  }

  function closeCreateModal() {
    createClassModal?.classList.add('hidden');
    document.getElementById('createClassForm')?.reset();
    document.getElementById('recurringOptions')?.classList.add('hidden');
  }

  function saveClass() {
    const form = document.getElementById('createClassForm');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const newClass = {
      id: classes.length + 1,
      name: document.getElementById('className').value,
      date: document.getElementById('classDate').value,
      startHour: parseInt(document.getElementById('classTime').value.split(':')[0]),
      startMinute: parseInt(document.getElementById('classTime').value.split(':')[1]),
      duration: parseInt(document.getElementById('classDuration').value),
      capacity: parseInt(document.getElementById('maxParticipants').value),
      enrolled: 0,
      instructor: document.getElementById('classInstructor').options[document.getElementById('classInstructor').selectedIndex]?.text || 'TBD',
      location: document.getElementById('classLocation').value || 'Studio A',
      price: parseFloat(document.getElementById('classPrice').value) || 0,
      type: 'workshop'
    };

    classes.push(newClass);
    renderCalendar();
    closeCreateModal();

    alert('Class created successfully!');
  }

  // Helper functions
  function formatTime(hour, minute = 0) {
    const h = hour % 12 || 12;
    const m = minute.toString().padStart(2, '0');
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${h}:${m} ${ampm}`;
  }

  // Demo data
  function loadClasses() {
    const today = new Date();
    const weekStart = getWeekStart(today);

    classes = [
      {
        id: 1,
        name: 'Morning Yoga Flow',
        date: new Date(weekStart.getTime() + 0 * 24 * 60 * 60 * 1000).toISOString(),
        startHour: 7,
        startMinute: 0,
        duration: 60,
        capacity: 12,
        enrolled: 8,
        instructor: 'Dr. Sarah Johnson',
        location: 'Studio A',
        type: 'yoga'
      },
      {
        id: 2,
        name: 'Meditation & Breathwork',
        date: new Date(weekStart.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        startHour: 9,
        startMinute: 0,
        duration: 45,
        capacity: 15,
        enrolled: 12,
        instructor: 'Emma Williams',
        location: 'Zen Room',
        type: 'meditation'
      },
      {
        id: 3,
        name: 'HIIT Training',
        date: new Date(weekStart.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        startHour: 18,
        startMinute: 0,
        duration: 45,
        capacity: 20,
        enrolled: 18,
        instructor: 'Mike Chen',
        location: 'Fitness Studio',
        type: 'fitness'
      },
      {
        id: 4,
        name: 'Nutrition Workshop',
        date: new Date(weekStart.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        startHour: 14,
        startMinute: 0,
        duration: 90,
        capacity: 25,
        enrolled: 15,
        instructor: 'Dr. Sarah Johnson',
        location: 'Conference Room',
        type: 'nutrition'
      },
      {
        id: 5,
        name: 'Evening Stretch',
        date: new Date(weekStart.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        startHour: 19,
        startMinute: 30,
        duration: 30,
        capacity: 10,
        enrolled: 6,
        instructor: 'Emma Williams',
        location: 'Studio B',
        type: 'yoga'
      },
      {
        id: 6,
        name: 'Stress Management Workshop',
        date: new Date(weekStart.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        startHour: 10,
        startMinute: 0,
        duration: 120,
        capacity: 30,
        enrolled: 22,
        instructor: 'Dr. Sarah Johnson',
        location: 'Main Hall',
        type: 'workshop'
      }
    ];
  }

  function loadClassTypes() {
    classTypes = [
      {
        id: 1,
        name: 'Yoga Classes',
        category: 'yoga',
        description: 'Flow through poses, build strength, and find your center in our yoga classes.',
        classCount: 8,
        price: 250,
        duration: 60
      },
      {
        id: 2,
        name: 'Meditation Sessions',
        category: 'meditation',
        description: 'Guided meditation and breathwork to calm the mind and reduce stress.',
        classCount: 5,
        price: 180,
        duration: 45
      },
      {
        id: 3,
        name: 'Fitness Training',
        category: 'fitness',
        description: 'High-intensity workouts to build strength, endurance, and overall fitness.',
        classCount: 6,
        price: 300,
        duration: 45
      },
      {
        id: 4,
        name: 'Workshops',
        category: 'workshop',
        description: 'Educational workshops on nutrition, stress management, and wellness topics.',
        classCount: 3,
        price: 450,
        duration: 120
      },
      {
        id: 5,
        name: 'Nutrition Classes',
        category: 'nutrition',
        description: 'Learn about healthy eating, meal planning, and nutritional wellness.',
        classCount: 4,
        price: 350,
        duration: 90
      }
    ];
  }

  // Global function for class click
  window.viewClass = function(classId) {
    const cls = classes.find(c => c.id === classId);
    if (cls) {
      alert(`Class: ${cls.name}\nInstructor: ${cls.instructor}\nLocation: ${cls.location}\nEnrolled: ${cls.enrolled}/${cls.capacity}`);
    }
  };

})();
