# 🏆 Fitness Competition Tracker - Desktop App

A desktop application for tracking fitness competitions with customizable challenge duration, activity logging with time tracking, and automatic local data storage.

## Features

- **Customizable Challenge Duration** - Set any number of days (30, 60, 90, etc.)
- **Activity Time Tracking** - Log how many minutes each workout was
- **Automatic Local Storage** - Data saves to your computer automatically
- **Proof Tracking** - Track photo/video/link proof uploads
- **Bonus Goals** - Water intake and walking with friends
- **Full Scoreboard** - Rankings, streaks, and detailed stats

## Setup Instructions

### 1. Install Node.js

Download and install Node.js from: https://nodejs.org/ (LTS version recommended)

### 2. Install Dependencies

Open a terminal in this folder and run:

```bash
npm install
```

### 3. Run the App

```bash
npm start
```

The app will open as a desktop window!

## Building for Distribution

To create an executable that you can share:

**Windows:**
```bash
npm run build-win
```

**Mac:**
```bash
npm run build-mac
```

**Linux:**
```bash
npm run build-linux
```

The built app will be in the `dist` folder.

## Data Storage

Your data is automatically saved to:
- **Windows:** `%APPDATA%/fitness-competition-tracker/fitness-data.json`
- **Mac:** `~/Library/Application Support/fitness-competition-tracker/fitness-data.json`
- **Linux:** `~/.config/fitness-competition-tracker/fitness-data.json`

## Points System

| Activity | Points |
|----------|--------|
| 🎯 Daily Workout | 1 point |
| 💧 2L Water Goal | 1 point |
| 👫 Walk with Friend | 1 point |

## Project Structure

```
fitness-electron/
├── main.js          # Electron main process
├── preload.js       # Secure bridge to renderer
├── package.json     # Dependencies & scripts
├── src/
│   ├── index.html   # Main HTML file
│   ├── styles.css   # All styling
│   └── app.js       # Application logic
```

## Requirements

- Node.js 18 or higher
- npm (comes with Node.js)

## Troubleshooting

**App won't start:**
- Make sure Node.js is installed: `node --version`
- Try deleting `node_modules` and running `npm install` again

**Data not saving:**
- Check that the app has permission to write to your user folder
- Try running as administrator (Windows) or with sudo (Mac/Linux)
