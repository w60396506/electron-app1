const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的 API 到渲染进程
contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        send: (channel, ...args) => {
            ipcRenderer.send(channel, ...args);
        },
        on: (channel, func) => {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        },
        invoke: (channel, ...args) => {
            return ipcRenderer.invoke(channel, ...args);
        }
    }
}); 