// js/systems/CurrencyManager.js
import { CONFIG } from '../core/Config.js';
import { EventSystem } from '../core/EventSystem.js';
import { Utils } from '../utils/Utils.js';

export class CurrencyManager {
    constructor() {
        this.coinSources = this.initializeCoinSources();
        this.platinumSources = this.initializePlatinumSources();
        this.dailyRewards = this.initializeDailyRewards();
        this.lastDailyReward = 0;
        
        this.setupEventListeners();
    }
    
    initializeCoinSources() {
        return {
            food_absorption: {
                base: 0.1,
                multiplier: 1.0,
                description: 'Absorbing food'
            },
            cell_absorption: {
                base: 10,
                massMultiplier: 0.5,
                description: 'Absorbing other cells'
            },
            bot_absorption: {
                base: 15,
                massMultiplier: 0.3,
                description: 'Absorbing bots'
            },
            player_absorption: {
                base: 25,
                massMultiplier: 0.8,
                description: 'Absorbing players'
            },
            survival_bonus: {
                base: 1,
                timeInterval: 60, // seconds
                description: 'Survival time bonus'
            },
            level_reward: {
                base: 25,
                levelMultiplier: 5,
                description: 'Level up rewards'
            },
            achievement_reward: {
                varies: true,
                description: 'Achievement completion'
            }
        };
    }
    
    initializePlatinumSources() {
        return {
            daily_login: {
                amount: 1,
                description: 'Daily login bonus'
            },
            level_milestone: {
                levels: [10, 25, 50, 75, 100],
                amount: 1,
                description: 'Major level milestones'
            },
            achievement_premium: {
                varies: true,
                description: 'Premium achievements'
            },
            special_events: {
                varies: true,
                description: 'Special event rewards'
            }
        };
    }
    
    initializeDailyRewards() {
        return {
            day1: { coins: 10, platinumCoins: 0 },
            day2: { coins: 15, platinumCoins: 0 },
            day3: { coins: 20, platinumCoins: 1 },
            day4: { coins: 25, platinumCoins: 0 },
            day5: { coins: 30, platinumCoins: 0 },
            day6: { coins: 35, platinumCoins: 1 },
            day7: { coins: 50, platinumCoins: 2 }
        };
    }
    
    setupEventListeners() {
        EventSystem.on('playerAbsorbedFood', (data) => {
            this.handleFoodAbsorption(data.player, data.food);
        });
        
        EventSystem.on('playerAbsorbedCell', (data) => {
            this.handleCellAbsorption(data.player, data.absorbed);
        });
        
        EventSystem.on('playerLevelUp', (data) => {
            this.handleLevelUp(data.player, data.newLevel);
        });
        
        EventSystem.on('achievementCompleted', (data) => {
            this.handleAchievementReward(data.achievement, data.reward);
        });
        
        EventSystem.on('gameTimeUpdate', (data) => {
            this.handleSurvivalTime(data.player, data.survivalTime);
        });
    }
    
    handleFoodAbsorption(player, food) {
        const source = this.coinSources.food_absorption;
        const coins = source.base * source.multiplier;
        
        this.awardCoins(player, coins, 'food_absorption');
    }
    
    handleCellAbsorption(player, absorbed) {
        let source;
        let coins;
        
        if (absorbed.isBot) {
            source = this.coinSources.bot_absorption;
            coins = source.base + (absorbed.mass * source.massMultiplier);
        } else if (absorbed.isPlayer) {
            source = this.coinSources.player_absorption;
            coins = source.base + (absorbed.mass * source.massMultiplier);
        } else {
            source = this.coinSources.cell_absorption;
            coins = source.base + (absorbed.mass * source.massMultiplier);
        }
        
        this.awardCoins(player, Math.floor(coins), absorbed.isBot ? 'bot_absorption' : 
                       absorbed.isPlayer ? 'player_absorption' : 'cell_absorption');
    }
    
    handleLevelUp(player, newLevel) {
        const source = this.coinSources.level_reward;
        const coins = source.base + (newLevel * source.levelMultiplier);
        
        this.awardCoins(player, coins, 'level_reward');
        
        // Check for platinum coin milestones
        const platinumLevels = this.platinumSources.level_milestone.levels;
        if (platinumLevels.includes(newLevel)) {
            this.awardPlatinumCoins(player, this.platinumSources.level_milestone.amount, 'level_milestone');
        }
    }
    
