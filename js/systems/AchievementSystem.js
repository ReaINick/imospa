import { EventSystem } from '../core/EventSystem.js';
import { Utils } from '../utils/Utils.js';

export class AchievementSystem {
    constructor() {
        this.eventSystem = EventSystem.getInstance();
        this.achievements = this.initializeAchievements();
        this.playerAchievements = new Map(); // playerId -> Set of achieved IDs
        this.progressTracking = new Map(); // playerId -> progress data
        
        this.setupEventListeners();
    }
    
    initializeAchievements() {
        return {
            // Mass-based achievements
            'first_growth': {
                id: 'first_growth',
                name: 'First Growth',
                description: 'Reach 50 mass',
                type: 'mass',
                requirement: 50,
                reward: { coins: 25, experience: 100 },
                icon: '🌱',
                rarity: 'common'
            },
            
            'getting_bigger': {
                id: 'getting_bigger',
                name: 'Getting Bigger',
                description: 'Reach 200 mass',
                type: 'mass',
                requirement: 200,
                reward: { coins: 100, experience: 500 },
                icon: '💪',
                rarity: 'common'
            },
            
            'massive_cell': {
                id: 'massive_cell',
                name: 'Massive Cell',
                description: 'Reach 1000 mass',
                type: 'mass',
                requirement: 1000,
                reward: { coins: 500, experience: 2500, platinumCoins: 1 },
                icon: '🏆',
                rarity: 'rare'
            },
            
            'leviathan': {
                id: 'leviathan',
                name: 'Leviathan',
                description: 'Reach 5000 mass',
                type: 'mass',
                requirement: 5000,
                reward: { coins: 2000, experience: 10000, platinumCoins: 3 },
                icon: '👑',
                rarity: 'legendary'
            },
            
            // Absorption achievements
            'first_meal': {
                id: 'first_meal',
                name: 'First Meal',
                description: 'Absorb your first food pellet',
                type: 'food_eaten',
                requirement: 1,
                reward: { coins: 10, experience: 50 },
                icon: '🍎',
                rarity: 'common'
            },
            
            'hungry_hippo': {
                id: 'hungry_hippo',
                name: 'Hungry Hippo',
                description: 'Absorb 100 food pellets',
                type: 'food_eaten',
                requirement: 100,
                reward: { coins: 200, experience: 1000 },
                icon: '🦛',
                rarity: 'uncommon'
            },
            
            'vacuum_cleaner': {
                id: 'vacuum_cleaner',
                name: 'Vacuum Cleaner',
                description: 'Absorb 1000 food pellets',
                type: 'food_eaten',
                requirement: 1000,
                reward: { coins: 1000, experience: 5000, platinumCoins: 2 },
                icon: '🌪️',
                rarity: 'epic'
            },
            
            // PvP achievements
            'first_kill': {
                id: 'first_kill',
                name: 'First Kill',
                description: 'Defeat your first opponent',
                type: 'players_defeated',
                requirement: 1,
                reward: { coins: 50, experience: 250 },
                icon: '⚔️',
                rarity: 'common'
            },
            
            'serial_killer': {
                id: 'serial_killer',
                name: 'Serial Killer',
                description: 'Defeat 10 opponents',
                type: 'players_defeated',
                requirement: 10,
                reward: { coins: 300, experience: 1500 },
                icon: '💀',
                rarity: 'uncommon'
            },
            
            'apex_predator': {
                id: 'apex_predator',
                name: 'Apex Predator',
                description: 'Defeat 50 opponents',
                type: 'players_defeated',
                requirement: 50,
                reward: { coins: 1500, experience: 7500, platinumCoins: 3 },
                icon: '🦅',
                rarity: 'epic'
            },
            
            // Survival achievements
            'survivor': {
                id: 'survivor',
                name: 'Survivor',
                description: 'Survive for 5 minutes',
                type: 'survival_time',
                requirement: 300000, // 5 minutes in milliseconds
                reward: { coins: 100, experience: 500 },
                icon: '⏰',
                rarity: 'common'
            },
            
            'marathon_runner': {
                id: 'marathon_runner',
                name: 'Marathon Runner',
                description: 'Survive for 30 minutes',
                type: 'survival_time',
                requirement: 1800000, // 30 minutes
                reward: { coins: 1000, experience: 5000, platinumCoins: 2 },
                icon: '🏃',
                rarity: 'rare'
            },
            
            'immortal': {
                id: 'immortal',
                name: 'Immortal',
                description: 'Survive for 1 hour',
                type: 'survival_time',
                requirement: 3600000, // 1 hour
                reward: { coins: 5000, experience: 25000, platinumCoins: 10 },
                icon: '♾️',
                rarity: 'legendary'
            },
            
            // Splitting achievements
            'split_personality': {
                id: 'split_personality',
                name: 'Split Personality',
                description: 'Perform your first split',
                type: 'splits_performed',
                requirement: 1,
                reward: { coins: 25, experience: 100 },
                icon: '🪓',
                rarity: 'common'
            },
            
            'division_master': {
                id: 'division_master',
                name: 'Division Master',
                description: 'Perform 100 splits',
                type: 'splits_performed',
                requirement: 100,
                reward: { coins: 500, experience: 2500 },
                icon: '🎯',
                rarity: 'uncommon'
            },
            
            // Special achievements
            'speed_demon': {
                id: 'speed_demon',
                name: 'Speed Demon',
                description: 'Use speed boost 50 times',
                type: 'powerups_used',
                requirement: 50,
                subType: 'speed_boost',
                reward: { coins: 300, experience: 1500 },
                icon: '⚡',
                rarity: 'uncommon'
            },
            
            'reunion_master': {
                id: 'reunion_master',
                name: 'Reunion Master',
                description: 'Use recombine powerup 25 times',
                type: 'powerups_used',
                requirement: 25,
                subType: 'recombine',
                reward: { coins: 400, experience: 2000, platinumCoins: 1 },
                icon: '🔄',
                rarity: 'rare'
            },
            
            'leaderboard_king': {
                id: 'leaderboard_king',
                name: 'Leaderboard King',
                description: 'Reach #1 on the leaderboard',
                type: 'leaderboard_position',
                requirement: 1,
                reward: { coins: 1000, experience: 5000, platinumCoins: 5 },
                icon: '👑',
                rarity: 'epic'
            },
            
            'top_five': {
                id: 'top_five',
                name: 'Top Five',
                description: 'Reach top 5 on the leaderboard',
                type: 'leaderboard_position',
                requirement: 5,
                reward: { coins: 200, experience: 1000 },
                icon: '🏅',
                rarity: 'uncommon'
            },
            
            'millionaire': {
                id: 'millionaire',
                name: 'Millionaire',
                description: 'Accumulate 10,000 coins',
                type: 'total_coins_earned',
                requirement: 10000,
                reward: { coins: 2000, experience: 10000, platinumCoins: 5 },
                icon: '💰',
                rarity: 'epic'
            },
            
            'shopaholic': {
                id: 'shopaholic',
                name: 'Shopaholic',
                description: 'Make 50 shop purchases',
                type: 'shop_purchases',
                requirement: 50,
                reward: { coins: 500, experience: 2500, platinumCoins: 2 },
                icon: '🛒',
                rarity: 'rare'
            },
            
            'level_up': {
                id: 'level_up',
                name: 'Level Up',
                description: 'Reach level 5',
                type: 'level',
                requirement: 5,
                reward: { coins: 100, experience: 500 },
                icon: '📈',
                rarity: 'common'
            },
            
            'veteran': {
                id: 'veteran',
                name: 'Veteran',
                description: 'Reach level 25',
                type: 'level',
                requirement: 25,
                reward: { coins: 1000, experience: 5000, platinumCoins: 3 },
                icon: '🎖️',
                rarity: 'rare'
            },
            
            'legend': {
                id: 'legend',
                name: 'Legend',
                description: 'Reach level 50',
                type: 'level',
                requirement: 50,
                reward: { coins: 5000, experience: 25000, platinumCoins: 10 },
                icon: '⭐',
                rarity: 'legendary'
            }
        };
    }
    
