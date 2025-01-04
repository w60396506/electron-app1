const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

let mainWindow = null;
let isQuitting = false;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 930,
        height: 683,
        frame: false,
        transparent: true,
        resizable: false,
        backgroundColor: 'rgba(0,0,0,0)',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
            enableWebAudio: true,
            // Mac 下需要这些权限
            sandbox: false,
            allowRunningInsecureContent: true
        }
    });

    // Mac 下的权限设置
    if (process.platform === 'darwin') {
        // 设置 Mac 下的媒体权限
        mainWindow.webContents.on('media-started-playing', () => {
            try {
                app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
            } catch (error) {
                console.error('Error setting autoplay policy:', error);
            }
        });
    }

    // 设置权限请求处理
    mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        callback(true);
    });

    mainWindow.loadFile('src/index.html');

    // 处理窗口关闭
    mainWindow.on('close', (e) => {
        if (!isQuitting) {
            e.preventDefault();
            mainWindow.hide();
        } else {
            // 在真正关闭前注销所有快捷键
            globalShortcut.unregisterAll();
        }
    });

    // 处理窗口关闭完成
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// 应用准备就绪时创建窗口
app.whenReady().then(() => {
    ensureConfigDirectory();
    createWindow();
});

// 处理所有窗口关闭
app.on('window-all-closed', () => {
    isQuitting = true;
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// 处理应用激活
app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    } else {
        mainWindow.show();
    }
});

// 处理应用退出前的清理
app.on('before-quit', () => {
    isQuitting = true;
    if (mainWindow) {
        try {
            globalShortcut.unregisterAll();
        } catch (error) {
            console.error('Error unregistering shortcuts:', error);
        }
    }
});

// 处理窗口控制
ipcMain.on('close-window', () => {
    try {
        isQuitting = true;
        if (mainWindow) {
            globalShortcut.unregisterAll();
            mainWindow.close();
        }
    } catch (error) {
        console.error('Error closing window:', error);
        app.exit(0);
    }
});

ipcMain.on('minimize-window', () => {
    try {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.minimize();
        }
    } catch (error) {
        console.error('Error minimizing window:', error);
    }
});

// 安全的发送消息到渲染进程
function safeWebContentsCall(callback) {
    try {
        if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
            callback(mainWindow.webContents);
        }
    } catch (error) {
        console.error('Error in webContents call:', error);
    }
}

// 修改注册快捷键的处理
ipcMain.handle('register-hotkey', async (event, { hotkey, buttonId }) => {
    try {
        // Mac 下需要将 CommandOrControl 转换为 Command
        if (process.platform === 'darwin') {
            hotkey = hotkey.replace('CommandOrControl', 'Command');
        }
        
        // 先尝试注销这个快捷键（如果已存在）
        if (globalShortcut.isRegistered(hotkey)) {
            globalShortcut.unregister(hotkey);
        }
        
        // 注册新的快捷键
        const success = globalShortcut.register(hotkey, () => {
            safeWebContentsCall(webContents => {
                webContents.send('hotkey-triggered', buttonId);
            });
        });
        
        console.log('Hotkey registration:', hotkey, success ? 'succeeded' : 'failed');
        return success;
    } catch (error) {
        console.error('Error registering hotkey:', error);
        return false;
    }
});

ipcMain.handle('unregister-hotkey', async (event, hotkey) => {
    try {
        globalShortcut.unregister(hotkey);
        return true;
    } catch (error) {
        console.error('Error unregistering hotkey:', error);
        return false;
    }
});

ipcMain.handle('unregister-all-hotkeys', async () => {
    try {
        globalShortcut.unregisterAll();
        return true;
    } catch (error) {
        console.error('Error unregistering all hotkeys:', error);
        return false;
    }
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

ipcMain.on('test-message', (event) => {
    console.log('收到测试消息');
    event.reply('test-reply', '测试成功');
});

const configPath = path.join(__dirname, 'config', 'sound-config.json');

function ensureConfigDirectory() {
    const configDir = path.join(__dirname, 'config');
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
}

ipcMain.handle('save-config', async (event, config) => {
    try {
        if (!mainWindow || mainWindow.isDestroyed()) {
            return false;
        }
        ensureConfigDirectory();
        console.log('Saving to:', configPath);
        console.log('Config data:', config);
        
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log('Save successful');
        return true;
    } catch (err) {
        console.error('Save config error:', err);
        return false;
    }
});

ipcMain.handle('load-config', async (event) => {
    try {
        ensureConfigDirectory();
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(data);
        }
        return { buttons: [] };
    } catch (err) {
        console.error('Load config error:', err);
        return { buttons: [] };
    }
});

function checkKugouStatus() {
    return new Promise((resolve) => {
        console.log('Checking Kugou status...');
        
        exec('tasklist /FI "IMAGENAME eq KuGou.exe"', (error, stdout) => {
            if (error) {
                console.error('Error checking Kugou process:', error);
                resolve(false);
                return;
            }

            console.log('Tasklist output:', stdout);
            
            if (stdout.toLowerCase().includes('kugou.exe')) {
                exec('powershell "Get-Process KuGou | Select-Object MainWindowTitle"', (error, stdout) => {
                    if (error) {
                        console.error('Error getting Kugou window title:', error);
                        resolve(false);
                        return;
                    }

                    console.log('Window title:', stdout);
                    const isPlaying = stdout.includes('-');
                    console.log('Is Kugou playing?', isPlaying);
                    resolve(isPlaying);
                });
            } else {
                console.log('Kugou process not found');
                resolve(false);
            }
        });
    });
}

ipcMain.handle('check-kugou-status', async () => {
    console.log('Received check-kugou-status request');
    const status = await checkKugouStatus();
    console.log('Sending status back:', status);
    return status;
});

ipcMain.on('control-external-audio', (event, { action }) => {
    console.log('Received control-external-audio action:', action);
    
    if (action === 'pause') {
        exec('taskkill /IM KuGou.exe /F', (error) => {
            if (error) {
                console.error('Error stopping Kugou:', error);
            } else {
                console.log('Successfully stopped Kugou');
            }
        });
    }
});