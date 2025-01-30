import React, { useState, useEffect } from 'react';

import { shortcuts, categories } from './data';
import { registerShortcut, unregisterAllShortcuts } from './shortcutManager';

export default function Shortcuts() {
  console.log('Shortcuts component rendering');

  const [currentCategory, setCurrentCategory] = useState('default');
  const [visibleShortcuts, setVisibleShortcuts] = useState(() => {
    return shortcuts.filter(s => s.category === 'default');
  });
  
  const [registeredShortcuts, setRegisteredShortcuts] = useState([]);
  
  useEffect(() => {
    console.log('Shortcuts component mounting');
    const registered = shortcuts.map(shortcut => {
      console.log('Registering shortcut:', shortcut.name);
      registerShortcut(shortcut);
      return shortcut;
    });
    setRegisteredShortcuts(registered);

    return () => {
      console.log('Shortcuts component unmounting, category:', currentCategory);
      if (registered.length > 0) {
        unregisterAllShortcuts();
      }
    };
  }, []);

  const handleCategoryChange = (category) => {
    console.log('handleCategoryChange called with:', category);
    setCurrentCategory(category);
    const filteredShortcuts = shortcuts.filter(s => s.category === category);
    setVisibleShortcuts(filteredShortcuts);
  };

  return (
    <div>
      <div className="categories">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => handleCategoryChange(category)}
            className={currentCategory === category ? 'active' : ''}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="shortcuts-list">
        {visibleShortcuts.map(shortcut => (
          <div key={shortcut.id} className="shortcut-item">
            <span>{shortcut.name}</span>
            <span>{shortcut.key}</span>
          </div>
        ))}
      </div>
    </div>
  );
} 