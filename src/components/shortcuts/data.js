export const categories = ['default', 'media', 'system'];

export const shortcuts = [
  {
    id: 1,
    name: '播放/暂停',
    key: 'Space',
    category: 'media',
    callback: () => {
      console.log('播放/暂停');
      // 实现播放暂停逻辑
    }
  },
  {
    id: 2,
    name: '下一首',
    key: 'ArrowRight',
    category: 'media',
    callback: () => {
      console.log('下一首');
      // 实现下一首逻辑
    }
  },
  {
    id: 3,
    name: '上一首',
    key: 'ArrowLeft',
    category: 'media',
    callback: () => {
      console.log('上一首');
      // 实现上一首逻辑
    }
  },
  {
    id: 4,
    name: '音量增加',
    key: 'ArrowUp',
    category: 'system',
    callback: () => {
      console.log('音量增加');
      // 实现音量增加逻辑
    }
  },
  {
    id: 5,
    name: '音量减少',
    key: 'ArrowDown',
    category: 'system',
    callback: () => {
      console.log('音量减少');
      // 实现音量减少逻辑
    }
  }
]; 