// AccountSystem.js - Account management and persistence
import { Utils } from '../utils/Utils.js';
import { EventSystem } from '../core/EventSystem.js';

export class AccountSystem {
    constructor() {
        this.currentAccount = null;
        this.accountStats = this.initializeStats();
        this.achievementSystem = new AchievementSystem();
        this.sessionData = this.initializeSession();
        this.loginStreak = 0;
        this.lastLoginDate = null;
        
        this.loadAccount();
    }

    // Core account functions
    createAccount(username, email = null) {
        if (!this.validateUsername(username)) {
            throw new Error('Invalid username');
        }

        const accountId = this.generateAccountId();
        const accountData = this.initializeAccountData(username, email, accountId);
        
        this.currentAccount = accountData;
        this.saveAccountLocally();
        
        EventSystem.emit('accountCreated', { account: this.currentAccount });
        return accountData;
    }

    loadAccount(accountId = null) {
        try {
            const accountData = this.retrieveAccountData(accountId);
            if (accountData && this.validateAccountData(accountData)) {
                this.currentAccount = this.migrateOldSave(accountData);
                this.setCurrentAccount();
                this.checkDailyLogin();
                EventSystem.emit('accountLoaded', { account: this.currentAccount });
                return true;
            }
        } catch (error) {
            console.warn('Failed to load account:', error);
        }
        
        // Create default account if none exists
        this.createDefaultAccount();
        return false;
    }

    updateAccountStats(statType, value) {
        if (!this.currentAccount) return;

        this.incrementStat(statType, value);
        this.checkAchievements();
        this.updateLeaderboards();
        this.triggerStatEvents(statType, value);
        
        // Auto-save every 10 stat updates
        this.statUpdateCounter = (this.statUpdateCounter || 0) + 1;
        if (this.statUpdateCounter % 10 === 0) {
            this.saveAccountProgress();
        }
    }

    // Account data management
    initializeAccountData(username, email, accountId) {
        return {
            id: accountId,
            username: username,
            email: email,
            createdAt: Date.now(),
            lastLogin: Date.now(),
            level: 1,
            experience: 0,
            coins: 100, // Starting coins
            platinumCoins: 1, // Starting premium currency
            prestigeLevel: 0,
            prestigePoints: 0,
            loginStreak: 1,
            
            // Statistics
            statistics: {
                totalMassConsumed: 0,
                gamesPlayed: 0,
                gamesWon: 0,
                highestMass: 0,
                highestLevel: 1,
                totalPlayTime: 0,
                cellsSplit: 0,
                foodEaten: 0,
                playersAbsorbed: 0,
                timesAbsorbed: 0,
                powerupsUsed: 0,
                coinsEarned: 0,
                platinumCoinsEarned: 1
            },
            
            // Unlocked content
            unlockedItems: {
                skins: ['default'],
                trails: [],
                colors: ['default'],
                bots: [],
                powerups: ['recombine']
            },
            
            // Achievements
            achievements: {
                unlocked: [],
                progress: {}
            },
            
            // Settings
            settings: {
                soundEnabled: true,
                musicEnabled: true,
                showFPS: false,
                autoRecombine: false,
                showGrid: true,
                particleEffects: true
            },
            
            // Game preferences
            preferences: {
                defaultSkin: 'default',
                defaultColor: 'default',
                defaultName: username
            }
        };
    }

    initializeStats() {
        return {
            sessionStartTime: Date.now(),
            sessionMassConsumed: 0,
            sessionGamesPlayed: 0,
            sessionHighScore: 0,
            sessionCoinsEarned: 0
        };
    }

    initializeSession() {
        return {
            startTime: Date.now(),
            currentGame: null,
            gameStartTime: null,
            lastSaveTime: Date.now()
        };
    }

    // Validation functions
    validateUsername(username) {
        if (!username || typeof username !== 'string') return false;
        if (username.length < 2 || username.length > 20) return false;
        if (!/^[a-zA-Z0-9_-]+$/.test(username)) return false;
        return true;
    }

    validateAccountData(data) {
        const required = ['id', 'username', 'createdAt', 'statistics', 'unlockedItems'];
        return required.every(field => data.hasOwnProperty(field));
    }

    generateAccountId() {
        return 'acc_' + Utils.generateId() + '_' + Date.now();
    }

    // Data persistence (in-memory for GitHub Pages)
    saveAccountLocally() {
        if (!this.currentAccount) return;
        
        const saveData = this.serializeAccountData();
        const compressedData = this.compressAccountData(saveData);
        
        // In real implementation, would use localStorage
        // localStorage.setItem('agarCloneAccount', compressedData);
        this.backupAccountData(compressedData);
        this.writeToStorage(compressedData);
        
        this.sessionData.lastSaveTime = Date.now();
        EventSystem.emit('accountSaved', { account: this.currentAccount });
    }

