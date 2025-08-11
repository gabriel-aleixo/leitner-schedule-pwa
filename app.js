(() => {
  'use strict';

  const STORAGE_KEY = 'leitnerScheduleV2';
  const INTERVALS = [1, 2, 4, 8, 16, 32, 64]; // for levels 1..7
  const CURRENT_VERSION = 2;

  // Elements
  const els = {
    dayCounter: document.getElementById('dayCounter'),
    reviewBtn: document.getElementById('reviewBtn'),

    settingsBtn: document.getElementById('settingsBtn'),
    welcome: document.getElementById('welcome'),
    startScheduleBtn: document.getElementById('startScheduleBtn'),
    status: document.getElementById('status'),
    board: document.getElementById('board'),
    levelsGrid: document.getElementById('levelsGrid'),
    emptyToday: document.getElementById('emptyToday'),
    sessionPanel: document.getElementById('sessionPanel'),
    sessionTitle: document.getElementById('sessionTitle'),
    sessionLevels: document.getElementById('sessionLevels'),
    sessionStopBtn: document.getElementById('sessionStopBtn'),
    sessionNextDayBtn: document.getElementById('sessionNextDayBtn'),
    sessionFinishBtn: document.getElementById('sessionFinishBtn'),
    sessionProgress: document.getElementById('sessionProgress'),
    sessionType: document.getElementById('sessionType'),
    settingsDialog: document.getElementById('settingsDialog'),
    themeSelect: document.getElementById('themeSelect'),
    resetBtn: document.getElementById('resetBtn'),
    exportBtn: document.getElementById('exportBtn'),
    importInput: document.getElementById('importInput'),
    appFooter: document.querySelector('.app-footer'),
  };

  // Templates
  const levelTileTpl = document.getElementById('levelTileTemplate');
  const sessionLevelTpl = document.getElementById('sessionLevelTemplate');

  // State
  let state = null; // { settings, levels, log }
  let activeSessionDate = null; // YYYY-MM-DD when processing a day
  let activeReviewQueue = []; // Array of dates in chronological order for current review session

  // --- Date helpers ---
  function toDate(str) {
    const [y,m,d] = str.split('-').map(Number);
    // Use UTC to avoid timezone issues during DST transitions
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt;
  }
  function fmtDate(dt) {
    // Use UTC methods to ensure consistent date formatting
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth()+1).padStart(2,'0');
    const d = String(dt.getUTCDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }
  function todayStr() {
    // Get local date but format as UTC to maintain consistency
    const now = new Date();
    const dt = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    return fmtDate(dt);
  }
  function addDays(dateStr, days) {
    const dt = toDate(dateStr);
    dt.setUTCDate(dt.getUTCDate() + days);
    return fmtDate(dt);
  }
  function diffDays(aStr, bStr) {
    const a = toDate(aStr), b = toDate(bStr);
    return Math.round((b - a) / (1000*60*60*24));
  }

  // --- Storage ---
  function validateState(data) {
    if (!data || typeof data !== 'object') return false;
    if (!data.settings || typeof data.settings !== 'object') return false;
    if (!Array.isArray(data.levels)) return false;
    if (!Array.isArray(data.log)) return false;
    
    // Validate settings
    const { settings } = data;
    if (typeof settings.startDate !== 'string' && settings.startDate !== null) return false;
    if (!Array.isArray(settings.intervals)) return false;
    if (settings.intervals.length !== 7) return false;
    if (!settings.intervals.every(i => typeof i === 'number' && i > 0)) return false;
    
    // Validate levels
    if (data.levels.length !== 7) return false;
    for (const level of data.levels) {
      if (typeof level.level !== 'number' || level.level < 1 || level.level > 7) return false;
      if (typeof level.nextDue !== 'string') return false;
      if (level.lastCompleted !== null && typeof level.lastCompleted !== 'string') return false;
    }
    
    // Validate log entries
    for (const entry of data.log) {
      if (typeof entry.date !== 'string') return false;
      if (typeof entry.level !== 'number' || entry.level < 1 || entry.level > 7) return false;
      if (typeof entry.ts !== 'number') return false;
      if (typeof entry.action !== 'string') return false;
    }
    
    return true;
  }

  function migrateState(data) {
    if (!data || !data.settings) return data;
    
    const currentVersion = data.settings.version || 1;
    if (currentVersion >= CURRENT_VERSION) return data;
    
    // Migration from v1 to v2: add originalDue to log entries if missing
    if (currentVersion < 2) {
      data.log = data.log.map(entry => ({
        ...entry,
        originalDue: entry.originalDue || entry.date // Default to entry date if missing
      }));
      data.settings.version = 2;
    }
    
    return data;
  }

  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      let data = JSON.parse(raw);
      data = migrateState(data);
      return validateState(data) ? data : null;
    } catch {
      return null;
    }
  }
  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  function wipe() {
    localStorage.removeItem(STORAGE_KEY);
  }

  // --- State Management Helpers ---
  function markLevelCompleted(levelNumber, sessionDate) {
    const level = state.levels.find(lv => lv.level === levelNumber);
    if (!level) return false;
    
    const interval = state.settings.intervals[levelNumber - 1];
    const originalDue = level.nextDue;
    
    level.lastCompleted = sessionDate;
    level.nextDue = addDays(sessionDate, interval);
    
    state.log.push({
      date: sessionDate,
      level: levelNumber,
      ts: Date.now(),
      action: 'done',
      originalDue
    });
    
    return true;
  }
  
  function undoLevelCompletion(levelNumber, sessionDate) {
    const level = state.levels.find(lv => lv.level === levelNumber);
    if (!level) return false;
    
    // Find the most recent completion log for this level/date
    const logEntries = state.log.filter(entry => 
      entry.date === sessionDate && 
      entry.level === levelNumber && 
      entry.action === 'done'
    ).sort((a, b) => b.ts - a.ts); // Most recent first
    
    if (logEntries.length > 0) {
      const latestEntry = logEntries[0];
      // Restore original due date from log
      level.nextDue = latestEntry.originalDue || sessionDate;
      level.lastCompleted = null;
      
      // Remove the log entry
      const logIndex = state.log.indexOf(latestEntry);
      if (logIndex !== -1) {
        state.log.splice(logIndex, 1);
      }
      return true;
    }
    
    return false;
  }

  // --- Rendering Optimization ---
  let renderTimeout = null;
  function scheduleRender() {
    if (renderTimeout) return; // Already scheduled
    
    renderTimeout = requestAnimationFrame(() => {
      renderHeader();
      renderStatus();
      renderBoard();
      checkSessionCompletion();
      renderTimeout = null;
    });
  }

  // --- Theme ---
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme || 'system');
  }

  // --- Initialization ---
  function bootstrap() {
    state = load();
    if (!state || !state.settings || state.settings.startDate === null) {
      // welcome mode
      showWelcome();
      return;
    }
    applyTheme(state.settings.theme || 'system');
    render();
  }

  function initNewSchedule() {
    const start = todayStr();
    const levels = [];
    // First due date logic: level N appears on day = interval[N-1]
    // So from start date, first due dates are start + (interval - 1) days.
    for (let i = 1; i <= 7; i++) {
      const offset = INTERVALS[i-1] - 1;
      const due = addDays(start, offset);
      levels.push({ level: i, nextDue: due, lastCompleted: null });
    }
    state = {
      settings: {
        startDate: start,
        intervals: INTERVALS.slice(),
        theme: 'system',
        version: CURRENT_VERSION
      },
      levels,
      log: []
    };
    save();
    applyTheme('system');
    render();
  }

  // --- Backlog & Due computation ---
  function getBacklogDates() {
    const today = todayStr();
    const set = new Set();
    state.levels.forEach(lv => {
      if (lv.nextDue < today) set.add(lv.nextDue);
    });
    return Array.from(set).sort();
  }
  
  function getReviewQueue() {
    const backlogDates = getBacklogDates();
    const today = todayStr();
    const queue = [...backlogDates];
    
    // Add today if it has due levels and isn't already in backlog
    if (anyDueToday() && !backlogDates.includes(today)) {
      queue.push(today);
    }
    
    return queue.sort(); // Chronological order
  }
  function getDueTodayLevels(forDate) {
    const date = forDate || todayStr();
    return state.levels.filter(lv => lv.nextDue === date);
  }
  function anyDueToday() {
    return getDueTodayLevels().length > 0;
  }

  // --- Rendering ---
  function showWelcome() {
    document.querySelector('main').hidden = false;
    els.welcome.hidden = false;
    els.board.hidden = true;
    els.status.hidden = true;
    els.sessionPanel.hidden = true;
    els.reviewBtn.hidden = true;
    els.dayCounter.textContent = '';
    updateFooterVisibility();
  }

  function updateFooterVisibility() {
    // Show footer if any action button is visible
    const hasVisibleActions = !els.reviewBtn.hidden;
    
    if (hasVisibleActions) {
      els.appFooter.classList.add('show');
      document.body.classList.add('has-footer-actions');
    } else {
      els.appFooter.classList.remove('show');
      document.body.classList.remove('has-footer-actions');
    }
  }

  function renderHeader() {
    if (!state || !state.settings.startDate) {
      els.dayCounter.textContent = '';
      els.reviewBtn.hidden = true;
      updateFooterVisibility();
      return;
    }
    const start = state.settings.startDate;
    const today = todayStr();
    const dayN = diffDays(start, today) + 1;
    els.dayCounter.textContent = `Today: ${today} — Day ${dayN}`;

    // Single button logic - show if there are any reviews (backlog or current)
    const hasReviews = anyDueToday() || getBacklogDates().length > 0;
    els.reviewBtn.hidden = !hasReviews;
    
    updateFooterVisibility();
  }

  function renderStatus() {
    const backlog = getBacklogDates();
    const today = todayStr();
    if (backlog.length > 0) {
      const oldest = backlog[0];
      const days = backlog.length;
      els.status.hidden = false;
      els.status.textContent = `Backlog: ${days} day${days>1?'s':''} pending (oldest: ${oldest}).`;
    } else {
      // Show a gentle status: either due levels today or all caught up
      const due = getDueTodayLevels(today);
      if (due.length > 0) {
        els.status.hidden = false;
        const list = due.map(l => `L${l.level}`).join(', ');
        els.status.textContent = `Due today: ${list}.`;
      } else {
        els.status.hidden = false;
        els.status.textContent = `You're all caught up. Next due dates are shown below.`;
      }
    }
  }

  function renderBoard() {
    els.board.hidden = false;
    els.levelsGrid.innerHTML = '';
    const tpl = levelTileTpl.content;
    const today = todayStr();
    state.levels.forEach(lv => {
      const node = tpl.cloneNode(true);
      node.querySelector('.level-number').textContent = String(lv.level);
      node.querySelector('.next-due').textContent = lv.nextDue;
      const dueBadge = node.querySelector('.due-badge');
      if (lv.nextDue === today) {
        dueBadge.hidden = false;
      } else {
        dueBadge.hidden = true;
      }
      els.levelsGrid.appendChild(node);
    });

    els.emptyToday.hidden = anyDueToday();
  }

  function renderUnifiedSession() {
    const date = activeSessionDate;
    els.sessionPanel.hidden = false;
    els.sessionTitle.textContent = `Review for ${date}`;
    els.sessionLevels.innerHTML = '';

    // Update progress indicator
    const currentIndex = activeReviewQueue.indexOf(date);
    const totalDays = activeReviewQueue.length;
    const isBacklog = date < todayStr();
    
    els.sessionProgress.textContent = `Day ${currentIndex + 1} of ${totalDays}`;
    els.sessionType.textContent = isBacklog ? 'Backlog' : 'Current';
    els.sessionType.className = `session-type-badge ${isBacklog ? 'backlog' : 'current'}`;

    const dueLevels = state.levels.filter(lv => lv.nextDue === date).sort((a,b)=>a.level-b.level);
    const tpl = sessionLevelTpl.content;

    if (dueLevels.length === 0) {
      // Nothing due for that date -> show Finish/Next Day only
      els.sessionFinishBtn.hidden = false;
      els.sessionNextDayBtn.hidden = currentIndex + 1 >= totalDays;
      return;
    }

    dueLevels.forEach(lv => {
      const node = tpl.cloneNode(true);
      node.querySelector('.level-number').textContent = String(lv.level);
      const markBtn = node.querySelector('.markBtn');
      const undoBtn = node.querySelector('.undoBtn');
      const doneTag = node.querySelector('.doneTag');

      const alreadyDone = (lv.lastCompleted === date);
      if (alreadyDone) {
        markBtn.hidden = true;
        undoBtn.hidden = false;
        doneTag.hidden = false;
      } else {
        markBtn.hidden = false;
        undoBtn.hidden = true;
        doneTag.hidden = true;
      }

      // Mark done functionality
      markBtn.addEventListener('click', () => {
        if (markLevelCompleted(lv.level, date)) {
          save();
          
          markBtn.hidden = true;
          undoBtn.hidden = false;
          doneTag.hidden = false;

          scheduleRender();
        }
      });

      // Undo functionality
      undoBtn.addEventListener('click', () => {
        if (undoLevelCompletion(lv.level, date)) {
          save();
          
          markBtn.hidden = false;
          undoBtn.hidden = true;
          doneTag.hidden = true;

          scheduleRender();
        }
      });

      els.sessionLevels.appendChild(node);
    });
    
    checkSessionCompletion();

  }
  
  function checkSessionCompletion() {
    const date = activeSessionDate;
    const currentIndex = activeReviewQueue.indexOf(date);
    const totalDays = activeReviewQueue.length;
    
    // Check if all levels for current date are completed
    const remaining = state.levels.filter(x => x.nextDue === date && x.lastCompleted !== date);
    const allCompleted = remaining.length === 0;
    
    if (allCompleted) {
      // Show next day button if more dates in queue
      els.sessionNextDayBtn.hidden = currentIndex + 1 >= totalDays;
      // Show finish button if this is the last date or no more dates
      els.sessionFinishBtn.hidden = currentIndex + 1 < totalDays;
    } else {
      // Hide both buttons if current date is not complete
      els.sessionNextDayBtn.hidden = true;
      els.sessionFinishBtn.hidden = true;
    }
  }
  
  function moveToNextReviewDate() {
    const currentIndex = activeReviewQueue.indexOf(activeSessionDate);
    
    if (currentIndex + 1 < activeReviewQueue.length) {
      activeSessionDate = activeReviewQueue[currentIndex + 1];
      renderUnifiedSession();
    } else {
      // All reviews complete
      finishAllReviews();
    }
  }
  
  function finishAllReviews() {
    activeSessionDate = null;
    activeReviewQueue = [];
    els.sessionPanel.hidden = true;
    render();
  }
  
  function startUnifiedReview() {
    const queue = getReviewQueue();
    if (queue.length === 0) return;
    
    activeSessionDate = queue[0];
    activeReviewQueue = queue;
    renderUnifiedSession();
  }

  function render() {
    // main visibility
    els.welcome.hidden = true;
    els.sessionPanel.hidden = true;
    els.board.hidden = false;

    renderHeader();
    renderStatus();
    renderBoard();

    // session controls default
    els.sessionFinishBtn.hidden = true;
    els.sessionNextDayBtn.hidden = true;
  }
  

  // --- Handlers ---
  els.startScheduleBtn?.addEventListener('click', initNewSchedule);
  els.settingsBtn?.addEventListener('click', () => els.settingsDialog.showModal());

  els.themeSelect?.addEventListener('change', (e) => {
    const theme = e.target.value;
    if (state) {
      state.settings.theme = theme;
      save();
    }
    applyTheme(theme);
  });

  els.resetBtn?.addEventListener('click', () => {
    const ok = confirm("Reset schedule? This clears your start date, level due dates, and history. You can’t undo this.");
    if (!ok) return;
    wipe();
    state = { settings: { startDate: null } };
    showWelcome();
  });

  els.exportBtn?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leitner-schedule-export-${todayStr()}.json`;
    
    // Use timeout to ensure download starts before cleanup
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  });

  els.importInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      let data = JSON.parse(text);
      data = migrateState(data); // Apply migrations to imported data
      if (!validateState(data)) throw new Error('Invalid or corrupted schedule file');
      state = data;
      save();
      applyTheme(state.settings.theme || 'system');
      render();
      els.settingsDialog.close();
    } catch (err) {
      alert('Import failed: ' + (err?.message || 'Unknown error'));
    } finally {
      e.target.value = '';
    }
  });

  els.reviewBtn?.addEventListener('click', () => {
    startUnifiedReview();
  });

  els.sessionStopBtn?.addEventListener('click', () => {
    finishAllReviews();
  });

  els.sessionNextDayBtn?.addEventListener('click', () => {
    moveToNextReviewDate();
  });

  els.sessionFinishBtn?.addEventListener('click', () => {
    finishAllReviews();
  });

  // On load, set theme select
  function syncThemeSelect() {
    const theme = state?.settings?.theme || 'system';
    els.themeSelect.value = theme;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Recompute header and status if date changed
      renderHeader();
      renderStatus();
      renderBoard();
      if (activeSessionDate) {
        renderUnifiedSession();
      }
    }
  });

  // Start
  bootstrap();
  syncThemeSelect();
})();