(() => {
  'use strict';

  const STORAGE_KEY = 'leitnerScheduleV2';
  const INTERVALS = [1, 2, 4, 8, 16, 32, 64]; // for levels 1..7

  // Elements
  const els = {
    dayCounter: document.getElementById('dayCounter'),
    reviewBtn: document.getElementById('reviewBtn'),
    backlogBtn: document.getElementById('backlogBtn'),
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

  // --- Date helpers ---
  function toDate(str) {
    const [y,m,d] = str.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setHours(0,0,0,0);
    return dt;
  }
  function fmtDate(dt) {
    const y = dt.getFullYear();
    const m = String(dt.getMonth()+1).padStart(2,'0');
    const d = String(dt.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }
  function todayStr() {
    const dt = new Date();
    dt.setHours(0,0,0,0);
    return fmtDate(dt);
  }
  function addDays(dateStr, days) {
    const dt = toDate(dateStr);
    dt.setDate(dt.getDate() + days);
    return fmtDate(dt);
  }
  function diffDays(aStr, bStr) {
    const a = toDate(aStr), b = toDate(bStr);
    return Math.round((b - a) / (1000*60*60*24));
  }

  // --- Storage ---
  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
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
        version: 2
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
    els.backlogBtn.hidden = true;
    els.reviewBtn.hidden = true;
    els.dayCounter.textContent = '';
    updateFooterVisibility();
  }

  function updateFooterVisibility() {
    // Show footer if any action button is visible
    const hasVisibleActions = !els.reviewBtn.hidden || !els.backlogBtn.hidden;
    
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
      els.backlogBtn.hidden = true;
      updateFooterVisibility();
      return;
    }
    const start = state.settings.startDate;
    const today = todayStr();
    const dayN = diffDays(start, today) + 1;
    els.dayCounter.textContent = `Today: ${today} — Day ${dayN}`;

    const backlog = getBacklogDates();
    if (backlog.length > 0) {
      els.backlogBtn.hidden = false;
      els.reviewBtn.hidden = true;
    } else {
      els.backlogBtn.hidden = true;
      els.reviewBtn.hidden = !anyDueToday();
    }
    
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

  function renderSession(date) {
    els.sessionPanel.hidden = false;
    els.sessionTitle.textContent = `Review for ${date}`;
    els.sessionLevels.innerHTML = '';

    const dueLevels = state.levels.filter(lv => lv.nextDue === date).sort((a,b)=>a.level-b.level);
    const tpl = sessionLevelTpl.content;

    if (dueLevels.length === 0) {
      // Nothing due for that date -> show Finish/Next Day only
      els.sessionFinishBtn.hidden = false;
      els.sessionNextDayBtn.hidden = getBacklogDates().filter(d => d !== date).length === 0;
      return;
    }

    dueLevels.forEach(lv => {
      const node = tpl.cloneNode(true);
      node.querySelector('.level-number').textContent = String(lv.level);
      const btn = node.querySelector('.markBtn');
      const doneTag = node.querySelector('.doneTag');

      const alreadyDone = (lv.lastCompleted === date);
      if (alreadyDone) {
        btn.disabled = true;
        btn.textContent = 'Marked';
        doneTag.hidden = false;
      }

      btn.addEventListener('click', () => {
        // Mark done -> advance nextDue by interval for this level
        const interval = state.settings.intervals[lv.level - 1];
        lv.lastCompleted = date;
        lv.nextDue = addDays(date, interval);
        state.log.push({ date, level: lv.level, ts: Date.now(), action: 'done' });
        save();

        btn.disabled = true;
        btn.textContent = 'Marked';
        doneTag.hidden = false;

        // If all due levels are now marked, show next actions
        const remaining = state.levels.filter(x => x.nextDue === date && x.lastCompleted !== date);
        if (remaining.length === 0) {
          els.sessionNextDayBtn.hidden = getBacklogDates().filter(d => d !== date).length === 0 && todayStr() !== date;
          els.sessionFinishBtn.hidden = !(todayStr() === date || getBacklogDates().filter(d => d !== date).length === 0);
        }
        renderBoard();
        renderStatus();
        renderHeader();
      });

      els.sessionLevels.appendChild(node);
    });

    // Show nav actions depending on what's left
    const remaining = state.levels.filter(x => x.nextDue === date && x.lastCompleted !== date);
    els.sessionNextDayBtn.hidden = remaining.length > 0 || getBacklogDates().filter(d => d !== date).length === 0;
    els.sessionFinishBtn.hidden = remaining.length > 0;
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
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  els.importInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data?.settings || !data?.levels) throw new Error('Invalid file');
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

  els.backlogBtn?.addEventListener('click', () => {
    const backlog = getBacklogDates();
    if (backlog.length === 0) return;
    activeSessionDate = backlog[0];
    els.sessionPanel.hidden = false;
    renderSession(activeSessionDate);
  });

  els.reviewBtn?.addEventListener('click', () => {
    const today = todayStr();
    if (getDueTodayLevels(today).length === 0) return;
    activeSessionDate = today;
    renderSession(activeSessionDate);
  });

  els.sessionStopBtn?.addEventListener('click', () => {
    activeSessionDate = null;
    els.sessionPanel.hidden = true;
  });

  els.sessionNextDayBtn?.addEventListener('click', () => {
    // Move to the next backlog date
    const backlog = getBacklogDates();
    const remaining = backlog.filter(d => d !== activeSessionDate);
    if (remaining.length > 0) {
      activeSessionDate = remaining[0];
      renderSession(activeSessionDate);
    } else {
      // If none left, hide session
      activeSessionDate = null;
      els.sessionPanel.hidden = true;
    }
  });

  els.sessionFinishBtn?.addEventListener('click', () => {
    activeSessionDate = null;
    els.sessionPanel.hidden = true;
    render();
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
        renderSession(activeSessionDate);
      }
    }
  });

  // Start
  bootstrap();
  syncThemeSelect();
})();