# Leitner Schedule PWA – User Flow (Grid-First, Sectioned)

## 1. Design Principles

* **Visual Prioritization:** Separate sections communicate urgency and progress at a glance.
* **Action Focus:** Only one actionable card at a time — the *Next Up* card.
* **Progressive Disclosure:** Due levels beyond the current action are visible in *Others Due*, but not actionable yet.
* **Positive Reinforcement:** A dedicated “Caught up” section (or full-grid message) reinforces completion.

## 2. Core Flow Overview

* **Main Screen = Level Grid**, always visible, split into up to three sections:

  1. **Next Up** – Earliest due level (today or past), actionable with **Mark Done** button.
  2. **Others Due** – All other due levels (today or past), locked until they move to *Next Up*.
  3. **Caught Up, see you tomorrow!** – Levels with due dates in the future.

* Levels always sorted by **next due date ascending**.

## 3. User Flow Steps

### 3.1 First-Time Setup

1. **Welcome Screen**:

   * Brief description.
   * **\[Start New Schedule]** button.
2. On tap:

   * Create schedule with Day 1 and intervals `[1, 2, 4, 8, 16, 32, 64]`.
   * Compute initial `nextDue` dates for all levels.
   * Go to Level Grid.

### 3.2 Daily Use – Sectioned Level Grid

#### **A. Next Up Section**

* Shows **exactly one card**: the earliest due level (past or today).
* Displays:

  * Level number.
  * Next due date.
  * Badge: “Due Today” or “Past Due”.
  * **Mark Done** button.
* **Interaction:**

  * Tap **Mark Done** → Update `lastCompleted` and `nextDue`, re-sort grid, move next earliest due level into *Next Up*.
  * Show **Undo toaster** for a few seconds.

#### **B. Others Due Section**

* Shows remaining due levels (past or today), sorted ascending by due date.
* Each card displays:

  * Level number.
  * Next due date.
  * Badge: “Due Today” or “Past Due”.
* **No Mark Done button** — locked until they move to *Next Up*.

---

#### **C. Caught Up, see you tomorrow! Section**

* Shows all levels with due dates in the future.
* Each card displays:

  * Level number.
  * Next due date (no badge).
* If there are **no due levels** at all:

  * Grid hides *Next Up* and *Others Due* sections entirely.
  * Top header = “Caught up, see you tomorrow!”

### 3.3 Flow Rules

1. Grid sections always update immediately after marking a level done.
2. *Others Due* moves up into *Next Up* one at a time.
3. *Caught Up* fills with levels as they’re completed until only future-due levels remain.
4. **Backlog handling is automatic**:

   * Past due levels always appear before today’s due levels.
   * User processes oldest first because only *Next Up* is actionable.

### 3.4 Partial Completion

* User can leave at any time.
* Unfinished due levels remain in *Next Up* / *Others Due* the next time the app is opened.

---

### 3.5 Settings & Utilities

* ⚙️ in header opens settings:

  * Theme: System / Light / Dark.
  * Export/Import JSON.
  * Reset Schedule (confirmation required).

## 4. Feedback & Reinforcement

* **Undo toaster** after marking a level done (few seconds to revert).
* **Section headers** reinforce progress:

  * Multiple sections visible when work remains.
  * Only *Caught Up* visible when finished.
* **Badges** highlight urgency for *Next Up* and *Others Due*.

## 5. Interaction Minimization

* No separate start or review screens — main grid is the working UI.
* One tap per level completion.
* Automatic section updates keep order enforcement implicit.

## 6. Emotional Experience Goals

* **Clarity:** The top card is always what’s next — no decision-making required.
* **Satisfaction:** Visual transition of levels from *Next Up* → *Caught Up* signals progress.
* **Encouragement:** The “Caught up, see you tomorrow!” state is a daily milestone.
