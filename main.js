const { app, BrowserWindow, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const { exec } = require('child_process');
const fsSync = require('fs');

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
            permissions: [
                'audioCapture',
                'audioOutput',
                'media'
            ]
        }
    });

    // 设置权限请求处理
    mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        callback(true);  // 允许所有权限请求
    });

    // 设置设备权限处理
    mainWindow.webContents.session.setDevicePermissionHandler(() => true);

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
        // 先尝试注销这个快捷键（如果已存在）
        globalShortcut.unregister(hotkey);
        
        // 注册新的快捷键
        const success = globalShortcut.register(hotkey, () => {
            // 发送事件到渲染进程
            event.sender.send('hotkey-triggered', buttonId);
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

// 确保配置目录存在
async function ensureConfigDirectory() {
    const configPath = path.join(app.getPath('userData'), 'config');
    try {
        await fs.access(configPath);
    } catch (err) {
        // 目录不存在，创建它
        await fs.mkdir(configPath, { recursive: true });
    }
    return configPath;
}

// 获取应用程序根目录路径
ipcMain.handle('get-app-path', () => {
    // 在开发环境和生产环境都返回正确的路径
    return app.isPackaged 
        ? path.dirname(app.getPath('exe'))
        : app.getAppPath();
});

// 确保目录存在
ipcMain.handle('ensure-dir', async (event, dirPath) => {
    try {
        await fs.mkdir(dirPath, { recursive: true });
    } catch (err) {
        if (err.code !== 'EEXIST') {
            throw err;
        }
    }
});

// 复制文件
ipcMain.handle('copy-file', async (event, sourcePath, targetPath) => {
    await fs.copyFile(sourcePath, targetPath);
});

// 加载配置
ipcMain.handle('load-config', async () => {
    try {
        const configPath = await ensureConfigDirectory();
        const configFile = path.join(configPath, 'buttons.json');
        
        try {
            await fs.access(configFile);
            const data = await fs.readFile(configFile, 'utf8');
            return JSON.parse(data);
        } catch (err) {
            // 如果文件不存在或无法读取，返回空配置
            return { buttons: [] };
        }
    } catch (err) {
        console.error('Error loading config:', err);
        return { buttons: [] };
    }
});

// 保存配置
ipcMain.handle('save-config', async (event, config) => {
    try {
        const configPath = await ensureConfigDirectory();
        const configFile = path.join(configPath, 'buttons.json');
        await fs.writeFile(configFile, JSON.stringify(config, null, 2));
        return true;
    } catch (err) {
        console.error('Error saving config:', err);
        return false;
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