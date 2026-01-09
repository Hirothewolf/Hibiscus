/**
 * Hibiscus 🌺 - Electron Main Process
 * Creates a desktop application with embedded server
 */

const { app, BrowserWindow, shell, Menu, Tray, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

const PORT = 3333;
let mainWindow;
let serverProcess;
let tray;

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        title: 'Hibiscus 🌺',
        icon: path.join(__dirname, 'app', 'icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        show: false // Show after ready
    });

    // Remove default menu
    Menu.setApplicationMenu(createMenu());

    // Load the app
    mainWindow.loadURL(`http://localhost:${PORT}`);

    // Show when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Open external links in browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    mainWindow.on('close', (event) => {
        if (process.platform !== 'darwin') {
            event.preventDefault();
            mainWindow.hide();
        }
    });
}

function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Open Gallery Folder',
                    click: () => {
                        const galleryPath = path.join(__dirname, 'app', 'gallery');
                        shell.openPath(galleryPath);
                    }
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' },
                { type: 'separator' },
                { role: 'toggleDevTools' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Pollinations.ai Website',
                    click: () => shell.openExternal('https://pollinations.ai')
                },
                {
                    label: 'API Documentation',
                    click: () => shell.openExternal('https://gen.pollinations.ai')
                },
                { type: 'separator' },
                {
                    label: 'About',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About ArtPollinations Studio',
                            message: 'ArtPollinations Studio',
                            detail: 'Version 1.0.0\n\nAI-powered image and video generation using Pollinations.ai API.\n\n© 2024 ArtPollinations'
                        });
                    }
                }
            ]
        }
    ];

    return Menu.buildFromTemplate(template);
}

function createTray() {
    const iconPath = path.join(__dirname, 'app', 'icon.png');
    tray = new Tray(iconPath);
    
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show App',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                }
            }
        },
        {
            label: 'Open Gallery',
            click: () => {
                shell.openPath(path.join(__dirname, 'app', 'gallery'));
            }
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                app.quit();
            }
        }
    ]);
    
    tray.setToolTip('Hibiscus 🌺');
    tray.setContextMenu(contextMenu);
    
    tray.on('click', () => {
        if (mainWindow) {
            mainWindow.show();
        }
    });
}

function startServer() {
    return new Promise((resolve, reject) => {
        const serverPath = path.join(__dirname, 'app', 'server.js');
        
        serverProcess = spawn(process.execPath, [serverPath], {
            cwd: path.join(__dirname, 'app'),
            env: { ...process.env, PORT: PORT.toString() }
        });
        
        serverProcess.stdout.on('data', (data) => {
            console.log(`Server: ${data}`);
        });
        
        serverProcess.stderr.on('data', (data) => {
            console.error(`Server Error: ${data}`);
        });
        
        serverProcess.on('error', (error) => {
            console.error('Failed to start server:', error);
            reject(error);
        });
        
        // Wait for server to be ready
        const checkServer = setInterval(() => {
            http.get(`http://localhost:${PORT}`, (res) => {
                clearInterval(checkServer);
                resolve();
            }).on('error', () => {
                // Server not ready yet
            });
        }, 100);
        
        // Timeout after 10 seconds
        setTimeout(() => {
            clearInterval(checkServer);
            resolve(); // Try anyway
        }, 10000);
    });
}

function stopServer() {
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
    }
}

// App events
app.whenReady().then(async () => {
    console.log('Starting Hibiscus 🌺...');
    
    try {
        await startServer();
        console.log('Server started on port', PORT);
        
        createWindow();
        createTray();
    } catch (error) {
        console.error('Failed to start:', error);
        dialog.showErrorBox('Startup Error', 'Failed to start the application server.');
        app.quit();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        // Don't quit, keep in tray
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    } else {
        mainWindow.show();
    }
});

app.on('before-quit', () => {
    stopServer();
});

app.on('will-quit', () => {
    stopServer();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    stopServer();
});
