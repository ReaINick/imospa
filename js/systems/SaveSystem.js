// js/systems/SaveSystem.js
import { Config } from '../core/Config.js';
import { EventSystem } from '../core/EventSystem.js';
import { Utils } from '../utils/Utils.js';

export class SaveSystem {
    constructor() {
        this.currentSave = null;
        this.autoSaveInterval = Config.SAVE.AUTO_SAVE_INTERVAL;
        this.autoSaveTimer = null;
        this.saveVersion = '1.0.0';
        this.compressionEnabled = true;
        
        this.initializeAutoSave();
    }
    
    initializeAutoSave() {
        if (this.autoSaveInterval > 0) {
            this.autoSaveTimer = setInterval(() => {
                this.autoSave();
            }, this.autoSaveInterval);
        }
    }
    
    createSaveData(player, gameState = {}) {
        const saveData = {
            version: this.saveVersion,
            timestamp: Date.now(),
            player: this.serializePlayer(player),
            gameState: this.serializeGameState(gameState),
            statistics: this.serializeStatistics(player),
            settings: this.serializeSettings(player),
            checksum: null
        };
        
        // Add checksum for integrity verification
        saveData.checksum = this.calculateChecksum(saveData);
        
        return saveData;
    }
    
    serializePlayer(player) {
        return {
            id: player.id,
            name: player.name,
            level: player.level,
            experience: player.experience,
            coins: player.coins,
            platinumCoins: player.platinumCoins,
            prestigeLevel: player.prestigeLevel || 0,
            totalPrestigePoints: player.totalPrestigePoints || 0,
            unlockedItems: player.unlockedItems || [],
            activePowerups: player.activePowerups || [],
            ownedItems: player.ownedItems || [],
            equippedItems: player.equippedItems || {},
            lastDailyReward: player.lastDailyReward || 0,
            consecutiveLoginDays: player.consecutiveLoginDays || 0,
            createdAt: player.createdAt || Date.now(),
            lastPlayed: Date.now()
        };
    }
    
    serializeGameState(gameState) {
        return {
            highScore: gameState.highScore || 0,
            totalGamesPlayed: gameState.totalGamesPlayed || 0,
            totalPlayTime: gameState.totalPlayTime || 0,
            gameSettings: gameState.gameSettings || {},
            preferences: gameState.preferences || {}
        };
    }
    
    serializeStatistics(player) {
        return player.statistics || {
            totalMassConsumed: 0,
            totalCellsAbsorbed: 0,
            totalBotsDestroyed: 0,
            totalPlayersAbsorbed: 0,
            totalDeaths: 0,
            longestSurvivalTime: 0,
            timesReachedMaxLevel: 0,
            totalSplits: 0,
            totalRecombines: 0,
            totalPowerupsUsed: 0,
            currency: {
                totalCoinsEarned: 0,
                totalPlatinumCoinsEarned: 0,
                totalCoinsSpent: 0,
                totalPlatinumCoinsSpent: 0
            }
        };
    }
    
    serializeSettings(player) {
        return player.settings || {
            graphics: {
                particleEffects: true,
                showGrid: true,
                showNames: true,
                showMass: true,
                screenShake: true
            },
            audio: {
                masterVolume: 1.0,
                sfxVolume: 1.0,
                musicVolume: 0.5
            },
            controls: {
                splitKey: 'Space',
                recombineKey: 'KeyR',
                mouseSensitivity: 1.0,
                invertMouse: false
            },
            ui: {
                showLeaderboard: true,
                showMinimap: true,
                showFPS: false,
                chatEnabled: true
            }
        };
    }
    
    save(player, gameState = {}, saveSlot = 'default') {
        try {
            const saveData = this.createSaveData(player, gameState);
            const serializedData = this.serializeData(saveData);
            
            // For GitHub Pages deployment, store in memory
            this.currentSave = serializedData;
            
            // In a real implementation, would save to localStorage:
            // localStorage.setItem(`agario_save_${saveSlot}`, serializedData);
            
            EventSystem.emit('gameSaved', { 
                saveSlot, 
                timestamp: saveData.timestamp,
                player: player.name
            });
            
            return true;
        } catch (error) {
            console.error('Save failed:', error);
            EventSystem.emit('saveFailed', { error: error.message });
            return false;
        }
    }
    
    load(saveSlot = 'default') {
        try {
            // For GitHub Pages, load from memory
            let serializedData = this.currentSave;
            
            // In a real implementation, would load from localStorage:
            // serializedData = localStorage.getItem(`agario_save_${saveSlot}`);
            
            if (!serializedData) {
                return null;
            }
            
            const saveData = this.deserializeData(serializedData);
            
            // Verify save integrity
            if (!this.verifySaveIntegrity(saveData)) {
                throw new Error('Save data corrupted');
            }
            
            // Migrate old save format if needed
            const migratedData = this.migrateSaveData(saveData);
            
            EventSystem.emit('gameLoaded', { 
                saveSlot,
                timestamp: migratedData.timestamp,
                player: migratedData.player.name
            });
            
            return migratedData;
        } catch (error) {
            console.error('Load failed:', error);
            EventSystem.emit('loadFailed', { error: error.message });
            return null;
        }
    }
    
