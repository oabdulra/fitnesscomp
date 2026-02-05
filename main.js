const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Data file path - stored in user's app data folder
const userDataPath = app.getPath('userData');
const dataFilePath = path.join(userDataPath, 'fitness-data.json');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    titleBarStyle: 'default',
    title: 'Fitness Competition Tracker'
  });

  mainWindow.loadFile('src/index.html');
  
  // Open DevTools in development
  // mainWindow.webContents.openDevTools();
}

// Initialize empty data structure
function getDefaultData() {
  return {
    competition: null, // { name, startDate, durationDays, createdAt }
    participants: [],
    activityLogs: []
  };
}

// Load data from file
function loadData() {
  try {
    if (fs.existsSync(dataFilePath)) {
      const rawData = fs.readFileSync(dataFilePath, 'utf8');
      return JSON.parse(rawData);
    }
  } catch (error) {
    console.error('Error loading data:', error);
  }
  return getDefaultData();
}

// Save data to file
function saveData(data) {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving data:', error);
    return false;
  }
}

// IPC Handlers for renderer process communication
ipcMain.handle('load-data', async () => {
  return loadData();
});

ipcMain.handle('save-data', async (event, data) => {
  return saveData(data);
});

ipcMain.handle('get-data-path', async () => {
  return dataFilePath;
});

ipcMain.handle('export-data', async (event, exportPath) => {
  try {
    const data = loadData();
    fs.writeFileSync(exportPath, JSON.stringify(data, null, 2), 'utf8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('import-data', async (event, importPath) => {
  try {
    const rawData = fs.readFileSync(importPath, 'utf8');
    const data = JSON.parse(rawData);
    saveData(data);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
