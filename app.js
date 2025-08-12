(() => {
  'use strict';

  const STORAGE_KEY = 'leitnerScheduleV2';
  const INTERVALS = [1, 2, 4, 8, 16, 32, 64]; // for levels 1..7
  const CURRENT_VERSION = 3;

  // Elements
  const els = {
    dayCounter: document.getElementById('dayCounter'),
    settingsBtn: document.getElementById('settingsBtn'),
    welcome: document.getElementById('welcome'),
    startScheduleBtn: document.getElementById('startScheduleBtn'),
    status: document.getElementById('status'),
    successMessage: document.getElementById('successMessage'),
    
    // Sectioned Grid
    sectionedGrid: document.getElementById('sectionedGrid'),
    nextUpSection: document.getElementById('nextUpSection'),
    nextUpGrid: document.getElementById('nextUpGrid'),
    othersDueSection: document.getElementById('othersDueSection'),
    othersDueGrid: document.getElementById('othersDueGrid'),
    caughtUpSection: document.getElementById('caughtUpSection'),
    caughtUpGrid: document.getElementById('caughtUpGrid'),
    allCaughtUpState: document.getElementById('allCaughtUpState'),
    
    // Undo Toaster
    undoToaster: document.getElementById('undoToaster'),
    undoMessage: document.getElementById('undoMessage'),
    undoBtn: document.getElementById('undoBtn'),
    
    // Settings
    settingsDialog: document.getElementById('settingsDialog'),
    themeSelect: document.getElementById('themeSelect'),
    resetBtn: document.getElementById('resetBtn'),
    exportBtn: document.getElementById('exportBtn'),
    importInput: document.getElementById('importInput'),
  };

  // Templates
  const levelTileTpl = document.getElementById('levelTileTemplate');

  // State
  let state = null; // { settings, levels, log }

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
  function formatRelativeDate(dateStr) {
    const today = todayStr();
    const daysDiff = diffDays(today, dateStr);
    
    if (daysDiff === 0) return 'Today';
    if (daysDiff === 1) return 'Tomorrow';
    if (daysDiff === -1) return 'Yesterday';
    if (daysDiff > 1) return `In ${daysDiff} days`;
    if (daysDiff < -1) return `${Math.abs(daysDiff)} days ago`;
    
    return dateStr; // fallback
  }
  
  function getHeatmapClass(dateStr) {
    const today = todayStr();
    const daysDiff = diffDays(today, dateStr);
    
    if (daysDiff < 0) return 'overdue'; // Past due
    if (daysDiff === 0) return 'due-today'; // Due today
    if (daysDiff <= 3) return 'due-soon'; // Due within 3 days
    return 'future'; // Further in the future
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
    
    // Migration from v2 to v3: no data changes needed, just version bump
    if (currentVersion < 3) {
      data.settings.version = 3;
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
    // CORRECTED: Next due date should be the *previous* due date + interval
    // This implements proper Leitner box behavior where you work through backlogs
    level.nextDue = addDays(originalDue, interval);
    
    state.log.push({
      date: sessionDate,
      level: levelNumber,
      ts: Date.now(),
      action: 'done',
      originalDue
    });
    
    return true;
  }
  

  // --- Success Messages ---
  function showSuccessMessage(text, duration = 4000) {
    els.successMessage.textContent = text;
    els.successMessage.hidden = false;
    setTimeout(() => {
      els.successMessage.hidden = true;
    }, duration);
  }
  
  // --- Undo Functionality ---
  let undoTimeout = null;
  let undoAction = null;
  
  function showUndoToaster(message, undoCallback, duration = 5000) {
    // Clear any existing undo
    if (undoTimeout) {
      clearTimeout(undoTimeout);
      undoTimeout = null;
    }
    
    els.undoMessage.textContent = message;
    els.undoToaster.hidden = false;
    undoAction = undoCallback;
    
    undoTimeout = setTimeout(() => {
      hideUndoToaster();
    }, duration);
  }
  
  function hideUndoToaster() {
    els.undoToaster.hidden = true;
    undoAction = null;
    if (undoTimeout) {
      clearTimeout(undoTimeout);
      undoTimeout = null;
    }
  }
  
  function executeUndo() {
    if (undoAction) {
      undoAction();
      hideUndoToaster();
    }
  }
  
  // --- Level Actions ---
  function markLevelDone(level) {
    const today = todayStr();
    const originalDue = level.nextDue;
    
    // Update level
    const success = markLevelCompleted(level.level, today);
    if (!success) return;
    
    save();
    render();
    
    // Show undo toaster
    showUndoToaster(`Level ${level.level} marked done`, () => {
      // Undo action
      level.nextDue = originalDue;
      level.lastCompleted = null;
      
      // Remove the log entry
      const logIndex = state.log.findIndex(entry => 
        entry.date === today && 
        entry.level === level.level && 
        entry.action === 'done'
      );
      if (logIndex !== -1) {
        state.log.splice(logIndex, 1);
      }
      
      save();
      render();
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
    
    // Show success message
    showSuccessMessage('Schedule created. First review due today.');
  }

  // --- Level Sorting & Section Assignment ---
  function getSortedLevels() {
    // Sort by nextDue ascending, then by level number ascending
    return [...state.levels].sort((a, b) => {
      if (a.nextDue !== b.nextDue) {
        return a.nextDue.localeCompare(b.nextDue);
      }
      return a.level - b.level;
    });
  }
  
  function getSectionedLevels() {
    const today = todayStr();
    const sortedLevels = getSortedLevels();
    
    const sections = {
      nextUp: [],
      othersDue: [],
      caughtUp: []
    };
    
    // Split levels by due status
    const dueLevels = sortedLevels.filter(lv => lv.nextDue <= today);
    const futureLevels = sortedLevels.filter(lv => lv.nextDue > today);
    
    // Next Up: earliest due level only
    if (dueLevels.length > 0) {
      sections.nextUp = [dueLevels[0]];
      sections.othersDue = dueLevels.slice(1);
    }
    
    sections.caughtUp = futureLevels;
    
    return sections;
  }
  

  // --- Rendering ---
  function showWelcome() {
    document.querySelector('main').hidden = false;
    els.welcome.hidden = false;
    els.sectionedGrid.hidden = true;
    els.status.hidden = true;
    els.undoToaster.hidden = true;
    els.dayCounter.textContent = '';
  }

  function renderHeader() {
    if (!state || !state.settings.startDate) {
      els.dayCounter.textContent = '';
      return;
    }
    const start = state.settings.startDate;
    const today = todayStr();
    const dayN = diffDays(start, today) + 1;
    els.dayCounter.textContent = `Today: ${today} — Day ${dayN}`;
  }

  function renderStatus() {
    const sections = getSectionedLevels();
    const hasDue = sections.nextUp.length > 0 || sections.othersDue.length > 0;
    
    if (hasDue) {
      const totalDue = sections.nextUp.length + sections.othersDue.length;
      els.status.hidden = false;
      els.status.textContent = `${totalDue} level${totalDue > 1 ? 's' : ''} due. Complete them in order.`;
    } else {
      els.status.hidden = true;
    }
  }

  function createLevelTile(level, isActionable = false) {
    const tpl = levelTileTpl.content;
    const node = tpl.cloneNode(true);
    const tileElement = node.querySelector('.level-tile');
    const today = todayStr();
    
    // Basic tile setup
    node.querySelector('.level-number').textContent = String(level.level);
    node.querySelector('.next-due').textContent = formatRelativeDate(level.nextDue);
    
    // Badges
    const dueBadge = node.querySelector('.due-badge');
    const pastDueBadge = node.querySelector('.past-due-badge');
    
    if (level.nextDue === today) {
      dueBadge.hidden = false;
      pastDueBadge.hidden = true;
    } else if (level.nextDue < today) {
      dueBadge.hidden = true;
      pastDueBadge.hidden = false;
    } else {
      dueBadge.hidden = true;
      pastDueBadge.hidden = true;
    }
    
    // Apply heatmap color class
    const heatmapClass = getHeatmapClass(level.nextDue);
    tileElement.classList.add(heatmapClass);
    
    // Mark Done button (only for actionable tiles)
    const markDoneBtn = node.querySelector('.mark-done-btn');
    if (isActionable) {
      markDoneBtn.hidden = false;
      markDoneBtn.addEventListener('click', () => markLevelDone(level));
    } else {
      markDoneBtn.hidden = true;
    }
    
    return node;
  }
  
  function renderSectionedGrid() {
    const sections = getSectionedLevels();
    const sortedLevels = getSortedLevels();
    const today = todayStr();
    
    // Find the absolute first level that should be actionable
    // This should be the first level in the entire sorted list that is <= today
    const firstDueLevel = sortedLevels.find(level => level.nextDue <= today);
    
    // Clear all grids
    els.nextUpGrid.innerHTML = '';
    els.othersDueGrid.innerHTML = '';
    els.caughtUpGrid.innerHTML = '';
    
    // Always show the grid sections, hide the "all caught up" message
    els.allCaughtUpState.hidden = true;
    els.sectionedGrid.hidden = false;
    
    // Next Up Section (only the very first due level is actionable)
    if (sections.nextUp.length > 0) {
      els.nextUpSection.hidden = false;
      sections.nextUp.forEach(level => {
        // Only actionable if this is THE first due level in the entire sorted list
        const isActionable = firstDueLevel && 
                            level.level === firstDueLevel.level && 
                            level.nextDue === firstDueLevel.nextDue;
        const tile = createLevelTile(level, isActionable);
        els.nextUpGrid.appendChild(tile);
      });
    } else {
      els.nextUpSection.hidden = true;
    }
    
    // Others Due Section (never actionable)
    if (sections.othersDue.length > 0) {
      els.othersDueSection.hidden = false;
      sections.othersDue.forEach(level => {
        const tile = createLevelTile(level, false); // never actionable
        els.othersDueGrid.appendChild(tile);
      });
    } else {
      els.othersDueSection.hidden = true;
    }
    
    // Caught Up Section (never actionable - these are future dates)
    if (sections.caughtUp.length > 0) {
      els.caughtUpSection.hidden = false;
      sections.caughtUp.forEach(level => {
        const tile = createLevelTile(level, false); // never actionable - future dates
        els.caughtUpGrid.appendChild(tile);
      });
    } else {
      els.caughtUpSection.hidden = true;
    }
  }

  function render() {
    // main visibility
    els.welcome.hidden = true;
    els.sectionedGrid.hidden = false;
    els.undoToaster.hidden = true; // Ensure undo toaster starts hidden

    renderHeader();
    renderStatus();
    renderSectionedGrid();
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

  els.undoBtn?.addEventListener('click', executeUndo);

  // On load, set theme select
  function syncThemeSelect() {
    const theme = state?.settings?.theme || 'system';
    els.themeSelect.value = theme;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Recompute display if date changed
      renderHeader();
      renderStatus();
      renderSectionedGrid();
    }
  });

  // Start
  bootstrap();
  syncThemeSelect();
})();