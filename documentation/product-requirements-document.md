# Product Requirements Document (PRD)

**Product:** Leitner Schedule PWA
**Version:** 1.0
**Owner:** Product Manager
**Date:** 2025-08-12

## 1. Purpose

The Leitner Schedule PWA is a lightweight, offline-first web app that helps users track their **physical 7-level Leitner box review schedule**.
The app does **not** store or display flashcards — it only schedules and tracks **when each level should be reviewed**.
It ensures reviews are done in the correct order and gives clear, minimal daily guidance to the user.

## 2. Goals & Key Principles

* Minimalist, **single unified review flow**.
* Enforce **oldest-to-newest processing** when backlog exists.
* Provide **immediate feedback** after each action.
* Fully offline, installable as a PWA.
* Local storage only (no accounts or server).

## 3. User Roles

**Single role:** User (self-study)

* Creates a personal schedule.
* Marks levels as “done” for each due date.
* May stop a review session at any time.
* Can adjust settings, reset schedule, and backup/restore data.

## 4. Functional Requirements

### 4.1 First-Time Setup

* On first visit, show **Welcome Screen** with:

  * Short description of purpose.
  * Single **[Start New Schedule]** button.
* Schedule is **only created** when user taps the button.
* System sets:

  * `startDate = today`
  * 7 levels (1–7) with intervals: `[1, 2, 4, 8, 16, 32, 64]` days.
  * First due date for each = `startDate + (interval - 1)` days.

### 4.2 Today View (Main Screen)

* **Header:**

  * Current date + Day N since start.
* **Status banner:**

  * If backlog: `"You have X days pending. Start from oldest: YYYY-MM-DD."`
  * If no backlog but due today: `"Due today: L2, L4…"`
  * If nothing due: `"All caught up."`
* **Level grid (always visible):**

  * For each level (1–7):

    * Level number.
    * Next due date using relative date format.
    * “Due today” badge if applicable.
    * Color coded using heatmap color indicating how long until due.
* **Primary Action Button:**

  * **[Start Reviews]** — starts at oldest backlog date if any, else today.

### 4.3 Unified Review Flow

* Starts at **oldest pending date** (backlog) or today if no backlog.
* **Session view for that date:**

  * Title: `"Review for YYYY-MM-DD"`.
  * List of levels due on that date.
  * Each level shows **[Mark Done]** if not yet completed for that date.
  * Marking done updates:

    * `lastCompleted = date`
    * `nextDue = date + interval[level]`
    * Saves immediately to localStorage.
    * Changes button to disabled “Done” with a checkmark and "Undo" button appears.
* **Progression:**

  * If all levels for current date are done → move to next oldest date automatically.
  * Continue until backlog is cleared, then move to today’s review.
  * If stopping early: tap **[Finish for now]**, return to Today View.
* **Partial completion allowed:**

  * Incomplete levels remain due for that date until marked done.

### 4.4 Settings

* Access via ⚙️ icon in header.
* Options:

  * **Theme**: System / Light / Dark (applies instantly).
  * **Export JSON** (download file with current state).
  * **Import JSON** (upload file to replace current state).
  * **Reset Schedule**:

    * Confirmation dialog: `"This will erase all data. Cannot be undone."`
    * On confirm: clear state, return to Welcome Screen.

### 4.5 Data Persistence

* Store in `localStorage` as JSON.
* No server interaction.

## 5. Non-Functional Requirements

* **Performance:** Load and respond instantly on modern mobile/desktop browsers.
* **Offline capability:** Works fully offline after first load.
* **Responsive design:** Mobile-first, scales to tablet/desktop.
* **Accessibility:** Large tap targets, clear contrast in Light/Dark modes.
* **No dependencies:** Vanilla HTML/CSS/JS.
* **Versioning:** Increment `version` in settings when making changes that require migration.
* **Updating:** Checks server for updates. If user updates the app, it will prompt to migrate data if version is different.

## 6. PWA Requirements

* **Manifest:** name, short\_name, theme\_color, icons (192px, 512px), standalone display.
* **Service Worker:**

  * Cache shell assets (`index.html`, `styles.css`, `app.js`, `manifest.json`, icons).
  * Cache-first strategy for static files.
  * Stale-while-revalidate for shell.

## 7. Acceptance Criteria

* First-time visit shows Welcome Screen, no schedule until user starts.
* After start:

  * Levels have correct initial due dates.
  * Backlog is calculated correctly from oldest to newest.
  * Starting reviews always begins at oldest due date.
* Marking done updates due date correctly according to interval.
* Backlog cannot be skipped if present.
* Partial completion leaves remaining levels due for that date.
* Settings actions work as described.
* App works offline and is installable.