    retrieveAccountData(accountId = null) {
        // In real implementation, would retrieve from localStorage
        // const saved = localStorage.getItem('agarCloneAccount');
        
        // For GitHub Pages, return stored data or null
        return this.storedAccountData || null;
    }

    serializeAccountData() {
        if (!this.currentAccount) return null;
        
        return {
            ...this.currentAccount,
            lastLogin: Date.now(),
            version: '1.0.0'
        };
    }

    compressAccountData(data) {
        // Simple compression - in real app might use actual compression
        return JSON.stringify(data);
    }

    backupAccountData(data) {
        // Create backup copy
        this.accountBackup = data;
    }

    writeToStorage(data) {
        // Store in memory for GitHub Pages
        this.storedAccountData = JSON.parse(data);
    }

    // Account progression
    trackGameSession(sessionData) {
        if (!this.currentAccount) return;

        this.recordSessionStats(sessionData);
        const rewards = this.calculateSessionRewards(sessionData);
        this.updateBestScores(sessionData);
        this.saveProgressionData();
        
        EventSystem.emit('sessionTracked', { sessionData, rewards });
        return rewards;
    }

    recordSessionStats(sessionData) {
        const stats = this.currentAccount.statistics;
        
        stats.gamesPlayed++;
        stats.totalMassConsumed += sessionData.massConsumed || 0;
        stats.totalPlayTime += sessionData.playTime || 0;
        stats.cellsSplit += sessionData.cellsSplit || 0;
        stats.foodEaten += sessionData.foodEaten || 0;
        stats.playersAbsorbed += sessionData.playersAbsorbed || 0;
        stats.powerupsUsed += sessionData.powerupsUsed || 0;
        
        if (sessionData.won) {
            stats.gamesWon++;
        }
        
        if (sessionData.finalMass > stats.highestMass) {
            stats.highestMass = sessionData.finalMass;
        }
        
        if (sessionData.finalLevel > stats.highestLevel) {
            stats.highestLevel = sessionData.finalLevel;
        }
    }

    calculateSessionRewards(sessionData) {
        const baseCoins = Math.floor((sessionData.massConsumed || 0) / 100);
        const timeBonus = Math.floor((sessionData.playTime || 0) / 60000); // 1 coin per minute
        const levelBonus = (sessionData.finalLevel || 1) * 5;
        const winBonus = sessionData.won ? 50 : 0;
        
        const totalCoins = baseCoins + timeBonus + levelBonus + winBonus;
        
        // Platinum coins for special achievements
        let platinumCoins = 0;
        if (sessionData.massConsumed > 10000) platinumCoins += 1;
        if (sessionData.playersAbsorbed > 10) platinumCoins += 1;
        if (sessionData.won) platinumCoins += 1;
        
        // Apply rewards
        this.currentAccount.coins += totalCoins;
        this.currentAccount.platinumCoins += platinumCoins;
        
        this.currentAccount.statistics.coinsEarned += totalCoins;
        this.currentAccount.statistics.platinumCoinsEarned += platinumCoins;
        
        return {
            coins: totalCoins,
            platinumCoins: platinumCoins,
            experience: sessionData.experienceGained || 0
        };
    }

    updateBestScores(sessionData) {
        // Update personal bests
        if (sessionData.finalMass > this.currentAccount.statistics.highestMass) {
            this.currentAccount.statistics.highestMass = sessionData.finalMass;
            EventSystem.emit('newPersonalBest', { type: 'mass', value: sessionData.finalMass });
        }
        
        if (sessionData.finalLevel > this.currentAccount.statistics.highestLevel) {
            this.currentAccount.statistics.highestLevel = sessionData.finalLevel;
            EventSystem.emit('newPersonalBest', { type: 'level', value: sessionData.finalLevel });
        }
    }

    saveProgressionData() {
        this.saveAccountLocally();
    }

    // Daily login and streaks
    checkDailyLogin() {
        if (!this.currentAccount) return;
        
        const now = new Date();
        const lastLogin = new Date(this.currentAccount.lastLogin);
        const daysDiff = Math.floor((now - lastLogin) / (1000 * 60 * 60 * 24));
        
        if (daysDiff >= 1) {
            this.processDailyLogin(daysDiff);
        }
    }