    setupEventListeners() {
        // Mass achievements
        this.eventSystem.on('playerMassChanged', (data) => {
            this.checkMassAchievements(data.player, data.totalMass);
        });
        
        // Food eating achievements
        this.eventSystem.on('foodAbsorbed', (data) => {
            this.incrementProgress(data.player, 'food_eaten');
        });
        
        // PvP achievements
        this.eventSystem.on('playerDefeated', (data) => {
            this.incrementProgress(data.killer, 'players_defeated');
        });
        
        // Survival achievements
        this.eventSystem.on('gameTimeUpdate', (data) => {
            this.checkSurvivalAchievements(data.player, data.survivalTime);
        });
        
        // Splitting achievements
        this.eventSystem.on('playerSplit', (data) => {
            this.incrementProgress(data.player, 'splits_performed');
        });
        
        // Powerup achievements
        this.eventSystem.on('powerupUsed', (data) => {
            this.incrementPowerupProgress(data.player, data.powerupType);
        });
        
        // Leaderboard achievements
        this.eventSystem.on('leaderboardUpdate', (data) => {
            this.checkLeaderboardAchievements(data.leaderboard);
        });
        
        // Currency achievements
        this.eventSystem.on('coinsEarned', (data) => {
            this.checkCurrencyAchievements(data.player);
        });
        
        // Shop achievements
        this.eventSystem.on('shopPurchase', (data) => {
            this.incrementProgress(data.player, 'shop_purchases');
        });
        
        // Level achievements
        this.eventSystem.on('playerLevelUp', (data) => {
            this.checkLevelAchievements(data.player, data.newLevel);
        });
    }
    
