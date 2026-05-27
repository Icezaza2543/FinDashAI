const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  createAccount: (payload) => ipcRenderer.invoke('create-account', payload),
  updateAccount: (payload) => ipcRenderer.invoke('update-account', payload),
  deleteAccount: (id) => ipcRenderer.invoke('delete-account', id),
  getBudgets: () => ipcRenderer.invoke('get-budgets'),
  createBudget: (payload) => ipcRenderer.invoke('create-budget', payload),
  updateBudget: (payload) => ipcRenderer.invoke('update-budget', payload),
  deleteBudget: (id) => ipcRenderer.invoke('delete-budget', id),
  getGoals: () => ipcRenderer.invoke('get-goals'),
  createGoal: (payload) => ipcRenderer.invoke('create-goal', payload),
  updateGoal: (payload) => ipcRenderer.invoke('update-goal', payload),
  deleteGoal: (id) => ipcRenderer.invoke('delete-goal', id),
  getUserProfile: () => ipcRenderer.invoke('get-user-profile'),
  updateUserProfile: (payload) => ipcRenderer.invoke('update-user-profile', payload),
  getTransactions: (filter) => ipcRenderer.invoke('get-transactions', filter),
  exportTransactions: () => ipcRenderer.invoke('export-transactions'),
  previewStatement: (filePath) => ipcRenderer.invoke('preview-statement', filePath),
  importStatement: (payload) => ipcRenderer.invoke('import-statement', payload),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
});
