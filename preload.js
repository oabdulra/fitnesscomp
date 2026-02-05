const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  getDataPath: () => ipcRenderer.invoke('get-data-path'),
  exportData: (path) => ipcRenderer.invoke('export-data', path),
  importData: (path) => ipcRenderer.invoke('import-data', path),
  uploadProof: (participantId, date) => ipcRenderer.invoke('upload-proof', participantId, date),
  getProofFile: (filePath) => ipcRenderer.invoke('get-proof-file', filePath),
  openProofFile: (filePath) => ipcRenderer.invoke('open-proof-file', filePath)
});