    processDailyLogin(daysDiff) {
        if (daysDiff === 1) {
            // Consecutive day
            this.currentAccount.loginStreak++;
        } else {
            // Streak broken
            this.currentAccount.loginStreak = 1;
        }
        
        // Daily rewards
        const rewards = this.calculateDailyRewards();
        this.applyDailyRewards(rewards);
        
        this.currentAccount.lastLogin = Date.now();
        
        EventSystem.emit('dailyLogin', { 
            streak: this.currentAccount.loginStreak,
            rewards: rewards
        });
    }

    calculateDailyRewards() {
        const streak = this.currentAccount.loginStreak;
        let coins = 25; // Base daily reward
        let platinumCoins = 0;
        
        // Streak bonuses
        if (streak >= 7) platinumCoins += 1;
        if (streak >= 14) platinumCoins += 1;
        if (streak >= 30) platinumCoins += 2;
        
        // Weekly bonus
        if (streak % 7 === 0) {
            coins += 50;
            platinumCoins += 1;
        }
        
        return { coins, platinumCoins };
    }

    applyDailyRewards(rewards) {
        this.currentAccount.coins += rewards.coins;
        this.currentAccount.platinumCoins += rewards.platinumCoins;
        
        this.currentAccount.statistics.coinsEarned += rewards.coins;
        this.currentAccount.statistics.platinumCoinsEarned += rewards.platinumCoins;
    }

    // Helper functions
    incrementStat(statType, value) {
        if (!this.currentAccount || !this.currentAccount.statistics) return;
        
        if (this.currentAccount.statistics.hasOwnProperty(statType)) {
            this.currentAccount.statistics[statType] += value;
        }
    }

    checkAchievements() {
        this.achievementSystem.checkAchievements(this.currentAccount);
    }

    updateLeaderboards() {
        // Update global leaderboards (would be server-side in real implementation)
        EventSystem.emit('leaderboardUpdate', {
            player: this.currentAccount.username,
            stats: this.currentAccount.statistics
        });
    }

    triggerStatEvents(statType, value) {
        EventSystem.emit('statUpdated', { statType, value, newTotal: this.currentAccount.statistics[statType] });
        
        // Trigger milestone events
        const total = this.currentAccount.statistics[statType];
        const milestones = [100, 500, 1000, 5000, 10000, 50000];
        
        for (const milestone of milestones) {
            if (total - value < milestone && total >= milestone) {
                EventSystem.emit('milestone', { statType, milestone });
                break;
            }
        }
    }

    setCurrentAccount() {
        if (this.currentAccount) {
            EventSystem.emit('accountSet', { account: this.currentAccount });
        }
    }

    createDefaultAccount() {
        const defaultUsername = 'Player_' + Utils.generateId().substr(0, 6);
        this.createAccount(defaultUsername);
    }

    migrateOldSave(accountData) {
        // Handle version migrations
        if (!accountData.version || accountData.version < '1.0.0') {
            // Add new fields that didn't exist in older versions
            if (!accountData.prestigeLevel) accountData.prestigeLevel = 0;
            if (!accountData.prestigePoints) accountData.prestigePoints = 0;
            if (!accountData.loginStreak) accountData.loginStreak = 1;
            if (!accountData.settings) {
                accountData.settings = {
                    soundEnabled: true,
                    musicEnabled: true,
                    showFPS: false,
                    autoRecombine: false,
                    showGrid: true,
                    particleEffects: true
                };
            }
            accountData.version = '1.0.0';
        }
        
        return accountData;
    }

    // Public API methods
    getCurrentAccount() {
        return this.currentAccount;
    }

    isLoggedIn() {
        return this.currentAccount !== null;
    }

    getAccountStats() {
        return this.currentAccount ? this.currentAccount.statistics : null;
    }

    getAccountSettings() {
        return this.currentAccount ? this.currentAccount.settings : null;
    }

    updateAccountSettings(settings) {
        if (!this.currentAccount) return false;
        
        this.currentAccount.settings = { ...this.currentAccount.settings, ...settings };
        this.saveAccountLocally();
        EventSystem.emit('settingsUpdated', { settings: this.currentAccount.settings });
        return true;
    }

    saveAccountProgress() {
        this.saveAccountLocally();
    }

    exportAccountData() {
        if (!this.currentAccount) return null;
        
        const exportData = {
            ...this.currentAccount,
            exportedAt: Date.now(),
            version: '1.0.0'
        };
        
        return JSON.stringify(exportData, null, 2);
    }

