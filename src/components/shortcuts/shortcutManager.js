// 存储已注册的快捷键
let registeredShortcuts = new Map();

// 注册快捷键
export const registerShortcut = (shortcut) => {
  const { key, callback } = shortcut;
  console.log('Registering shortcut:', key); // 添加日志
  
  // 如果快捷键已经注册，先移除旧的
  if (registeredShortcuts.has(key)) {
    console.log('Shortcut already exists, updating:', key); // 添加日志
    unregisterShortcut(key);
  }

  // 注册新的快捷键处理函数
  const handler = (event) => {
    if (event.key === key) {
      event.preventDefault();
      console.log('Shortcut triggered:', key); // 添加日志
      callback();
    }
  };

  // 保存快捷键和其处理函数
  registeredShortcuts.set(key, handler);
  
  // 添加事件监听
  document.addEventListener('keydown', handler);
  console.log('Current registered shortcuts:', Array.from(registeredShortcuts.keys())); // 添加日志
};

// 注销单个快捷键
export const unregisterShortcut = (key) => {
  console.log('Unregistering single shortcut:', key); // 添加日志
  const handler = registeredShortcuts.get(key);
  if (handler) {
    document.removeEventListener('keydown', handler);
    registeredShortcuts.delete(key);
  }
};

// 注销所有快捷键
export const unregisterAllShortcuts = () => {
  console.log('Unregistering ALL shortcuts'); // 添加日志
  console.log('Shortcuts being removed:', Array.from(registeredShortcuts.keys())); // 添加日志
  registeredShortcuts.forEach((handler, key) => {
    document.removeEventListener('keydown', handler);
  });
  registeredShortcuts.clear();
};

// 添加新的方法来检查快捷键状态
export const getRegisteredShortcuts = () => {
  return Array.from(registeredShortcuts.keys());
}; 