    handleAchievementReward(achievement, reward) {
        if (reward.coins) {
            // Will be handled by the calling system
        }
        
        if (reward.platinumCoins) {
            // Will be handled by the calling system
        }
    }
    
    handleSurvivalTime(player, survivalTime) {
        const source = this.coinSources.survival_bonus;
        const intervals = Math.floor(survivalTime / source.timeInterval);
        
        if (intervals > (player.lastSurvivalInterval || 0)) {
            const bonusIntervals = intervals - (player.lastSurvivalInterval || 0);
            const coins = source.base * bonusIntervals;
            
            this.awardCoins(player, coins, 'survival_bonus');
            player.lastSurvivalInterval = intervals;
        }
    }
    
    awardCoins(player, amount, source = 'unknown') {
        if (!player || amount <= 0) return;
        
        const roundedAmount = Math.floor(amount);
        player.coins += roundedAmount;
        
        EventSystem.emit('coinsAwarded', {
            player,
            amount: roundedAmount,
            source,
            newTotal: player.coins
        });
        
        this.updateCurrencyStats(player, 'coins', roundedAmount);
    }
    
    awardPlatinumCoins(player, amount, source = 'unknown') {
        if (!player || amount <= 0) return;
        
        const roundedAmount = Math.floor(amount);
        player.platinumCoins += roundedAmount;
        
        EventSystem.emit('platinumCoinsAwarded', {
            player,
            amount: roundedAmount,
            source,
            newTotal: player.platinumCoins
        });
        
        this.updateCurrencyStats(player, 'platinumCoins', roundedAmount);
    }
    
    spendCoins(player, amount, source = 'purchase') {
        if (!player || amount <= 0 || player.coins < amount) {
            return false;
        }
        
        player.coins -= amount;
        
        EventSystem.emit('coinsSpent', {
            player,
            amount,
            source,
            newTotal: player.coins
        });
        
        this.updateCurrencyStats(player, 'coinsSpent', amount);
        return true;
    }
    
    spendPlatinumCoins(player, amount, source = 'purchase') {
        if (!player || amount <= 0 || player.platinumCoins < amount) {
            return false;
        }
        
        player.platinumCoins -= amount;
        
        EventSystem.emit('platinumCoinsSpent', {
            player,
            amount,
            source,
            newTotal: player.platinumCoins
        });
        
        this.updateCurrencyStats(player, 'platinumCoinsSpent', amount);
        return true;
    }
    
    canAfford(player, cost) {
        if (typeof cost === 'number') {
            return player.coins >= cost;
        }
        
        if (typeof cost === 'object') {
            const coinsAffordable = !cost.coins || player.coins >= cost.coins;
            const platinumAffordable = !cost.platinumCoins || player.platinumCoins >= cost.platinumCoins;
            return coinsAffordable && platinumAffordable;
        }
        
        return false;
    }
    
    processPurchase(player, cost, item = 'unknown') {
        if (!this.canAfford(player, cost)) {
            return false;
        }
        
        if (typeof cost === 'number') {
            return this.spendCoins(player, cost, `purchase_${item}`);
        }
        
        if (typeof cost === 'object') {
            let success = true;
            
            if (cost.coins && cost.coins > 0) {
                success = success && this.spendCoins(player, cost.coins, `purchase_${item}`);
            }
            
            if (cost.platinumCoins && cost.platinumCoins > 0) {
                success = success && this.spendPlatinumCoins(player, cost.platinumCoins, `purchase_${item}`);
            }
            
            return success;
        }
        
        return false;
    }
    
    checkDailyReward(player) {
        const now = Date.now();
        const daysSinceLastReward = Math.floor((now - this.lastDailyReward) / (24 * 60 * 60 * 1000));
        
        if (daysSinceLastReward >= 1) {
            return this.calculateDailyReward(player);
        }
        
        return null;
    }
    
