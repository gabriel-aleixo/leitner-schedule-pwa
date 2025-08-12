# Leitner Schedule PWA

A minimalist Progressive Web App for tracking your **physical 7-level Leitner box** review schedule. This app doesn't store flashcards—it only tracks **when each level should be reviewed** to maintain proper spaced repetition timing.

## 🎯 Purpose

The Leitner Schedule PWA helps you maintain the correct review schedule for a physical Leitner box system with 7 levels. It ensures you review levels in the proper chronological order and never miss important review dates.

## ✨ Key Features

### Grid-First Interface
- **Sectioned Grid Layout**: Levels organized into "Next Up", "Others Due", and "Caught Up" sections
- **Single Action Focus**: Only the earliest due level is actionable at any time
- **Visual Priority**: Clear distinction between urgent, waiting, and future reviews

### Smart Scheduling
- **Chronological Enforcement**: Must complete reviews in oldest-to-newest order
- **Proper Leitner Logic**: Next due date = previous due date + level interval
- **Intervals**: `[1, 2, 4, 8, 16, 32, 64]` days for levels 1-7
- **Backlog Processing**: Systematically work through overdue reviews

### User Experience
- **5-Second Undo**: Revert accidental completions with toast notification
- **Offline-First**: Works completely offline after first load
- **Mobile-Optimized**: Touch-friendly interface with large tap targets
- **Theme Support**: System, Light, and Dark themes

### Data Management
- **Local Storage**: All data stored locally—no accounts or servers
- **Export/Import**: JSON backup and restore functionality
- **Data Migration**: Automatic version upgrades preserve your history

## 🏗️ Architecture

### Frontend Stack
- **Vanilla JavaScript**: No frameworks or dependencies
- **CSS Grid**: Responsive sectioned layout
- **Web APIs**: Service Worker, localStorage, File API

### PWA Features
- **Manifest**: Installable app with icons and theme colors
- **Service Worker**: Cache-first strategy for offline functionality
- **Responsive**: Mobile-first design scaling to desktop

## 🚀 Getting Started

### Prerequisites
- Modern web browser
- Local web server for development

### Installation
1. Clone the repository
2. Serve files locally (e.g., `python -m http.server 8000`)
3. Open `http://localhost:8000` in your browser
4. Click "Start New Schedule" to begin

### First Use
1. **Create Schedule**: Sets today as Day 1 with proper initial due dates
2. **Review Due Levels**: Only the topmost card is actionable
3. **Mark Complete**: Updates due date and moves to next level
4. **Undo Available**: 5-second window to revert changes

## 📺 Demo

https://leitner-box-schedule.netlify.app/

## 📱 Usage

### Daily Workflow
1. Open app to see current review status
2. Complete the single actionable level (marked "Next Up")
3. Continue until all due reviews are finished
4. Future levels shown under "Caught Up"

### Key Behaviors
- **Backlog First**: Must clear old reviews before new ones
- **One at a Time**: Only earliest due level is clickable
- **Proper Intervals**: Each completion advances by level's interval
- **Visual Feedback**: Immediate grid updates and undo options

## 🛠️ Development

### File Structure
```
├── index.html          # Main application shell
├── app.js             # Core application logic
├── styles.css         # Styling and responsive layout
├── sw.js              # Service worker for offline support
├── manifest.json      # PWA configuration
└── icons/            # App icons (192px, 512px)
```

### Key Functions
- `getSectionedLevels()`: Distributes levels into sections
- `markLevelDone()`: Handles completion with undo support
- `renderSectionedGrid()`: Updates UI with current state
- `showUndoToaster()`: Provides 5-second undo window

## 📄 License

This project is open source and available under the MIT License.