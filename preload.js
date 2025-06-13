const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectFiles: () => ipcRenderer.invoke('select-files'),
    moveFiles: (data) => ipcRenderer.invoke('move-files', data),
    getEquipments: () => ipcRenderer.invoke('get-equipments'),
    getSequences: (equipmentName) => ipcRenderer.invoke('get-sequences', equipmentName),
    getTasks: () => ipcRenderer.invoke('get-tasks'),
    getBaseFolder: () => ipcRenderer.invoke('get-base-folder'),
    getExistingDates: (params) => ipcRenderer.invoke('get-existing-dates', params),
    getExistingDates: (info) => ipcRenderer.invoke('get-existing-dates', info),
});