    initializePlayer(player) {
        if (!this.playerAchievements.has(player.id)) {
            this.playerAchievements.set(player.id, new Set());
            this.progressTracking.set(player.id, {});
        }
    }
    
    checkMassAchievements(player, mass) {
        this.initializePlayer(player);
        
        const massAchievements = Object.values(this.achievements).filter(a => a.type === 'mass');
        
        for (const achievement of massAchievements) {
            if (mass >= achievement.requirement && !this.hasAchievement(player, achievement.id)) {
                this.unlockAchievement(player, achievement);
            }
        }
    }
    
    checkSurvivalAchievements(player, survivalTime) {
        this.initializePlayer(player);
        
        const survivalAchievements = Object.values(this.achievements).filter(a => a.type === 'survival_time');
        
        for (const achievement of survivalAchievements) {
            if (survivalTime >= achievement.requirement && !this.hasAchievement(player, achievement.id)) {
                this.unlockAchievement(player, achievement);
            }
        }
    }
    
    checkLeaderboardAchievements(leaderboard) {
        const leaderboardAchievements = Object.values(this.achievements).filter(a => a.type === 'leaderboard_position');
        
        leaderboard.forEach((entry, index) => {
            if (entry.isPlayer && entry.player) {
                const position = index + 1;
                
                for (const achievement of leaderboardAchievements) {
                    if (position <= achievement.requirement && !this.hasAchievement(entry.player, achievement.id)) {
                        this.unlockAchievement(entry.player, achievement);
                    }
                }
            }
        });
    }
    
    checkCurrencyAchievements(player) {
        this.initializePlayer(player);
        
        const currencyAchievements = Object.values(this.achievements).filter(a => a.type === 'total_coins_earned');
        
        for (const achievement of currencyAchievements) {
            if (player.totalCoinsEarned >= achievement.requirement && !this.hasAchievement(player, achievement.id)) {
                this.unlockAchievement(player, achievement);
            }
        }
    }
    
    checkLevelAchievements(player, level) {
        this.initializePlayer(player);
        
        const levelAchievements = Object.values(this.achievements).filter(a => a.type === 'level');
        
        for (const achievement of levelAchievements) {
            if (level >= achievement.requirement && !this.hasAchievement(player, achievement.id)) {
                this.unlockAchievement(player, achievement);
            }
        }
    }
    
    incrementProgress(player, progressType, amount = 1) {
        this.initializePlayer(player);
        
        const progress = this.progressTracking.get(player.id);
        if (!progress[progressType]) {
            progress[progressType] = 0;
        }
        
        progress[progressType] += amount;
        
        // Check achievements of this type
        const relevantAchievements = Object.values(this.achievements).filter(a => a.type === progressType);
        
        for (const achievement of relevantAchievements) {
            if (progress[progressType] >= achievement.requirement && !this.hasAchievement(player, achievement.id)) {
                this.unlockAchievement(player, achievement);
            }
        }
    }
    
    incrementPowerupProgress(player, powerupType) {
        this.initializePlayer(player);
        
        const progress = this.progressTracking.get(player.id);
        const progressKey = `powerups_used_${powerupType}`;
        
        if (!progress[progressKey]) {
            progress[progressKey] = 0;
        }
        
        progress[progressKey]++;
        
        // Check powerup-specific achievements
        const powerupAchievements = Object.values(this.achievements).filter(a => 
            a.type === 'powerups_used' && a.subType === powerupType
        );
        
        for (const achievement of powerupAchievements) {
            if (progress[progressKey] >= achievement.requirement && !this.hasAchievement(player, achievement.id)) {
                this.unlockAchievement(player, achievement);
            }
        }
    }
    
    unlockAchievement(player, achievement) {
        this.initializePlayer(player);
        
        const playerAchievements = this.playerAchievements.get(player.id);
        
        if (playerAchievements.has(achievement.id)) {
            return; // Already unlocked
        }
        
        // Add to unlocked achievements
        playerAchievements.add(achievement.id);
        
        // Award rewards
        this.awardRewards(player, achievement.reward);
        
        // Emit achievement unlocked event
        this.eventSystem.emit('achievementUnlocked', {
            player: player,
            achievement: achievement
        });
        
        // Show notification
        this.showAchievementNotification(achievement);
        
        // Save progress
        this.savePlayerProgress(player);
    }
    