    importAccountData(jsonData) {
        try {
            const accountData = JSON.parse(jsonData);
            if (this.validateAccountData(accountData)) {
                this.currentAccount = this.migrateOldSave(accountData);
                this.saveAccountLocally();
                EventSystem.emit('accountImported', { account: this.currentAccount });
                return true;
            }
        } catch (error) {
            console.error('Failed to import account data:', error);
        }
        return false;
    }
}

// Achievement System
class AchievementSystem {
    constructor() {
        this.achievements = this.initializeAchievements();
    }

    initializeAchievements() {
        return {
            // Mass achievements
            firstMeal: {
                id: 'firstMeal',
                name: 'First Meal',
                description: 'Eat your first food',
                requirement: { stat: 'foodEaten', value: 1 },
                reward: { coins: 10 },
                unlocked: false
            },
            hundredFood: {
                id: 'hundredFood',
                name: 'Hungry Hippo',
                description: 'Eat 100 food items',
                requirement: { stat: 'foodEaten', value: 100 },
                reward: { coins: 50, platinumCoins: 1 },
                unlocked: false
            },
            firstKill: {
                id: 'firstKill',
                name: 'First Blood',
                description: 'Absorb another player',
                requirement: { stat: 'playersAbsorbed', value: 1 },
                reward: { coins: 25 },
                unlocked: false
            },
            massiveCell: {
                id: 'massiveCell',
                name: 'Massive Cell',
                description: 'Reach 1000 mass',
                requirement: { stat: 'highestMass', value: 1000 },
                reward: { coins: 100, platinumCoins: 1 },
                unlocked: false
            },
            
            // Game achievements
            firstWin: {
                id: 'firstWin',
                name: 'Victory!',
                description: 'Win your first game',
                requirement: { stat: 'gamesWon', value: 1 },
                reward: { coins: 50, platinumCoins: 1 },
                unlocked: false
            },
            tenWins: {
                id: 'tenWins',
                name: 'Dominator',
                description: 'Win 10 games',
                requirement: { stat: 'gamesWon', value: 10 },
                reward: { coins: 200, platinumCoins: 2 },
                unlocked: false
            },
            
            // Time achievements
            hourPlayed: {
                id: 'hourPlayed',
                name: 'Dedicated',
                description: 'Play for 1 hour total',
                requirement: { stat: 'totalPlayTime', value: 3600000 }, // 1 hour in ms
                reward: { coins: 100 },
                unlocked: false
            },
            
            // Special achievements
            splitMaster: {
                id: 'splitMaster',
                name: 'Split Master',
                description: 'Split 100 times',
                requirement: { stat: 'cellsSplit', value: 100 },
                reward: { coins: 75, platinumCoins: 1 },
                unlocked: false
            },
            powerupAddict: {
                id: 'powerupAddict',
                name: 'Power User',
                description: 'Use 50 powerups',
                requirement: { stat: 'powerupsUsed', value: 50 },
                reward: { coins: 100 },
                unlocked: false
            }
        };
    }

    checkAchievements(account) {
        if (!account || !account.statistics) return;

        const newUnlocks = [];

        for (const [id, achievement] of Object.entries(this.achievements)) {
            if (achievement.unlocked || account.achievements.unlocked.includes(id)) {
                continue;
            }

            const currentValue = account.statistics[achievement.requirement.stat] || 0;
            if (currentValue >= achievement.requirement.value) {
                this.unlockAchievement(account, achievement);
                newUnlocks.push(achievement);
            }
        }

        if (newUnlocks.length > 0) {
            EventSystem.emit('achievementsUnlocked', { achievements: newUnlocks });
        }
    }

    unlockAchievement(account, achievement) {
        achievement.unlocked = true;
        account.achievements.unlocked.push(achievement.id);

        // Apply rewards
        if (achievement.reward.coins) {
            account.coins += achievement.reward.coins;
            account.statistics.coinsEarned += achievement.reward.coins;
        }
        if (achievement.reward.platinumCoins) {
            account.platinumCoins += achievement.reward.platinumCoins;
            account.statistics.platinumCoinsEarned += achievement.reward.platinumCoins;
        }

        EventSystem.emit('achievementUnlocked', { achievement });
    }

    getAchievementProgress(account, achievementId) {
        const achievement = this.achievements[achievementId];
        if (!achievement || !account) return null;

        const currentValue = account.statistics[achievement.requirement.stat] || 0;
        const requiredValue = achievement.requirement.value;
        const progress = Math.min(currentValue / requiredValue, 1);

        return {
            achievement,
            currentValue,
            requiredValue,
            progress,
            unlocked: account.achievements.unlocked.includes(achievementId)
        };
    }

    getAllAchievements() {
        return this.achievements;
    }
}
