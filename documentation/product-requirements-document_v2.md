# Product Requirements Document (PRD)

**Product:** Leitner Schedule PWA
**Version:** 2.0 (Sectioned Grid Interaction)
**Owner:** Product Manager
**Date:** 2025-08-12

## 1. Purpose

The Leitner Schedule PWA is a lightweight, offline-first web app to **track the review schedule** for a physical 7-level Leitner box.
It ensures reviews are completed **in the correct order** by displaying levels in a **sectioned, date-sorted grid** where only one level is actionable at a time.
The app does not store or display flashcards — it only tracks when each level should be reviewed.

## 2. Goals & Key Principles

* **Main UI = Level Grid** — no separate review screens.
* **Enforce Order via Sorting:** Only the earliest due level is actionable.
* **Sectioned Layout:**

  1. **Next Up** — earliest due, actionable.
  2. **Others Due** — other past/today due levels, non-actionable until they move to Next Up.
  3. **Caught Up, see you tomorrow!** — future-due levels.
* **Immediate Feedback** with undo option after marking done.
* **Local-Only** — no accounts, no server calls.
* **PWA** — installable and fully offline.

## 3. User Roles

**Single role:** User (self-study)

* Creates personal schedule.
* Marks levels as done when physical review is completed.
* May stop at any time.
* Can reset schedule, change theme, and export/import data.

## 4. Functional Requirements

### 4.1 First-Time Setup

* Show **Welcome Screen** on first visit:

  * Short description of purpose.
  * **[Start New Schedule]** button.
* Schedule is created only when the button is tapped:

  * `startDate = today`
  * 7 levels (1–7) with intervals `[1, 2, 4, 8, 16, 32, 64]`.
  * `nextDue = startDate + (interval - 1)` days for each level.

### 4.2 Main Screen – Sectioned Level Grid

**Sections:**

1. **Next Up**

   * Contains exactly one level: the earliest due (past or today).
   * Card displays:

     * Level number (L1–L7).
     * Next due date.
     * Badge: “Due Today” or “Past Due”.
     * **Mark as Done** button.
   * **Action:** Tap Mark as Done →

     * Update `lastCompleted = currentDate`
     * Update `nextDue = currentDate + interval[level]`
     * Save state, re-sort grid, move next due level into *Next Up*.
     * Show **Undo toaster** for a few seconds (revert if tapped).

2. **Others Due**

   * Remaining past/today due levels (sorted ascending by `nextDue`).
   * Card displays:

     * Level number.
     * Next due date.
     * Badge: “Due Today” or “Past Due”.
   * No actionable button — locked until in *Next Up*.

3. **Caught Up, see you tomorrow!**

   * Levels with `nextDue > today` (sorted ascending).
   * Card displays:

     * Level number.
     * Next due date (no badge).
   * If **no due levels** at all:

     * Hide *Next Up* and *Others Due*.
     * Only header: “Caught up, see you tomorrow!”

### 4.3 Ordering Rules

* Always sort all levels by `nextDue` ascending.
* If multiple levels have the same `nextDue`, sort by level number ascending.
* Section assignment updates immediately after every action.

### 4.4 Partial Completion

* User may mark any number of due levels in *Next Up* sequentially, stopping at any time.
* Unmarked due levels remain in place for next session.

### 4.5 Settings

Accessible via ⚙️ in header:

* **Theme:** System / Light / Dark (applies instantly).
* **Export JSON:** Downloads current state.
* **Import JSON:** Upload replaces current state.
* **Reset Schedule:** Confirmation dialog before clearing.

### 4.6 Data Persistence

Store in `localStorage` as JSON:

```json
{
  "settings": {
    "startDate": "YYYY-MM-DD" | null,
    "intervals": [1,2,4,8,16,32,64],
    "theme": "system" | "light" | "dark",
    "version": 3
  },
  "levels": [
    { "level": 1, "nextDue": "YYYY-MM-DD", "lastCompleted": "YYYY-MM-DD" | null },
    ...
  ],
  "log": [ { "date": "YYYY-MM-DD", "level": 3, "ts": 1690000000000, "action": "done" } ]
}
```

## 5. Non-Functional Requirements

* **Performance:** Instant load and updates.
* **Offline:** Works after first load without internet.
* **Responsive:** Optimized for mobile-first but scales to desktop.
* **Accessibility:** Large tap targets, high contrast in all themes.
* **No external dependencies:** Vanilla HTML/CSS/JS.

## 6. PWA Requirements

* **Manifest:** name, short\_name, theme\_color, icons (192px, 512px), display standalone.
* **Service Worker:**

  * Cache `index.html`, `styles.css`, `app.js`, `manifest.json`, icons.
  * Cache-first for static assets.
  * Stale-while-revalidate for app shell.

## 7. Acceptance Criteria

* First-time visit → Welcome Screen → Start Schedule → Levels sorted by due date.
* Main grid shows sections according to rules in 4.2 and 4.3.
* Only topmost due level in *Next Up* is actionable.
* Marking done updates due date, re-sorts grid, and moves new top due level to *Next Up*.
* Undo toaster works and correctly reverts.
* Badges and section headers update correctly after each action.
* “Caught up, see you tomorrow!” appears when no due levels remain.
* App installable and works offline.