    awardRewards(player, reward) {
        if (reward.coins) {
            player.coins += reward.coins;
            player.totalCoinsEarned = (player.totalCoinsEarned || 0) + reward.coins;
        }
        
        if (reward.experience) {
            player.addExperience(reward.experience);
        }
        
        if (reward.platinumCoins) {
            player.platinumCoins += reward.platinumCoins;
        }
        
        // Emit reward event
        this.eventSystem.emit('rewardsAwarded', {
            player: player,
            reward: reward
        });
    }
    
    showAchievementNotification(achievement) {
        // Create and display achievement notification
        const notification = {
            id: Utils.generateId(),
            type: 'achievement',
            title: 'Achievement Unlocked!',
            message: `${achievement.icon} ${achievement.name}`,
            description: achievement.description,
            rarity: achievement.rarity,
            duration: 5000, // 5 seconds
            timestamp: Date.now()
        };
        
        this.eventSystem.emit('showNotification', notification);
    }
    
    hasAchievement(player, achievementId) {
        this.initializePlayer(player);
        return this.playerAchievements.get(player.id).has(achievementId);
    }
    
    getPlayerAchievements(player) {
        this.initializePlayer(player);
        
        const unlockedIds = this.playerAchievements.get(player.id);
        const unlockedAchievements = [];
        
        for (const id of unlockedIds) {
            if (this.achievements[id]) {
                unlockedAchievements.push(this.achievements[id]);
            }
        }
        
        return unlockedAchievements;
    }
    
    getPlayerProgress(player) {
        this.initializePlayer(player);
        return this.progressTracking.get(player.id);
    }
    
    getAchievementProgress(player, achievementId) {
        const achievement = this.achievements[achievementId];
        if (!achievement) return null;
        
        this.initializePlayer(player);
        const progress = this.progressTracking.get(player.id);
        
        let currentProgress = 0;
        
        if (achievement.type === 'powerups_used' && achievement.subType) {
            currentProgress = progress[`powerups_used_${achievement.subType}`] || 0;
        } else {
            currentProgress = progress[achievement.type] || 0;
        }
        
        return {
            current: currentProgress,
            required: achievement.requirement,
            percentage: Math.min((currentProgress / achievement.requirement) * 100, 100),
            completed: this.hasAchievement(player, achievementId)
        };
    }
    
    getAllAchievements() {
        return this.achievements;
    }
    
    getAchievementsByRarity(rarity) {
        return Object.values(this.achievements).filter(a => a.rarity === rarity);
    }
    
    getAchievementsByType(type) {
        return Object.values(this.achievements).filter(a => a.type === type);
    }
    
    getCompletionPercentage(player) {
        this.initializePlayer(player);
        
        const totalAchievements = Object.keys(this.achievements).length;
        const unlockedAchievements = this.playerAchievements.get(player.id).size;
        
        return (unlockedAchievements / totalAchievements) * 100;
    }
    
    savePlayerProgress(player) {
        // Save achievement progress to storage
        const saveData = {
            achievements: Array.from(this.playerAchievements.get(player.id)),
            progress: this.progressTracking.get(player.id)
        };
        
        // In a real implementation, this would save to localStorage or server
        // For now, we'll emit an event for the save system to handle
        this.eventSystem.emit('saveAchievementProgress', {
            playerId: player.id,
            data: saveData
        });
    }
    
    loadPlayerProgress(player, savedData) {
        if (!savedData) return;
        
        this.initializePlayer(player);
        
        if (savedData.achievements) {
            this.playerAchievements.set(player.id, new Set(savedData.achievements));
        }
        
        if (savedData.progress) {
            this.progressTracking.set(player.id, savedData.progress);
        }
    }
    
    resetPlayerProgress(player) {
        this.playerAchievements.set(player.id, new Set());
        this.progressTracking.set(player.id, {});
    }
    
    // Debug methods
    forceUnlockAchievement(player, achievementId) {
        const achievement = this.achievements[achievementId];
        if (achievement) {
            this.unlockAchievement(player, achievement);
        }
    }
    
    getDebugInfo(player) {
        return {
            totalAchievements: Object.keys(this.achievements).length,
            unlockedCount: this.playerAchievements.get(player.id)?.size || 0,
            completionPercentage: this.getCompletionPercentage(player),
            progress: this.getPlayerProgress(player)
        };
    }
}
