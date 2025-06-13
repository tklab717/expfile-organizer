const { app, BrowserWindow, ipcMain, dialog, shell} = require('electron');
const path = require('path');
const fs = require('fs');
const { moveAndCloudify } = require('./fileHandler');
const BASE_FOLDER_PATH = path.join(app.getPath('userData'), 'base_folder.json');
const EQUIP_PATH = path.join(app.getPath('userData'), 'equipments.json');
const SEQ_PATH = path.join(app.getPath('userData'), 'sequences.json');
const TASK_FILE = path.join(app.getPath('userData'), 'task_data.json');

function createWindow() {
  const win = new BrowserWindow({
    width: 500,
    height: 700,
    webPreferences: {
      // Node.jsへの橋渡し設定
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile('renderer/index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// 複数ファイル選択
ipcMain.handle('select-files', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
    });
    return result.canceled ? [] : result.filePaths;
  });
  
// ファイル読み込みヘルパー
function readJson(filePath, defaultValue = {}) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      return defaultValue;
    }
  }
  
  // ファイル保存ヘルパー
  function saveJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }
  
    // 設備名一覧を返す
    ipcMain.handle('get-equipments', () => {
        return readJson(EQUIP_PATH, []);
    });
  
  // シーケンス一覧を返す（設備ごと）
  ipcMain.handle('get-sequences', (event, equipmentName) => {
    const map = readJson(SEQ_PATH, {});
    return map[equipmentName] || [];
  });
  
  // 移動時に設備・シーケンスを保存（前ステップの move-files を更新）
  ipcMain.handle('move-files', async (event, { equipment, sequence, task ,selectedDate, files }) => {
    try {
      // 日付形式チェック（例: 2025-06-13）
      const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(selectedDate);
      if (!isValidDate) {
        return { success: false, error: '日付の形式が正しくありません（例: 2025-06-13）' };
      }
      // 保存候補に追加
      const equips = new Set(readJson(EQUIP_PATH, []));
      equips.add(equipment);
      saveJson(EQUIP_PATH, [...equips]);
  
      const seqMap = readJson(SEQ_PATH, {});
      seqMap[equipment] = Array.from(new Set([...(seqMap[equipment] || []), sequence]));
      saveJson(SEQ_PATH, seqMap);

      updateTaskData(task);
  
      // ファイル移動ロジック
      const today = new Date().toISOString().split('T')[0];
      const basePath = path.join(readJson(BASE_FOLDER_PATH, {}).basePath , equipment, sequence,task, selectedDate);
  
      let movedCount = 0;
      for (const file of files) {
        const ext = path.extname(file).slice(1).toLowerCase();
        const destDir = path.join(basePath, ext);
        const destPath = path.join(destDir, path.basename(file));
        moveAndCloudify(file, destPath);
        //fs.mkdirSync(destDir, { recursive: true });
        //fs.renameSync(file, destPath);
        movedCount++;
      }
      // ✅ タスクフォルダを開く
      await shell.openPath(basePath);
      return { success: true, movedCount };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // タスク履歴の更新
function updateTaskData(task) {
    let data = [];
    if (fs.existsSync(TASK_FILE)) {
      data = JSON.parse(fs.readFileSync(TASK_FILE, 'utf8'));
    }
  
    if (!data.includes(task)) {
      data.push(task);
      fs.writeFileSync(TASK_FILE, JSON.stringify(data, null, 2));
    }
}
  
// タスク履歴の取得
ipcMain.handle('get-tasks', async () => {
    try {
      if (!fs.existsSync(TASK_FILE)) return [];
      return JSON.parse(fs.readFileSync(TASK_FILE, 'utf8'));
    } catch (err) {
      console.error('get-tasks error:', err);
      return [];
    }
});

ipcMain.handle('get-base-folder', async () => { 
    // ユーザーに選ばせる
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      message: 'ベースフォルダを選択してください',
    });
  
    if (!result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0];
      fs.writeFileSync(BASE_FOLDER_PATH, JSON.stringify({ basePath: selectedPath }, null, 2));
      return selectedPath;
    }
  
    // キャンセルされた場合 → デフォルトを作成
    const fallbackPath = path.join(app.getPath('documents'), 'MyOrganizedData');
    fs.mkdirSync(fallbackPath, { recursive: true });
    fs.writeFileSync(BASE_FOLDER_PATH, JSON.stringify({ basePath: fallbackPath }, null, 2));
    return fallbackPath;
  });

// 既存の日付一覧を取得
  ipcMain.handle('get-existing-dates', async (event, { equipment, sequence, task }) => {
    const taskPath = path.join(readJson(BASE_FOLDER_PATH, {}).basePath, equipment, sequence, task);
    if (!fs.existsSync(taskPath)) return [];
  
    return fs.readdirSync(taskPath, { withFileTypes: true })
             .filter(dirent => dirent.isDirectory())
             .map(dirent => dirent.name); // 例: ['2025-06-13']
});