// js/systems/ProgressionSystem.js
import { Config } from '../core/Config.js';
import { EventSystem } from '../core/EventSystem.js';

export class ProgressionSystem {
    constructor() {
        this.experienceTable = this.generateExperienceTable();
        this.levelRewards = this.generateLevelRewards();
        this.achievements = this.initializeAchievements();
        
        this.setupEventListeners();
    }
    
    generateExperienceTable() {
        const table = {};
        let baseXP = 100;
        
        for (let level = 1; level <= Config.PROGRESSION.MAX_LEVEL; level++) {
            table[level] = Math.floor(baseXP * Math.pow(1.15, level - 1));
        }
        
        return table;
    }
    
    generateLevelRewards() {
        const rewards = {};
        
        for (let level = 1; level <= Config.PROGRESSION.MAX_LEVEL; level++) {
            rewards[level] = {
                coins: Math.floor(25 + (level * 5)),
                platinumCoins: level % 10 === 0 ? 1 : 0, // Every 10 levels
                unlocks: this.getLevelUnlocks(level)
            };
        }
        
        return rewards;
    }
    
    getLevelUnlocks(level) {
        const unlocks = [];
        
        if (level === 5) unlocks.push('speed_boost_powerup');
        if (level === 10) unlocks.push('mass_shield_powerup');
        if (level === 15) unlocks.push('recombine_powerup');
        if (level === 20) unlocks.push('split_boost_powerup');
        if (level === 25) unlocks.push('defender_bot');
        if (level === 35) unlocks.push('hunter_bot');
        if (level === 50) unlocks.push('collector_bot');
        
        return unlocks;
    }
    
    initializeAchievements() {
        return {
            // Absorption achievements
            first_absorption: {
                id: 'first_absorption',
                name: 'First Meal',
                description: 'Absorb your first cell',
                reward: { coins: 10 },
                completed: false,
                progress: 0,
                target: 1
            },
            mass_milestone_100: {
                id: 'mass_milestone_100',
                name: 'Growing Strong',
                description: 'Reach 100 mass',
                reward: { coins: 25 },
                completed: false,
                progress: 0,
                target: 100
            },
            mass_milestone_500: {
                id: 'mass_milestone_500',
                name: 'Big Fish',
                description: 'Reach 500 mass',
                reward: { coins: 50, platinumCoins: 1 },
                completed: false,
                progress: 0,
                target: 500
            },
            mass_milestone_1000: {
                id: 'mass_milestone_1000',
                name: 'Leviathan',
                description: 'Reach 1000 mass',
                reward: { coins: 100, platinumCoins: 2 },
                completed: false,
                progress: 0,
                target: 1000
            },
            
            // Level achievements
            level_10: {
                id: 'level_10',
                name: 'Experienced',
                description: 'Reach level 10',
                reward: { coins: 50 },
                completed: false,
                progress: 0,
                target: 10
            },
            level_25: {
                id: 'level_25',
                name: 'Veteran',
                description: 'Reach level 25',
                reward: { coins: 100, platinumCoins: 1 },
                completed: false,
                progress: 0,
                target: 25
            },
            
            // Combat achievements
            player_hunter: {
                id: 'player_hunter',
                name: 'Player Hunter',
                description: 'Absorb 10 other players',
                reward: { coins: 75 },
                completed: false,
                progress: 0,
                target: 10
            },
            bot_destroyer: {
                id: 'bot_destroyer',
                name: 'Bot Destroyer',
                description: 'Absorb 25 bots',
                reward: { coins: 50 },
                completed: false,
                progress: 0,
                target: 25
            },
            
            // Survival achievements
            survivor: {
                id: 'survivor',
                name: 'Survivor',
                description: 'Survive for 10 minutes',
                reward: { coins: 40 },
                completed: false,
                progress: 0,
                target: 600 // seconds
            },
            long_survivor: {
                id: 'long_survivor',
                name: 'Long Survivor',
                description: 'Survive for 30 minutes',
                reward: { coins: 100, platinumCoins: 1 },
                completed: false,
                progress: 0,
                target: 1800 // seconds
            },
            
            // Split achievements
            split_master: {
                id: 'split_master',
                name: 'Split Master',
                description: 'Split 50 times',
                reward: { coins: 30 },
                completed: false,
                progress: 0,
                target: 50
            }
        };
    }
    
    setupEventListeners() {
        EventSystem.on('playerAbsorbedCell', (data) => {
            this.handleAbsorption(data.player, data.absorbed);
        });
        
        EventSystem.on('playerAbsorbedFood', (data) => {
            this.handleFoodAbsorption(data.player, data.food);
        });
        
        EventSystem.on('playerSplit', (data) => {
            this.handleSplit(data.player);
        });
        
        EventSystem.on('gameTimeUpdate', (data) => {
            this.handleSurvivalTime(data.player, data.survivalTime);
        });
    }
    
