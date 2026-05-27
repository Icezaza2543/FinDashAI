const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const {
  closeDatabase,
  createAccount,
  createBudget,
  createGoal,
  deleteAccount,
  deleteBudget,
  deleteGoal,
  enrichForPreview,
  getAccounts,
  getBudgets,
  getGoals,
  getTransactions,
  getUserProfile,
  importTransactions,
  initDatabase,
  updateAccount,
  updateBudget,
  updateGoal,
  updateUserProfile,
} = require('./database');
const { parseStatementFile } = require('./statementParser');

let mainWindow;

const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173';

function toCsvCell(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`Failed to load ${validatedURL}: ${errorCode} ${errorDescription}`);
  });

  if (!app.isPackaged) {
    mainWindow.loadURL(DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  initDatabase(app.getPath('userData'));
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  closeDatabase();
});

ipcMain.handle('get-accounts', async () => getAccounts());

ipcMain.handle('create-account', async (_event, payload) => createAccount(payload));

ipcMain.handle('update-account', async (_event, payload) => updateAccount(payload?.id, payload));

ipcMain.handle('delete-account', async (_event, id) => deleteAccount(id));

ipcMain.handle('get-budgets', async () => getBudgets());

ipcMain.handle('create-budget', async (_event, payload) => createBudget(payload));

ipcMain.handle('update-budget', async (_event, payload) => updateBudget(payload?.id, payload));

ipcMain.handle('delete-budget', async (_event, id) => deleteBudget(id));

ipcMain.handle('get-goals', async () => getGoals());

ipcMain.handle('create-goal', async (_event, payload) => createGoal(payload));

ipcMain.handle('update-goal', async (_event, payload) => updateGoal(payload?.id, payload));

ipcMain.handle('delete-goal', async (_event, id) => deleteGoal(id));

ipcMain.handle('get-user-profile', async () => getUserProfile());

ipcMain.handle('update-user-profile', async (_event, payload) => updateUserProfile(payload));

ipcMain.handle('get-transactions', async () => getTransactions());

ipcMain.handle('export-transactions', async () => {
  const rows = getTransactions();
  if (rows.length === 0) {
    return { success: false, error: 'ยังไม่มีธุรกรรมสำหรับ export' };
  }

  const result = await dialog.showSaveDialog({
    title: 'Export transactions',
    defaultPath: `findash-transactions-${new Date().toISOString().slice(0, 10)}.csv`,
    filters: [{ name: 'CSV', extensions: ['csv'] }],
  });

  if (result.canceled || !result.filePath) {
    return { success: false, canceled: true };
  }

  const accounts = new Map(getAccounts().map((account) => [account.id, account]));
  const header = ['date', 'title', 'category', 'account', 'institution', 'income_thb', 'expense_thb', 'source'];
  const lines = rows.map((row) => {
    const account = accounts.get(row.account_id);
    return [
      row.date,
      row.title,
      row.category_label,
      account?.name || row.account_id,
      account?.institution || '',
      row.income / 100,
      row.expense / 100,
      row.source,
    ].map(toCsvCell).join(',');
  });

  fs.writeFileSync(result.filePath, `\uFEFF${header.join(',')}\n${lines.join('\n')}`, 'utf8');
  return { success: true, count: rows.length, filePath: result.filePath };
});

ipcMain.handle('preview-statement', async (_event, filePath) => {
  try {
    const parsed = await parseStatementFile(filePath);
    const previewTransactions = enrichForPreview(parsed.transactions).slice(0, 20);

    return {
      success: true,
      count: parsed.count,
      encoding_used: parsed.encoding,
      detected_bank: parsed.detectedBank,
      file_name: parsed.fileName,
      transactions: previewTransactions,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
});

// Handle file import from renderer
ipcMain.handle('import-statement', async (_event, payload) => {
  try {
    const filePath = typeof payload === 'string' ? payload : payload?.filePath;
    const accountId = typeof payload === 'string' ? '' : payload?.accountId;

    if (!filePath || !accountId) {
      throw new Error('กรุณาเลือกไฟล์และบัญชีปลายทางก่อนนำเข้า');
    }

    const parsed = await parseStatementFile(filePath);
    const result = importTransactions({ parsed, accountId });

    return {
      success: true,
      ...result,
      encoding_used: parsed.encoding,
      detected_bank: parsed.detectedBank,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
});

// Open file dialog
ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Statement Files', extensions: ['csv', 'xlsx'] }
    ]
  });

  if (result.canceled) {
    return null;
  }
  return result.filePaths[0];
});
