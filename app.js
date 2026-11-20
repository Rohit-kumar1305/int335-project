/**
 * Exam Week Routine Kit - Core Application Logic
 * INT335 Design Thinking Project: P013 — Exam Week Without the Crash
 *
 * Implements:
 * - LocalStorage state management
 * - Study task planner (CRUD)
 * - Three meal reminders (Breakfast, Lunch, Dinner)
 * - Hydration tracker with user-selected goal
 * - Sleep schedule & evening wind-down routine
 * - Daily routine checklist & dynamic percentage score
 * - Authentic 7-day weekly history overview (no fabricated data)
 * - Daily reflection logger
 * - Reset functionality & helpful toasts
 */

(function () {
  'use strict';

  // --- STORAGE KEYS ---
  const STORAGE_KEY_ROUTINE = 'exam_kit_daily_routine_v1';
  const STORAGE_KEY_HISTORY = 'exam_kit_history_v1';

  // Helper: Format today's date as YYYY-MM-DD
  function getTodayDateString() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // Helper: Format pretty date string (e.g. Thursday, 20 November 2026)
  function formatPrettyDate(date = new Date()) {
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    return date.toLocaleDateString(undefined, options);
  }

  // Default empty state for a single day
  function createDefaultDayState(dateStr) {
    return {
      date: dateStr,
      meals: {
        breakfast: { completed: false, time: '08:30' },
        lunch: { completed: false, time: '13:00' },
        dinner: { completed: false, time: '20:00' },
      },
      hydration: {
        count: 0,
        goal: 8,
      },
      sleep: {
        bedtime: '23:30',
        wakeup: '07:30',
        windDownDone: false,
      },
      studyTasks: [],
      // Manual checklist overrides if explicitly toggled (otherwise synchronized)
      checklistOverrides: {},
      reflection: {
        positive: '',
        difficult: '',
        nextStep: '',
        updatedAt: null,
      },
    };
  }

  // --- STATE CONTAINER ---
  let appState = {
    todayDate: getTodayDateString(),
    currentDay: null,
    history: {}, // Keyed by date: { '2026-11-20': { ...dayState } }
  };

  // --- INITIALIZATION ---
  function initApp() {
    loadStateFromStorage();
    setupEventListeners();
    renderAll();
  }

  // Load from localStorage
  function loadStateFromStorage() {
    try {
      const today = getTodayDateString();
      appState.todayDate = today;

      // Load history
      const savedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (savedHistory) {
        appState.history = JSON.parse(savedHistory);
      } else {
        appState.history = {};
      }

      // Load today's routine
      const savedRoutine = localStorage.getItem(STORAGE_KEY_ROUTINE);
      if (savedRoutine) {
        const parsed = JSON.parse(savedRoutine);
        if (parsed.date === today) {
          appState.currentDay = parsed;
        } else {
          // If stored day is an older day, archive it into history first
          if (parsed.date) {
            appState.history[parsed.date] = parsed;
            saveHistory();
          }
          appState.currentDay = createDefaultDayState(today);
          saveCurrentDay();
        }
      } else {
        appState.currentDay = createDefaultDayState(today);
        saveCurrentDay();
      }
    } catch (e) {
      console.error('Error loading localStorage:', e);
      appState.currentDay = createDefaultDayState(getTodayDateString());
    }
  }

  // Save current day to localStorage and update history snapshot
  function saveCurrentDay() {
    try {
      localStorage.setItem(STORAGE_KEY_ROUTINE, JSON.stringify(appState.currentDay));
      // Keep in history lookup
      if (appState.currentDay && appState.currentDay.date) {
        appState.history[appState.currentDay.date] = appState.currentDay;
        saveHistory();
      }
    } catch (e) {
      console.error('Failed to save day to localStorage:', e);
    }
  }

  function saveHistory() {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(appState.history));
    } catch (e) {
      console.error('Failed to save history:', e);
    }
  }

  // Toast feedback message
  let toastTimer = null;
  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    toast.classList.add('show');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => { toast.hidden = true; }, 200);
    }, 2400);
  }

  // --- CHECKLIST & PROGRESS CALCULATION ---
  const CHECKLIST_KEYS = [
    { id: 'chk_study', label: 'Study task completed', desc: 'At least one study session completed' },
    { id: 'chk_breakfast', label: 'Breakfast completed', desc: 'Ate morning meal' },
    { id: 'chk_lunch', label: 'Lunch completed', desc: 'Took a lunch break' },
    { id: 'chk_dinner', label: 'Dinner completed', desc: 'Ate evening dinner' },
    { id: 'chk_water', label: 'Water goal checked', desc: 'Hit your self-selected hydration target' },
    { id: 'chk_sleep', label: 'Evening wind-down completed', desc: 'Dimmed lights, disengaged from screen' }
  ];

  function getChecklistItemStatus(keyId) {
    const day = appState.currentDay;
    // Check manual override if user explicitly clicked checklist
    if (day.checklistOverrides && day.checklistOverrides.hasOwnProperty(keyId)) {
      return !!day.checklistOverrides[keyId];
    }

    // Default synchronized calculation
    switch (keyId) {
      case 'chk_study':
        return day.studyTasks && day.studyTasks.some(t => t.completed);
      case 'chk_breakfast':
        return !!day.meals?.breakfast?.completed;
      case 'chk_lunch':
        return !!day.meals?.lunch?.completed;
      case 'chk_dinner':
        return !!day.meals?.dinner?.completed;
      case 'chk_water':
        return day.hydration?.count >= day.hydration?.goal && day.hydration?.goal > 0;
      case 'chk_sleep':
        return !!day.sleep?.windDownDone;
      default:
        return false;
    }
  }

  function calculateDailyScore() {
    let completedCount = 0;
    CHECKLIST_KEYS.forEach(item => {
      if (getChecklistItemStatus(item.id)) {
        completedCount++;
      }
    });
    const percentage = Math.round((completedCount / CHECKLIST_KEYS.length) * 100);
    return { completedCount, total: CHECKLIST_KEYS.length, percentage };
  }

  // Calculate score for any specific day object in history
  function calculateDayScoreFromData(dayData) {
    if (!dayData) return 0;
    let completedCount = 0;
    CHECKLIST_KEYS.forEach(item => {
      let isDone = false;
      if (dayData.checklistOverrides && dayData.checklistOverrides.hasOwnProperty(item.id)) {
        isDone = !!dayData.checklistOverrides[item.id];
      } else {
        switch (item.id) {
          case 'chk_study':
            isDone = dayData.studyTasks && dayData.studyTasks.some(t => t.completed);
            break;
          case 'chk_breakfast':
            isDone = !!dayData.meals?.breakfast?.completed;
            break;
          case 'chk_lunch':
            isDone = !!dayData.meals?.lunch?.completed;
            break;
          case 'chk_dinner':
            isDone = !!dayData.meals?.dinner?.completed;
            break;
          case 'chk_water':
            isDone = dayData.hydration?.count >= dayData.hydration?.goal && dayData.hydration?.goal > 0;
            break;
          case 'chk_sleep':
            isDone = !!dayData.sleep?.windDownDone;
            break;
        }
      }
      if (isDone) completedCount++;
    });
    return Math.round((completedCount / CHECKLIST_KEYS.length) * 100);
  }

  // --- RENDER FUNCTIONS ---
  function renderAll() {
    renderHeaderAndDashboard();
    renderDailyChecklist();
    renderMeals();
    renderHydration();
    renderSleep();
    renderStudyPlanner();
    renderReflection();
    renderWeeklyOverview();
  }

  function renderHeaderAndDashboard() {
    // 1. Date
    const dateEl = document.getElementById('today-date-text');
    if (dateEl) {
      dateEl.textContent = formatPrettyDate(new Date());
    }

    // 2. Score & Circle
    const score = calculateDailyScore();
    const pctEl = document.getElementById('routine-percentage');
    const circleEl = document.getElementById('progress-circle');
    if (pctEl) pctEl.textContent = `${score.percentage}%`;
    if (circleEl) circleEl.style.setProperty('--percent', score.percentage);

    // 3. Snapshots
    // Study
    const tasks = appState.currentDay.studyTasks || [];
    const doneTasks = tasks.filter(t => t.completed).length;
    const snapStudy = document.getElementById('snap-study-value');
    if (snapStudy) {
      snapStudy.textContent = tasks.length === 0 ? 'No tasks yet' : `${doneTasks} / ${tasks.length} Done`;
    }

    // Meals
    const meals = appState.currentDay.meals || {};
    const mealsDone = ['breakfast', 'lunch', 'dinner'].filter(m => meals[m]?.completed).length;
    const snapMeals = document.getElementById('snap-meal-value');
    if (snapMeals) {
      snapMeals.textContent = `${mealsDone} / 3 Logged`;
    }

    // Water
    const water = appState.currentDay.hydration || { count: 0, goal: 8 };
    const snapWater = document.getElementById('snap-water-value');
    if (snapWater) {
      snapWater.textContent = `${water.count} / ${water.goal} Glasses`;
    }

    // Sleep
    const sleep = appState.currentDay.sleep || {};
    const snapSleep = document.getElementById('snap-sleep-value');
    if (snapSleep) {
      snapSleep.textContent = sleep.windDownDone ? 'Wind-down Done' : 'Pending';
    }
  }

  function renderDailyChecklist() {
    const container = document.getElementById('checklist-container');
    const summaryEl = document.getElementById('checklist-summary');
    if (!container) return;

    container.innerHTML = '';
    const score = calculateDailyScore();
    if (summaryEl) {
      summaryEl.textContent = `${score.completedCount} / ${score.total} Done`;
    }

    CHECKLIST_KEYS.forEach(item => {
      const isCompleted = getChecklistItemStatus(item.id);
      const row = document.createElement('div');
      row.className = `check-item ${isCompleted ? 'completed' : ''}`;

      row.innerHTML = `
        <label class="check-item-label" for="chk-item-${item.id}">
          <input type="checkbox" id="chk-item-${item.id}" class="custom-checkbox" ${isCompleted ? 'checked' : ''} />
          <span class="check-item-text">${item.label}</span>
        </label>
        <span class="check-meta">${item.desc}</span>
      `;

      // Event listener for user manually ticking/unticking
      const checkbox = row.querySelector(`#chk-item-${item.id}`);
      checkbox.addEventListener('change', (e) => {
        const checked = e.target.checked;
        if (!appState.currentDay.checklistOverrides) {
          appState.currentDay.checklistOverrides = {};
        }
        appState.currentDay.checklistOverrides[item.id] = checked;

        // If toggling meal through checklist, keep meal synced
        if (item.id === 'chk_breakfast') appState.currentDay.meals.breakfast.completed = checked;
        if (item.id === 'chk_lunch') appState.currentDay.meals.lunch.completed = checked;
        if (item.id === 'chk_dinner') appState.currentDay.meals.dinner.completed = checked;
        if (item.id === 'chk_sleep') appState.currentDay.sleep.windDownDone = checked;

        saveCurrentDay();
        renderAll();
        showToast(`${item.label} marked ${checked ? 'completed' : 'pending'}`);
      });

      container.appendChild(row);
    });
  }

  function renderMeals() {
    const meals = appState.currentDay.meals || {};
    const mealKeys = ['breakfast', 'lunch', 'dinner'];

    mealKeys.forEach(meal => {
      const data = meals[meal] || { completed: false, time: '08:00' };
      const card = document.getElementById(`meal-${meal}-card`);
      const pill = document.getElementById(`meal-${meal}-pill`);
      const timeInput = document.getElementById(`time-${meal}`);
      const toggleBtn = document.getElementById(`btn-toggle-${meal}`);

      if (timeInput) {
        timeInput.value = data.time || '';
      }

      if (card && pill && toggleBtn) {
        if (data.completed) {
          card.classList.add('completed');
          pill.className = 'status-pill status-completed';
          pill.textContent = 'Completed';
          toggleBtn.textContent = 'Mark as Pending';
          toggleBtn.className = 'btn btn-subtle';
        } else {
          card.classList.remove('completed');
          pill.className = 'status-pill status-pending';
          pill.textContent = 'Pending';
          toggleBtn.textContent = 'Mark as Eaten';
          toggleBtn.className = 'btn btn-outline';
        }
      }
    });
  }

  function renderHydration() {
    const hydration = appState.currentDay.hydration || { count: 0, goal: 8 };
    const countDisplay = document.getElementById('water-count-display');
    const goalDisplay = document.getElementById('water-goal-display');
    const progressBar = document.getElementById('water-progress-bar');
    const inputGoal = document.getElementById('input-water-goal');

    if (countDisplay) countDisplay.textContent = hydration.count;
    if (goalDisplay) goalDisplay.textContent = hydration.goal;
    if (inputGoal && document.activeElement !== inputGoal) {
      inputGoal.value = hydration.goal;
    }

    if (progressBar) {
      const pct = hydration.goal > 0 ? Math.min(100, Math.round((hydration.count / hydration.goal) * 100)) : 0;
      progressBar.style.width = `${pct}%`;
    }
  }

  function renderSleep() {
    const sleep = appState.currentDay.sleep || { bedtime: '23:30', wakeup: '07:30', windDownDone: false };
    const bedtimeInput = document.getElementById('time-bedtime');
    const wakeupInput = document.getElementById('time-wakeup');
    const windDownChk = document.getElementById('chk-wind-down');
    const windowText = document.getElementById('sleep-window-text');
    const hoursText = document.getElementById('sleep-hours-text');

    if (bedtimeInput && document.activeElement !== bedtimeInput) bedtimeInput.value = sleep.bedtime;
    if (wakeupInput && document.activeElement !== wakeupInput) wakeupInput.value = sleep.wakeup;
    if (windDownChk) windDownChk.checked = !!sleep.windDownDone;

    // Calculate approximate duration
    if (windowText && hoursText && sleep.bedtime && sleep.wakeup) {
      windowText.textContent = `Planned rest: ${sleep.bedtime} to ${sleep.wakeup}`;
      const diffHours = calculateTimeDifferenceHours(sleep.bedtime, sleep.wakeup);
      hoursText.textContent = `${diffHours} hours planned rest window`;
    }
  }

  function calculateTimeDifferenceHours(startTime, endTime) {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    if (isNaN(startH) || isNaN(endH)) return '8.0';

    let startMins = startH * 60 + startM;
    let endMins = endH * 60 + endM;

    if (endMins < startMins) {
      endMins += 24 * 60; // Crosses midnight
    }
    const diff = ((endMins - startMins) / 60).toFixed(1);
    return diff;
  }

  function renderStudyPlanner() {
    const tasks = appState.currentDay.studyTasks || [];
    const listContainer = document.getElementById('study-tasks-list');
    const taskCounter = document.getElementById('study-task-counter');
    const progressBar = document.getElementById('study-progress-bar');
    const progressPercent = document.getElementById('study-progress-percent');

    if (!listContainer) return;

    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    if (taskCounter) taskCounter.textContent = `${total} ${total === 1 ? 'task' : 'tasks'}`;
    if (progressBar) progressBar.style.width = `${pct}%`;
    if (progressPercent) progressPercent.textContent = `${pct}%`;

    if (total === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📖</span>
          <p class="empty-title">No study sessions planned for today</p>
          <p class="empty-desc">Add your first focus session above to structure your day.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = '';
    tasks.forEach(task => {
      const item = document.createElement('div');
      item.className = `task-item ${task.completed ? 'is-done' : ''}`;
      item.innerHTML = `
        <div class="task-left">
          <input type="checkbox" class="custom-checkbox task-check" data-id="${task.id}" ${task.completed ? 'checked' : ''} aria-label="Mark task complete" />
          <div class="task-info">
            <span class="task-title-text">${escapeHtml(task.title)}</span>
            <span class="task-time-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${escapeHtml(task.startTime)} – ${escapeHtml(task.endTime)}
            </span>
          </div>
        </div>
        <div class="task-actions">
          <button class="btn-icon btn-edit-task" data-id="${task.id}" title="Edit task" aria-label="Edit task">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button class="btn-icon btn-delete-task" data-id="${task.id}" title="Delete task" aria-label="Delete task">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      `;

      // Checkbox listener
      const chk = item.querySelector('.task-check');
      chk.addEventListener('change', () => toggleTaskCompleted(task.id, chk.checked));

      // Edit listener
      const btnEdit = item.querySelector('.btn-edit-task');
      btnEdit.addEventListener('click', () => startEditTask(task.id));

      // Delete listener
      const btnDelete = item.querySelector('.btn-delete-task');
      btnDelete.addEventListener('click', () => deleteTask(task.id));

      listContainer.appendChild(item);
    });
  }

  function renderReflection() {
    const ref = appState.currentDay.reflection || { positive: '', difficult: '', nextStep: '', updatedAt: null };
    const posInput = document.getElementById('reflect-positive');
    const diffInput = document.getElementById('reflect-difficult');
    const nextInput = document.getElementById('reflect-next');
    const pill = document.getElementById('reflection-save-pill');
    const timeText = document.getElementById('reflection-timestamp');

    if (posInput && document.activeElement !== posInput) posInput.value = ref.positive || '';
    if (diffInput && document.activeElement !== diffInput) diffInput.value = ref.difficult || '';
    if (nextInput && document.activeElement !== nextInput) nextInput.value = ref.nextStep || '';

    if (ref.updatedAt) {
      if (pill) pill.style.display = 'inline-block';
      if (timeText) timeText.textContent = `Last saved: ${ref.updatedAt}`;
    } else {
      if (pill) pill.style.display = 'none';
      if (timeText) timeText.textContent = '';
    }
  }

  function renderWeeklyOverview() {
    const container = document.getElementById('weekly-overview-container');
    if (!container) return;

    // Build the past 7 days list ending on today
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;
      const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
      const dayNum = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      days.push({ dateKey, dayName, dayNum, isToday: i === 0 });
    }

    // Check if there is ANY saved data at all in history or today
    let totalLogsCount = 0;
    days.forEach(dayInfo => {
      const dayData = (dayInfo.dateKey === appState.todayDate) ? appState.currentDay : appState.history[dayInfo.dateKey];
      if (dayData) {
        // Check if day has any activity
        const hasTasks = dayData.studyTasks && dayData.studyTasks.length > 0;
        const hasWater = dayData.hydration && dayData.hydration.count > 0;
        const hasMeals = dayData.meals && Object.values(dayData.meals).some(m => m.completed);
        const hasSleep = dayData.sleep && dayData.sleep.windDownDone;
        const hasReflection = dayData.reflection && (dayData.reflection.positive || dayData.reflection.difficult);
        if (hasTasks || hasWater || hasMeals || hasSleep || hasReflection) {
          totalLogsCount++;
        }
      }
    });

    // If completely brand new without any history/activity, show authentic empty state
    if (totalLogsCount === 0 && Object.keys(appState.history).length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📊</span>
          <p class="empty-title">No weekly routine history logged yet</p>
          <p class="empty-desc">Your real 7-day progress and routine percentages will appear here as you log meals, water, and study tasks across days.</p>
        </div>
      `;
      return;
    }

    // Render 7-day bar chart
    let html = '<div class="weekly-grid">';
    days.forEach(d => {
      const dayData = (d.dateKey === appState.todayDate) ? appState.currentDay : appState.history[d.dateKey];
      const hasData = !!dayData;
      const score = hasData ? calculateDayScoreFromData(dayData) : 0;
      const fillHeight = score;
      const barClass = score < 30 ? 'day-bar-fill bar-low' : 'day-bar-fill';

      html += `
        <div class="weekly-day-card ${d.isToday ? 'is-today' : ''}">
          <span class="day-name">${d.dayName}</span>
          <span class="day-date">${d.dayNum}</span>
          <div class="day-bar-wrap" title="${hasData ? `${score}% routine completion` : 'No data recorded'}">
            <div class="${barClass}" style="height: ${fillHeight}%;"></div>
          </div>
          <span class="day-pct">${hasData ? `${score}%` : '—'}</span>
        </div>
      `;
    });
    html += '</div>';

    container.innerHTML = html;
  }

  // --- ACTIONS & EVENT HANDLERS ---
  function setupEventListeners() {
    // 1. Meals toggles & time updates
    ['breakfast', 'lunch', 'dinner'].forEach(meal => {
      // Toggle button
      const btn = document.getElementById(`btn-toggle-${meal}`);
      if (btn) {
        btn.addEventListener('click', () => {
          const current = appState.currentDay.meals[meal].completed;
          appState.currentDay.meals[meal].completed = !current;
          // Clear checklist override for sync
          if (appState.currentDay.checklistOverrides) {
            delete appState.currentDay.checklistOverrides[`chk_${meal}`];
          }
          saveCurrentDay();
          renderAll();
          showToast(`${capitalize(meal)} marked ${!current ? 'eaten' : 'pending'}`);
        });
      }

      // Time input
      const timeInput = document.getElementById(`time-${meal}`);
      if (timeInput) {
        timeInput.addEventListener('change', (e) => {
          const val = e.target.value;
          if (validateTimeString(val)) {
            appState.currentDay.meals[meal].time = val;
            saveCurrentDay();
            showToast(`${capitalize(meal)} target time set to ${val}`);
          } else {
            showToast('Please enter a valid time');
          }
        });
      }
    });

    // 2. Hydration actions
    const btnAddWater = document.getElementById('btn-add-water');
    if (btnAddWater) {
      btnAddWater.addEventListener('click', () => {
        appState.currentDay.hydration.count++;
        // Clear checklist override for water
        if (appState.currentDay.checklistOverrides) {
          delete appState.currentDay.checklistOverrides['chk_water'];
        }
        saveCurrentDay();
        renderAll();
        showToast(`Added 1 glass of water! (${appState.currentDay.hydration.count} total)`);
      });
    }

    const btnMinusWater = document.getElementById('btn-minus-water');
    if (btnMinusWater) {
      btnMinusWater.addEventListener('click', () => {
        if (appState.currentDay.hydration.count > 0) {
          appState.currentDay.hydration.count--;
          if (appState.currentDay.checklistOverrides) {
            delete appState.currentDay.checklistOverrides['chk_water'];
          }
          saveCurrentDay();
          renderAll();
          showToast(`Recorded 1 less glass (${appState.currentDay.hydration.count} total)`);
        }
      });
    }

    const btnResetWater = document.getElementById('btn-reset-water');
    if (btnResetWater) {
      btnResetWater.addEventListener('click', () => {
        if (confirm("Reset today's water glass count to 0?")) {
          appState.currentDay.hydration.count = 0;
          if (appState.currentDay.checklistOverrides) {
            delete appState.currentDay.checklistOverrides['chk_water'];
          }
          saveCurrentDay();
          renderAll();
          showToast('Water count reset to 0');
        }
      });
    }

    const btnSaveWaterGoal = document.getElementById('btn-save-water-goal');
    const inputWaterGoal = document.getElementById('input-water-goal');
    if (btnSaveWaterGoal && inputWaterGoal) {
      btnSaveWaterGoal.addEventListener('click', () => {
        const val = parseInt(inputWaterGoal.value, 10);
        if (isNaN(val) || val < 1 || val > 30) {
          showToast('Please enter a realistic target between 1 and 30 glasses');
          return;
        }
        appState.currentDay.hydration.goal = val;
        saveCurrentDay();
        renderAll();
        showToast(`Personal water goal updated to ${val} glasses`);
      });
    }

    // 3. Sleep schedule
    const timeBedtime = document.getElementById('time-bedtime');
    const timeWakeup = document.getElementById('time-wakeup');
    const chkWindDown = document.getElementById('chk-wind-down');

    if (timeBedtime) {
      timeBedtime.addEventListener('change', (e) => {
        const val = e.target.value;
        if (validateTimeString(val)) {
          appState.currentDay.sleep.bedtime = val;
          saveCurrentDay();
          renderSleep();
          showToast(`Bedtime set to ${val}`);
        }
      });
    }

    if (timeWakeup) {
      timeWakeup.addEventListener('change', (e) => {
        const val = e.target.value;
        if (validateTimeString(val)) {
          appState.currentDay.sleep.wakeup = val;
          saveCurrentDay();
          renderSleep();
          showToast(`Wake-up set to ${val}`);
        }
      });
    }

    if (chkWindDown) {
      chkWindDown.addEventListener('change', (e) => {
        const checked = e.target.checked;
        appState.currentDay.sleep.windDownDone = checked;
        if (appState.currentDay.checklistOverrides) {
          delete appState.currentDay.checklistOverrides['chk_sleep'];
        }
        saveCurrentDay();
        renderAll();
        showToast(`Wind-down routine marked ${checked ? 'completed' : 'pending'}`);
      });
    }

    // 4. Study task form
    const formStudyTask = document.getElementById('form-study-task');
    const taskTitleInput = document.getElementById('task-title');
    const taskStartInput = document.getElementById('task-start-time');
    const taskEndInput = document.getElementById('task-end-time');
    const editTaskIdInput = document.getElementById('edit-task-id');
    const btnCancelEdit = document.getElementById('btn-cancel-edit');
    const formError = document.getElementById('task-form-error');

    // Pre-fill sensible default times for the next hour
    setSuggestedStudyTimes();

    if (formStudyTask) {
      formStudyTask.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = taskTitleInput.value.trim();
        const startTime = taskStartInput.value;
        const endTime = taskEndInput.value;
        const editId = editTaskIdInput.value;

        // Validation
        if (!title) {
          showFormError('Please enter a subject or study topic.');
          taskTitleInput.focus();
          return;
        }

        if (!validateTimeString(startTime) || !validateTimeString(endTime)) {
          showFormError('Please provide valid start and end times.');
          return;
        }

        clearFormError();

        if (editId) {
          // Editing existing task
          const task = appState.currentDay.studyTasks.find(t => t.id === editId);
          if (task) {
            task.title = title;
            task.startTime = startTime;
            task.endTime = endTime;
            showToast('Study session updated.');
          }
          resetTaskForm();
        } else {
          // New task
          const newTask = {
            id: 'task_' + Date.now(),
            title: title,
            startTime: startTime,
            endTime: endTime,
            completed: false,
          };
          appState.currentDay.studyTasks.push(newTask);
          showToast('Study session scheduled.');
          resetTaskForm();
        }

        saveCurrentDay();
        renderAll();
      });
    }

    if (btnCancelEdit) {
      btnCancelEdit.addEventListener('click', resetTaskForm);
    }

    // 5. Daily Reflection Form
    const formReflection = document.getElementById('form-reflection');
    if (formReflection) {
      formReflection.addEventListener('submit', (e) => {
        e.preventDefault();
        const pos = document.getElementById('reflect-positive').value.trim();
        const diff = document.getElementById('reflect-difficult').value.trim();
        const next = document.getElementById('reflect-next').value.trim();

        if (!pos && !diff && !next) {
          showToast('Please write at least a short thought before saving.');
          return;
        }

        const now = new Date();
        const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        appState.currentDay.reflection = {
          positive: pos,
          difficult: diff,
          nextStep: next,
          updatedAt: `${timeFormatted}, ${now.toLocaleDateString([], { month: 'short', day: 'numeric' })}`,
        };

        saveCurrentDay();
        renderReflection();
        renderWeeklyOverview();
        showToast('Daily reflection saved successfully!');
      });
    }

    // 6. Reset Modal Dialog
    const btnQuickReset = document.getElementById('btn-quick-reset');
    const modalReset = document.getElementById('modal-reset');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnCancelModal = document.getElementById('btn-cancel-modal');
    const btnResetToday = document.getElementById('btn-action-reset-today');
    const btnResetAll = document.getElementById('btn-action-reset-all');

    if (btnQuickReset && modalReset) {
      btnQuickReset.addEventListener('click', () => {
        modalReset.hidden = false;
      });
    }

    function closeModal() {
      if (modalReset) modalReset.hidden = true;
    }

    if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
    if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);

    if (btnResetToday) {
      btnResetToday.addEventListener('click', () => {
        const today = appState.todayDate;
        appState.currentDay = createDefaultDayState(today);
        saveCurrentDay();
        closeModal();
        renderAll();
        showToast("Today's routine has been reset.");
      });
    }

    if (btnResetAll) {
      btnResetAll.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all app history and settings? This cannot be undone.')) {
          localStorage.removeItem(STORAGE_KEY_ROUTINE);
          localStorage.removeItem(STORAGE_KEY_HISTORY);
          appState.history = {};
          appState.currentDay = createDefaultDayState(getTodayDateString());
          saveCurrentDay();
          closeModal();
          renderAll();
          showToast('All app data cleared.');
        }
      });
    }

    // 7. Load Starter Sample Plan (Footer link)
    const btnLoadSample = document.getElementById('btn-load-sample');
    if (btnLoadSample) {
      btnLoadSample.addEventListener('click', () => {
        loadStarterSamplePlan();
      });
    }
  }

  // --- STUDY TASK HELPER ACTIONS ---
  function toggleTaskCompleted(taskId, completed) {
    const task = appState.currentDay.studyTasks.find(t => t.id === taskId);
    if (task) {
      task.completed = completed;
      // Sync checklist
      if (appState.currentDay.checklistOverrides) {
        delete appState.currentDay.checklistOverrides['chk_study'];
      }
      saveCurrentDay();
      renderAll();
      showToast(`Task marked ${completed ? 'completed' : 'pending'}`);
    }
  }

  function startEditTask(taskId) {
    const task = appState.currentDay.studyTasks.find(t => t.id === taskId);
    if (!task) return;

    document.getElementById('edit-task-id').value = task.id;
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-start-time').value = task.startTime;
    document.getElementById('task-end-time').value = task.endTime;

    document.getElementById('btn-save-task-text').textContent = 'Update Study Session';
    document.getElementById('btn-cancel-edit').style.display = 'inline-flex';

    document.getElementById('task-title').focus();
    clearFormError();
  }

  function deleteTask(taskId) {
    if (confirm('Remove this study session?')) {
      appState.currentDay.studyTasks = appState.currentDay.studyTasks.filter(t => t.id !== taskId);
      if (appState.currentDay.checklistOverrides) {
        delete appState.currentDay.checklistOverrides['chk_study'];
      }
      saveCurrentDay();
      renderAll();
      showToast('Task removed.');
    }
  }

  function resetTaskForm() {
    const form = document.getElementById('form-study-task');
    if (form) form.reset();
    document.getElementById('edit-task-id').value = '';
    document.getElementById('btn-save-task-text').textContent = '+ Add Study Session';
    document.getElementById('btn-cancel-edit').style.display = 'none';
    clearFormError();
    setSuggestedStudyTimes();
  }

  function setSuggestedStudyTimes() {
    const now = new Date();
    const curHour = now.getHours();
    const startStr = `${String(curHour).padStart(2, '0')}:00`;
    const endStr = `${String((curHour + 1) % 24).padStart(2, '0')}:30`;

    const startInput = document.getElementById('task-start-time');
    const endInput = document.getElementById('task-end-time');
    if (startInput && !startInput.value) startInput.value = startStr;
    if (endInput && !endInput.value) endInput.value = endStr;
  }

  function showFormError(msg) {
    const errorEl = document.getElementById('task-form-error');
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.hidden = false;
    }
  }

  function clearFormError() {
    const errorEl = document.getElementById('task-form-error');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }
  }

  // --- STARTER SAMPLE PLAN GENERATOR ---
  function loadStarterSamplePlan() {
    if (!confirm('Load realistic sample study tasks and starter routine times?')) return;

    appState.currentDay.meals = {
      breakfast: { completed: true, time: '08:30' },
      lunch: { completed: false, time: '13:00' },
      dinner: { completed: false, time: '20:00' },
    };

    appState.currentDay.hydration = {
      count: 4,
      goal: 8,
    };

    appState.currentDay.sleep = {
      bedtime: '23:30',
      wakeup: '07:30',
      windDownDone: false,
    };

    appState.currentDay.studyTasks = [
      { id: 'sample_1', title: 'INT335 Design Thinking: Persona & Empathy Maps review', startTime: '09:30', endTime: '11:00', completed: true },
      { id: 'sample_2', title: 'Data Structures: Binary Trees practice questions', startTime: '11:30', endTime: '13:00', completed: false },
      { id: 'sample_3', title: 'Calculus: Differential Equations Mock Quiz 1', startTime: '15:00', endTime: '16:30', completed: false },
    ];

    appState.currentDay.reflection = {
      positive: 'Woke up on time and had breakfast before studying.',
      difficult: 'Felt an urge to check phone notifications midway.',
      nextStep: 'Place phone in desk drawer during 11:30 study block.',
      updatedAt: 'Loaded starter sample',
    };

    delete appState.currentDay.checklistOverrides;
    saveCurrentDay();
    renderAll();
    showToast('Loaded starter demo plan.');
  }

  // --- UTILITIES ---
  function validateTimeString(timeStr) {
    return /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr);
  }

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initialize on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

})();
