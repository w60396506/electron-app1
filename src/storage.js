const fs = require('fs');
const path = require('path');
const CryptoJS = require('crypto-js');

class Storage {
    constructor() {
        this.ENCRYPTION_KEY = 'your-secret-key-change-this';
        this.DATA_DIR = path.join(__dirname, '../userdata');
        this.SOUNDS_FILE = path.join(this.DATA_DIR, 'sounds.dat');
        this.SETTINGS_FILE = path.join(this.DATA_DIR, 'settings.dat');

        // 确保数据目录存在
        if (!fs.existsSync(this.DATA_DIR)) {
            fs.mkdirSync(this.DATA_DIR, { recursive: true });
        }

        this.initStorage();
    }

    initStorage() {
        if (!fs.existsSync(this.SETTINGS_FILE)) {
            this.saveSettings(this.getDefaultSettings());
        }
        if (!fs.existsSync(this.SOUNDS_FILE)) {
            this.saveSounds({});
        }
    }

    getDefaultSettings() {
        return {
            theme: 'light',
            audioOutput: 'default',
            volume: 100,
            opacity: 100,
            windowBounds: { width: 1200, height: 800 }
        };
    }

    encrypt(data) {
        return CryptoJS.AES.encrypt(JSON.stringify(data), this.ENCRYPTION_KEY).toString();
    }

    decrypt(encryptedData) {
        try {
            const bytes = CryptoJS.AES.decrypt(encryptedData, this.ENCRYPTION_KEY);
            return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        } catch (error) {
            console.error('解密失败:', error);
            return null;
        }
    }

    saveSettings(settings) {
        fs.writeFileSync(this.SETTINGS_FILE, this.encrypt(settings));
    }

    loadSettings() {
        try {
            const data = fs.readFileSync(this.SETTINGS_FILE, 'utf8');
            return this.decrypt(data) || this.getDefaultSettings();
        } catch (error) {
            return this.getDefaultSettings();
        }
    }

    saveSounds(sounds) {
        fs.writeFileSync(this.SOUNDS_FILE, this.encrypt(sounds));
    }

    loadSounds() {
        try {
            const data = fs.readFileSync(this.SOUNDS_FILE, 'utf8');
            return this.decrypt(data) || {};
        } catch (error) {
            return {};
        }
    }

    saveSound(category, position, name, fileData) {
        const sounds = this.loadSounds();
        if (!sounds[category]) sounds[category] = {};
        sounds[category][position] = { name, fileData };
        this.saveSounds(sounds);
    }

    getSoundsByCategory(category) {
        const sounds = this.loadSounds();
        return sounds[category] || {};
    }
}

module.exports = new Storage(); 