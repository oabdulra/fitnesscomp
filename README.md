# 🏆 Fitness Competition Tracker

A desktop application for tracking fitness competitions with customizable challenge duration, activity logging, proof uploads, and optional health metrics.

## Features

- **Customizable Challenge Duration** - Set any number of days (30, 60, 90, etc.)
- **Activity Time Tracking** - Log workout duration in minutes
- **Proof Uploads** - Upload photos/videos or paste links as proof
- **Bonus Goals** - Track water intake and walking with friends
- **Optional Metrics** - Steps, distance, and weight tracking
- **Full Scoreboard** - Rankings, streaks, and detailed stats
- **Proof Viewing** - View uploaded proofs directly in the app
- **Local Storage** - All data saves automatically to your computer

---

## 🚀 Quick Start

### Prerequisites

1. **Install Node.js** (version 18 or higher)
   - Download from: https://nodejs.org/
   - Choose the LTS (Long Term Support) version
   - Run the installer and follow the prompts

2. **Verify installation** - Open a terminal/command prompt and run:
   ```bash
   node --version
   npm --version
   ```
   Both should display version numbers.

---

## 📦 Installation

### Step 1: Download/Clone the Project

If you have the files as a zip, extract them to a folder on your computer.

### Step 2: Open Terminal in Project Folder

**Windows:**
- Open the project folder in File Explorer
- Click in the address bar, type `cmd`, and press Enter

**Mac:**
- Open Terminal
- Type `cd ` (with a space), then drag the project folder into Terminal
- Press Enter

**VS Code:**
- Open the project folder in VS Code
- Press `` Ctrl+` `` to open the integrated terminal

### Step 3: Install Dependencies

```bash
npm install
```

This downloads Electron and other required packages. It may take a few minutes.

### Step 4: Run the App

```bash
npm start
```

The app window should open!

---

## 🔨 Building an Executable

### Option 1: Build Locally

To create a standalone `.exe` (Windows), `.app` (Mac), or AppImage (Linux):

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

Built files appear in the `dist/` folder.

---

### Option 2: Build Automatically with GitHub Actions

You can set up GitHub to automatically build executables for Windows, Mac, and Linux whenever you push code.

#### Step 1: Create the Workflow File

Create this folder structure in your project:
```
.github/
  workflows/
    build.yml
```

#### Step 2: Add the Build Configuration

Create `.github/workflows/build.yml` with this content:

```yaml
name: Build Electron App

on:
  push:
    branches: [ main ]
    tags:
      - 'v*'
  pull_request:
    branches: [ main ]
  workflow_dispatch:  # Allows manual trigger

jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    
    runs-on: ${{ matrix.os }}
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build for Linux
        if: matrix.os == 'ubuntu-latest'
        run: npm run build-linux
      
      - name: Build for Windows
        if: matrix.os == 'windows-latest'
        run: npm run build-win
      
      - name: Build for Mac
        if: matrix.os == 'macos-latest'
        run: npm run build-mac
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-${{ matrix.os }}
          path: |
            dist/*.exe
            dist/*.dmg
            dist/*.AppImage
            dist/*.zip
          if-no-files-found: ignore

  release:
    needs: build
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')
    
    steps:
      - name: Download all artifacts
        uses: actions/download-artifact@v4
        with:
          path: artifacts
      
      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: artifacts/**/*
          draft: false
          prerelease: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

#### Step 3: Push to GitHub

```bash
git add .
git commit -m "Add GitHub Actions build workflow"
git push
```

#### Step 4: Find Your Builds

1. Go to your GitHub repository
2. Click the **"Actions"** tab
3. Click on the latest workflow run
4. Scroll down to **"Artifacts"** to download the built executables

#### Step 5: Create a Release (Optional)

To automatically create a GitHub Release with downloadable executables:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This creates a release at `https://github.com/YOUR_USERNAME/YOUR_REPO/releases` with all the built files attached.

---

## 📁 Project Structure

```
fitness-electron/
├── main.js              # Electron main process (backend)
├── preload.js           # Secure bridge between main & renderer
├── package.json         # Dependencies and build config
├── .gitignore           # Git ignore rules
├── .github/
│   └── workflows/
│       └── build.yml    # GitHub Actions build config
├── src/
│   ├── index.html       # Main HTML file
│   ├── styles.css       # All styling
│   └── app.js           # Application logic (frontend)
└── dist/                # Built executables (after building)
```

---

## 💾 Data Storage

Your data is automatically saved to:

| OS | Location |
|----|----------|
| Windows | `%APPDATA%/fitness-competition-tracker/fitness-data.json` |
| Mac | `~/Library/Application Support/fitness-competition-tracker/fitness-data.json` |
| Linux | `~/.config/fitness-competition-tracker/fitness-data.json` |

Uploaded proof files are stored in an `uploads` subfolder at the same location.

---

## 🎯 Points System

| Activity | Points |
|----------|--------|
| 🎯 Daily Workout | 1 point |
| 💧 2L Water Goal | 1 point |
| 👫 Walk with Friend | 1 point |

**Optional tracking (no points, personal metrics):**
- 👟 Steps
- 📏 Distance (km)
- ⚖️ Weight

---

## 🛠 Troubleshooting

### "npm is not recognized"
Node.js isn't installed or not in your PATH. Reinstall Node.js and make sure to check "Add to PATH" during installation.

### "npm install" fails
Try deleting the `node_modules` folder and `package-lock.json`, then run `npm install` again.

### App won't start
- Make sure you're in the correct folder (where `package.json` is)
- Try `npm install` again
- Check for error messages in the terminal

### Build fails on Windows
- Install Visual Studio Build Tools: https://visualstudio.microsoft.com/visual-cpp-build-tools/
- Or try: `npm install --global windows-build-tools` (run as Administrator)

### GitHub Actions build fails
- Make sure your `package.json` has the correct build scripts
- Check the Actions log for specific error messages
- Ensure all files are committed and pushed

### Data not saving
- Check that the app has permission to write to your user folder
- Try running as Administrator (Windows) or with sudo (Mac/Linux)

---

## 🔄 Updating the App

If you receive updated files:

1. Replace the changed files in your project folder
2. Run `npm install` (in case dependencies changed)
3. Run `npm start` to test
4. Run `npm run build-win` to create a new executable

---

## 📋 Common Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm start` | Run the app in development |
| `npm run build-win` | Build Windows executable |
| `npm run build-mac` | Build Mac executable |
| `npm run build-linux` | Build Linux executable |

---

## 🎨 Adding a Custom Icon

To add a custom app icon:

1. Create a `build` folder in the project root
2. Add your icons:
   - `build/icon.ico` - Windows (256x256 pixels)
   - `build/icon.icns` - Mac (use an online converter)
   - `build/icon.png` - Linux (512x512 pixels)
3. Rebuild the app

---

## 📄 License

MIT License - Feel free to modify and share!

---

Made by Osama
