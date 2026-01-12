/**
 * Hibiscus 🌺 - Electron Main Process
 * Creates a desktop application with embedded server
 */

const { app, BrowserWindow, shell, Menu, dialog } = require('electron');
const path = require('path');
const http = require('http');

const PORT = 3333;
let mainWindow;

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

function getAppBasePath() {
    // When packaged (asar: false), files are in resources/app/
    // When in development, __dirname works fine
    if (app.isPackaged) {
        // With asar disabled, app files are in resources/app/
        return path.join(process.resourcesPath, 'app');
    }
    return __dirname;
}

function createWindow() {
    const basePath = getAppBasePath();
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        title: 'Hibiscus 🌺',
        icon: path.join(basePath, 'app', 'icons', 'png', '256x256.png'),
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
}

function createMenu() {
    const basePath = getAppBasePath();
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Open Gallery Folder',
                    click: () => {
                        const galleryPath = path.join(basePath, 'app', 'gallery');
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

function startServer() {
    return new Promise((resolve, reject) => {
        try {
            const basePath = getAppBasePath();
            const serverPath = path.join(basePath, 'app', 'server.js');
            const appFolder = path.join(basePath, 'app');
            
            console.log('App packaged:', app.isPackaged);
            console.log('Base path:', basePath);
            console.log('Server path:', serverPath);
            console.log('App folder:', appFolder);
            
            // Set environment variables
            process.env.PORT = PORT.toString();
            
            // Change working directory to app folder for correct paths
            process.chdir(appFolder);
            
            // Require the server (this will start it)
            require(serverPath);
            
            // Wait for server to be ready
            const checkServer = setInterval(() => {
                http.get(`http://localhost:${PORT}`, (res) => {
                    clearInterval(checkServer);
                    console.log('Server ready!');
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
            
        } catch (error) {
            console.error('Failed to start server:', error);
            console.error('Error details:', error.stack);
            reject(error);
        }
    });
}

// App events
app.whenReady().then(async () => {
    console.log('Starting Hibiscus 🌺...');
    
    try {
        await startServer();
        console.log('Server started on port', PORT);
        
        createWindow();
    } catch (error) {
        console.error('Failed to start:', error);
        dialog.showErrorBox('Startup Error', 'Failed to start the application server.');
        app.quit();
    }
});

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    } else {
        mainWindow.show();
    }
});

app.on('before-quit', () => {
    // Server runs in same process, will be stopped automatically
});

app.on('will-quit', () => {
    // Server runs in same process, will be stopped automatically
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});
