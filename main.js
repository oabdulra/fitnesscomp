const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Data file path - stored in user's app data folder
const userDataPath = app.getPath('userData');
const dataFilePath = path.join(userDataPath, 'fitness-data.json');
const uploadsPath = path.join(userDataPath, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

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
    competition: null,
    participants: []
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

// IPC Handlers
ipcMain.handle('load-data', async () => {
  return loadData();
});

ipcMain.handle('save-data', async (event, data) => {
  return saveData(data);
});

ipcMain.handle('get-data-path', async () => {
  return dataFilePath;
});

// File upload handler
ipcMain.handle('upload-proof', async (event, participantId, date) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Proof File',
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
      { name: 'Videos', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { success: false, canceled: true };
  }

  const sourcePath = result.filePaths[0];
  const ext = path.extname(sourcePath);
  const fileName = `proof_${participantId}_${date}${ext}`;
  const destPath = path.join(uploadsPath, fileName);

  try {
    fs.copyFileSync(sourcePath, destPath);
    
    // Determine file type
    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    let fileType = 'file';
    if (imageExts.includes(ext.toLowerCase())) fileType = 'photo';
    if (videoExts.includes(ext.toLowerCase())) fileType = 'video';

    return { 
      success: true, 
      filePath: destPath,
      fileName: fileName,
      fileType: fileType
    };
  } catch (error) {
    console.error('Error copying file:', error);
    return { success: false, error: error.message };
  }
});

// Get proof file as base64 for display
ipcMain.handle('get-proof-file', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      
      if (imageExts.includes(ext)) {
        const base64 = data.toString('base64');
        const mimeType = ext === '.png' ? 'image/png' : 
                        ext === '.gif' ? 'image/gif' : 
                        ext === '.webp' ? 'image/webp' : 'image/jpeg';
        return { success: true, data: `data:${mimeType};base64,${base64}`, type: 'image' };
      } else {
        return { success: true, filePath: filePath, type: 'video' };
      }
    }
    return { success: false, error: 'File not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Open file in default application
ipcMain.handle('open-proof-file', async (event, filePath) => {
  try {
    const { shell } = require('electron');
    await shell.openPath(filePath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Open external link in browser
ipcMain.handle('open-external-link', async (event, url) => {
  try {
    const { shell } = require('electron');
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
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
