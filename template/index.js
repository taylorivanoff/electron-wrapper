const { app, BrowserWindow, session, Tray, Menu } = require('electron');
const path = require('path');
const { TrayWindowPositioner } = require('electron-traywindow-positioner');

let mainWindow;
let tray;

const appUrl = '{{URL}}';

app.on('ready', () => {
    mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        show: false, // Hide the main window initially
        webPreferences: {
            nodeIntegration: true,
        }
    });

    mainWindow.setMenu(null);

    mainWindow.webContents.on("new-window", function (event, url) {
        event.preventDefault();
        if (url !== "about:blank#blocked") electron.shell.openExternal(url);
    });

    mainWindow.loadURL(appUrl, { userAgent: 'Chrome' });

    session.defaultSession.cookies.on('changed', (event, cookie, cause, removed) => {
        if (!removed) {
            app.setLoginItemSettings({
                openAtLogin: true,
                path: app.getPath('userData'),
                args: [
                    '--authToken=' + cookie.value
                ]
            });
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Create a tray icon with the favicon from the provided URL
    tray = new Tray(path.join(__dirname, 'favicon.ico')); // Replace 'favicon.ico' with the actual favicon file name
    const positioner = new TrayWindowPositioner(tray, mainWindow);

    // Show/hide the main window when clicking on the tray icon
    tray.on('click', () => {
        if (mainWindow.isVisible()) {
            mainWindow.hide();
        } else {
            positioner.moveMainWindowToTrayIcon();
            mainWindow.show();
        }
    });

    // Add a context menu to the tray icon
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show App', click: () => mainWindow.show() },
        { label: 'Quit', click: () => app.quit() }
    ]);
    tray.setContextMenu(contextMenu);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
