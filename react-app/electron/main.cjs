const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');
const isDev = !app.isPackaged;

let mainWindow;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Don't show the window until it's ready, prevents white flash
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    title: "Billing Software",
    icon: path.join(__dirname, '../public/favicon.ico'),
    backgroundColor: '#ffffff', // Match your app's background
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5174');
    // Open DevTools in dev mode
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Failed to load local file:', err);
      // Fallback or error handling
    });
  }

  // Prevent white screen on startup
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  // Handle errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Page failed to load:', errorDescription);
    if (!isDev) {
      // In production, we could show a custom error page
      // mainWindow.loadFile(path.join(__dirname, 'error.html'));
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Security: Disable remote module
app.on('ready', () => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC communication example (if needed)
ipcMain.on('toMain', (event, args) => {
  console.log('Received from renderer:', args);
});