    calculateDailyReward(player) {
        const consecutiveDays = this.getConsecutiveLoginDays(player);
        const rewardDay = Math.min(consecutiveDays % 7 || 7, 7);
        const rewardKey = `day${rewardDay}`;
        
        return {
            day: rewardDay,
            reward: this.dailyRewards[rewardKey],
            consecutive: consecutiveDays
        };
    }
    
    claimDailyReward(player) {
        const dailyReward = this.checkDailyReward(player);
        if (!dailyReward) return false;
        
        const reward = dailyReward.reward;
        
        if (reward.coins > 0) {
            this.awardCoins(player, reward.coins, 'daily_reward');
        }
        
        if (reward.platinumCoins > 0) {
            this.awardPlatinumCoins(player, reward.platinumCoins, 'daily_reward');
        }
        
        this.lastDailyReward = Date.now();
        player.lastDailyReward = this.lastDailyReward;
        player.consecutiveLoginDays = (player.consecutiveLoginDays || 0) + 1;
        
        EventSystem.emit('dailyRewardClaimed', {
            player,
            reward,
            day: dailyReward.day,
            consecutive: dailyReward.consecutive
        });
        
        return true;
    }
    
    getConsecutiveLoginDays(player) {
        return player.consecutiveLoginDays || 1;
    }
    
    updateCurrencyStats(player, type, amount) {
        player.statistics = player.statistics || {};
        player.statistics.currency = player.statistics.currency || {};
        
        player.statistics.currency[type] = (player.statistics.currency[type] || 0) + amount;
        player.statistics.currency.totalEarned = (player.statistics.currency.totalEarned || 0) + 
                                                (type.includes('Spent') ? 0 : amount);
    }
    
    getCurrencyStats(player) {
        return player.statistics?.currency || {
            coins: 0,
            platinumCoins: 0,
            coinsSpent: 0,
            platinumCoinsSpent: 0,
            totalEarned: 0
        };
    }
    
    getEarningRate(player, timeWindow = 60) {
        // Calculate coins earned per minute based on recent activity
        const stats = player.statistics?.currency || {};
        const recentEarnings = stats.totalEarned || 0;
        
        // This would need to track time-based earnings in a real implementation
        return recentEarnings / Math.max(timeWindow, 1);
    }
    
    formatCurrency(amount, type = 'coins') {
        if (type === 'coins') {
            return `${Utils.formatNumber(amount)} coins`;
        } else if (type === 'platinumCoins') {
            return `${Utils.formatNumber(amount)} PC`;
        }
        return amount.toString();
    }
    
    getCurrencyMultiplier(player, source) {
        let multiplier = 1.0;
        
        // Level-based multipliers
        if (player.level >= 25) multiplier += 0.25;
        if (player.level >= 50) multiplier += 0.5;
        if (player.level >= 75) multiplier += 0.75;
        if (player.level >= 100) multiplier += 1.0;
        
        // Prestige multipliers
        if (player.prestigeLevel > 0) {
            multiplier += player.prestigeLevel * 0.1;
        }
        
        // Active powerup multipliers
        if (player.activePowerups?.includes('coin_multiplier')) {
            multiplier += 0.5;
        }
        
        return multiplier;
    }
    
    applyMultipliedReward(player, baseAmount, source) {
        const multiplier = this.getCurrencyMultiplier(player, source);
        const finalAmount = Math.floor(baseAmount * multiplier);
        
        return finalAmount;
    }
    
    resetDailyProgress() {
        this.lastDailyReward = 0;
    }
    
    exportCurrencyData(player) {
        return {
            coins: player.coins,
            platinumCoins: player.platinumCoins,
            statistics: this.getCurrencyStats(player),
            lastDailyReward: player.lastDailyReward,
            consecutiveLoginDays: player.consecutiveLoginDays
        };
    }
    
    importCurrencyData(player, data) {
        if (data.coins !== undefined) player.coins = data.coins;
        if (data.platinumCoins !== undefined) player.platinumCoins = data.platinumCoins;
        if (data.lastDailyReward !== undefined) player.lastDailyReward = data.lastDailyReward;
        if (data.consecutiveLoginDays !== undefined) player.consecutiveLoginDays = data.consecutiveLoginDays;
        
        if (data.statistics) {
            player.statistics = player.statistics || {};
            player.statistics.currency = data.statistics;
        }
    }
}