    autoSave() {
        if (this.currentSave) {
            EventSystem.emit('autoSaveTriggered');
            // Auto-save logic would go here
            // This would typically save the current game state
        }
    }
    
    serializeData(data) {
        const jsonString = JSON.stringify(data);
        
        if (this.compressionEnabled) {
            return this.compressString(jsonString);
        }
        
        return jsonString;
    }
    
    deserializeData(serializedData) {
        let jsonString = serializedData;
        
        if (this.compressionEnabled) {
            jsonString = this.decompressString(serializedData);
        }
        
        return JSON.parse(jsonString);
    }
    
    compressString(str) {
        // Simple compression using run-length encoding for repeated characters
        // In a real implementation, you might use LZ-string or similar
        return str.replace(/(.)\1{2,}/g, (match, char) => {
            return `${char}${match.length}`;
        });
    }
    
    decompressString(str) {
        // Decompress run-length encoded string
        return str.replace(/(.)\d+/g, (match, char) => {
            const count = parseInt(match.slice(1));
            return char.repeat(count);
        });
    }
    
    calculateChecksum(data) {
        // Simple checksum calculation
        const str = JSON.stringify(data, (key, value) => {
            if (key === 'checksum') return undefined;
            return value;
        });
        
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return hash.toString(16);
    }
    
    verifySaveIntegrity(saveData) {
        if (!saveData.checksum) return false;
        
        const expectedChecksum = this.calculateChecksum(saveData);
        return saveData.checksum === expectedChecksum;
    }
    
    migrateSaveData(saveData) {
        // Handle migration from older save versions
        const currentVersion = this.saveVersion;
        const saveVersion = saveData.version || '0.0.0';
        
        if (saveVersion === currentVersion) {
            return saveData;
        }
        
        // Perform version-specific migrations
        let migratedData = { ...saveData };
        
        if (this.compareVersions(saveVersion, '1.0.0') < 0) {
            migratedData = this.migrateToV1(migratedData);
        }
        
        migratedData.version = currentVersion;
        return migratedData;
    }
    
    migrateToV1(saveData) {
        // Example migration: add new fields that didn't exist in older versions
        return {
            ...saveData,
            player: {
                ...saveData.player,
                prestigeLevel: saveData.player.prestigeLevel || 0,
                totalPrestigePoints: saveData.player.totalPrestigePoints || 0,
                unlockedItems: saveData.player.unlockedItems || [],
                equippedItems: saveData.player.equippedItems || {}
            },
            statistics: {
                ...saveData.statistics,
                currency: saveData.statistics?.currency || {
                    totalCoinsEarned: 0,
                    totalPlatinumCoinsEarned: 0,
                    totalCoinsSpent: 0,
                    totalPlatinumCoinsSpent: 0
                }
            }
        };
    }
    
    compareVersions(version1, version2) {
        const v1Parts = version1.split('.').map(Number);
        const v2Parts = version2.split('.').map(Number);
        
        for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
            const v1Part = v1Parts[i] || 0;
            const v2Part = v2Parts[i] || 0;
            
            if (v1Part < v2Part) return -1;
            if (v1Part > v2Part) return 1;
        }
        
        return 0;
    }
    
    deleteSave(saveSlot = 'default') {
        try {
            // For GitHub Pages, clear memory
            if (saveSlot === 'default') {
                this.currentSave = null;
            }
            
            // In a real implementation:
            // localStorage.removeItem(`agario_save_${saveSlot}`);
            
            EventSystem.emit('saveDeleted', { saveSlot });
            return true;
        } catch (error) {
            console.error('Delete save failed:', error);
            return false;
        }
    }
    
    getSaveSlots() {
        // For GitHub Pages, return available memory slots
        const slots = [];
        
        if (this.currentSave) {
            slots.push({
                slot: 'default',
                timestamp: Date.now(),
                player: 'Current Save'
            });
        }
        
        // In a real implementation, would scan localStorage:
        // for (let i = 0; i < localStorage.length; i++) {
        //     const key = localStorage.key(i);
        //     if (key.startsWith('agario_save_')) {
        //         // Parse and add to slots
        //     }
        // }
        
        return slots;
    }
    
    exportSave(saveSlot = 'default') {
        const saveData = this.load(saveSlot);
        if (!saveData) return null;
        
        return {
            data: saveData,
            exportedAt: Date.now(),
            version: this.saveVersion
        };
    }
    
    importSave(importData, saveSlot = 'default') {
        try {
            if (!importData.data || !importData.version) {
                throw new Error('Invalid import data');
            }
            
            const saveData = this.migrateSaveData(importData.data);
            const serializedData = this.serializeData(saveData);
            
            // For GitHub Pages, store in memory
            this.currentSave = serializedData;
            
            EventSystem.emit('saveImported', { saveSlot });
            return true;
        } catch (error) {
            console.error('Import failed:', error);
            EventSystem.emit('importFailed', { error: error.message });
            return false;
        }
    }
    
    getSaveSize(saveSlot = 'default') {
        const serializedData = this.currentSave;
        if (!serializedData) return 0;
        
        return new Blob([serializedData]).size;
    }
    
    cleanup() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }
}
