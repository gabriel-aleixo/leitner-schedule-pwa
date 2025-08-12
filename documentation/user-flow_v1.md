# Leitner Schedule PWA User Flow

## 1. Design Principles

* **Single Flow Simplicity** – One consistent review process for all scenarios.
* **Chronological Discipline** – Always process oldest backlog before moving to today’s review.
* **Partial Flexibility** – User can partially complete a day’s due levels or stop at any time.
* **Immediate Feedback** – Every action confirms progress in real time.
* **Minimalist Interface** – Only show information and controls relevant to the current review context.

## 2. Core Flow Overview

**Entry Points:**

* **First-time visitor:** Guided into creating a schedule.
* **Returning user:** Lands on **Today View** with backlog and due info, but the **Start Reviews** button always begins at the oldest pending date.

## 3. User Flow Steps

### 3.1 First-Time Setup

1. **Welcome Screen**

   * **UI:** Clean welcome card, short description, and single primary button **[Start New Schedule]**.
   * **Action:** Tap → sets `Day 1`, computes initial due dates, transitions to Today View.
   * **Feedback:** “Schedule created. First review due today.”

### 3.2 Returning User – Today View

**Primary Information:**

* **Header:** Today’s date + “Day N”.
* **Backlog Indicator:** If backlog exists, chip shows “Backlog: X days (oldest: YYYY-MM-DD)”.
* **Status Banner:**

  * Backlog present → “You have X days of pending reviews. Start from oldest: YYYY-MM-DD.”
  * No backlog → “Due today: L2, L4…” or “All caught up”.
* **Level Grid:** Always visible, showing each level’s next due date and “Due today” badges.

**Primary Action:**

* **\[Start Reviews]** → Always begins with oldest due date in backlog.

  * If no backlog, starts with today’s review.

### 3.3 Unified Review Flow

1. **Session View**

   * Title: “Review for YYYY-MM-DD” (always oldest pending date).
   * List of **Due Levels** for that date, each with a large **[Mark Done]** button.
   * Levels already marked show “Done” disabled button with a checkmark and "Undo" button appears.
   * If a level is not due that day, it is not shown.
2. **User Actions:**

   * Mark levels as done after physical review.
   * Can complete all levels for the date, or leave some unmarked (partial completion).
   * Can stop at any time with **\[Finish for now]**.
3. **Progression Logic:**

   * If all levels for the current date are done → app auto-advances to the next oldest pending date.
   * This continues until backlog is cleared.
   * Only then will the session move to today’s due date (if any).
4. **Stopping Mid-Backlog:**

   * If user stops before backlog is cleared, backlog indicator persists in Today View.
   * Next session will resume at the oldest remaining pending date.

### 3.4 Session Completion States

* **Backlog Fully Cleared + Today Completed:**

  * Success message: “✓ All reviews done! See you tomorrow.”
  * Returns to Today View with “All caught up” status.
* **Backlog Fully Cleared but Today Pending:**

  * Flows into today’s review automatically.
  * Ends with the same success message after today’s levels are done.
* **Stopped Mid-Backlog:**

  * Returns to Today View showing remaining backlog days.

### 3.5 Settings & Utilities

Accessible via ⚙️ in header.

* **Theme Selection:** System / Light / Dark.
* **Export/Import JSON:** for backup/restore.
* **Reset Schedule:** with confirmation dialog.
* Closing returns to Today View without disrupting review progress.

## 4. Feedback & Reinforcement

* **Immediate visual change** after marking a level: button changes from “Mark Done” to “Done” with a checkmark and "Undo" button appears, backlog count decrements if relevant.
* **Day completion animation** when all levels for that date are done.
* **Encouraging microcopy** for backlog: “Clearing the path to today…”
* **Success loop** when backlog is cleared and today is completed: celebratory confirmation with streak/day count.

## 5. Interaction Minimization

* One entry point for reviews.
* No decision-making for “which day to start” — system enforces oldest-first.
* Minimal taps: one per level + “Finish” only if stopping early.

## 6. Emotional Experience Goals

* **Clarity:** User always knows why they are reviewing a specific date.
* **Progress Satisfaction:** Each cleared day feels like a step toward “All caught up.”
* **Habit Reinforcement:** The streak counter and positive messages build consistency.