    handleAbsorption(player, absorbed) {
        // Award experience based on absorbed mass
        const xpGain = this.calculateAbsorptionXP(absorbed.mass);
        this.awardExperience(player, xpGain);
        
        // Update achievements
        this.updateAchievementProgress('first_absorption', 1);
        
        if (absorbed.isBot) {
            this.updateAchievementProgress('bot_destroyer', 1);
        } else if (absorbed.isPlayer) {
            this.updateAchievementProgress('player_hunter', 1);
        }
        
        // Check mass milestones
        this.checkMassMilestones(player);
    }
    
    handleFoodAbsorption(player, food) {
        const xpGain = Config.PROGRESSION.FOOD_XP_BASE;
        this.awardExperience(player, xpGain);
    }
    
    handleSplit(player) {
        this.updateAchievementProgress('split_master', 1);
    }
    
    handleSurvivalTime(player, survivalTime) {
        this.updateAchievementProgress('survivor', survivalTime);
        this.updateAchievementProgress('long_survivor', survivalTime);
    }
    
    calculateAbsorptionXP(absorbedMass) {
        return Math.floor(Config.PROGRESSION.ABSORPTION_XP_BASE * Math.sqrt(absorbedMass));
    }
    
    awardExperience(player, xp) {
        if (!player || player.level >= Config.PROGRESSION.MAX_LEVEL) return;
        
        player.experience += xp;
        
        // Check for level up
        while (this.canLevelUp(player)) {
            this.levelUp(player);
        }
        
        EventSystem.emit('experienceGained', { 
            player, 
            xp, 
            totalXP: player.experience 
        });
    }
    
    canLevelUp(player) {
        const requiredXP = this.getRequiredXP(player.level + 1);
        return player.experience >= requiredXP && player.level < Config.PROGRESSION.MAX_LEVEL;
    }
    
    levelUp(player) {
        const oldLevel = player.level;
        player.level++;
        
        // Deduct XP for level up
        const requiredXP = this.getRequiredXP(player.level);
        player.experience -= this.getRequiredXP(oldLevel + 1);
        
        // Award level rewards
        this.awardLevelRewards(player, player.level);
        
        // Update level achievements
        this.updateAchievementProgress('level_10', player.level);
        this.updateAchievementProgress('level_25', player.level);
        
        EventSystem.emit('playerLevelUp', { 
            player, 
            oldLevel, 
            newLevel: player.level,
            rewards: this.levelRewards[player.level]
        });
    }
    
    awardLevelRewards(player, level) {
        const rewards = this.levelRewards[level];
        if (!rewards) return;
        
        if (rewards.coins) {
            player.coins += rewards.coins;
        }
        
        if (rewards.platinumCoins) {
            player.platinumCoins += rewards.platinumCoins;
        }
        
        if (rewards.unlocks) {
            rewards.unlocks.forEach(unlock => {
                player.unlockedItems = player.unlockedItems || [];
                if (!player.unlockedItems.includes(unlock)) {
                    player.unlockedItems.push(unlock);
                }
            });
        }
    }
    
    getRequiredXP(level) {
        return this.experienceTable[level] || 0;
    }
    
    getXPToNextLevel(player) {
        if (player.level >= Config.PROGRESSION.MAX_LEVEL) return 0;
        
        const requiredXP = this.getRequiredXP(player.level + 1);
        return Math.max(0, requiredXP - player.experience);
    }
    
    getLevelProgress(player) {
        if (player.level >= Config.PROGRESSION.MAX_LEVEL) return 1;
        
        const currentLevelXP = this.getRequiredXP(player.level);
        const nextLevelXP = this.getRequiredXP(player.level + 1);
        const totalXPForLevel = nextLevelXP - currentLevelXP;
        const currentProgress = player.experience - currentLevelXP;
        
        return Math.max(0, Math.min(1, currentProgress / totalXPForLevel));
    }
    
    checkMassMilestones(player) {
        const totalMass = player.getTotalMass();
        
        this.updateAchievementProgress('mass_milestone_100', totalMass);
        this.updateAchievementProgress('mass_milestone_500', totalMass);
        this.updateAchievementProgress('mass_milestone_1000', totalMass);
    }
    
    updateAchievementProgress(achievementId, progress) {
        const achievement = this.achievements[achievementId];
        if (!achievement || achievement.completed) return;
        
        achievement.progress = Math.max(achievement.progress, progress);
        
        if (achievement.progress >= achievement.target) {
            this.completeAchievement(achievementId);
        }
    }
    
    completeAchievement(achievementId) {
        const achievement = this.achievements[achievementId];
        if (!achievement || achievement.completed) return;
        
        achievement.completed = true;
        
        EventSystem.emit('achievementCompleted', { 
            achievement,
            reward: achievement.reward
        });
    }
    
    getCompletedAchievements() {
        return Object.values(this.achievements).filter(a => a.completed);
    }
    
    getAchievementProgress() {
        const completed = this.getCompletedAchievements().length;
        const total = Object.keys(this.achievements).length;
        return { completed, total, percentage: (completed / total) * 100 };
    }
    
    resetProgress() {
        Object.values(this.achievements).forEach(achievement => {
            achievement.completed = false;
            achievement.progress = 0;
        });
    }
}
