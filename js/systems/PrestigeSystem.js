// systems/PrestigeSystem.js

import { gameEvents } from '../core/EventSystem.js';
import { CONFIG } from '../core/Config.js';

export class PrestigeSystem {
    constructor() {
        this.prestigeRequirement = 100; // Level 100 required
        this.prestigePointsMultiplier = 0.1; // 10% of max level as prestige points
        this.prestigeCoinMultiplier = 0.05; // 5% coin bonus per prestige level
        this.prestigeExpMultiplier = 0.03; // 3% exp bonus per prestige level
        this.platinumExchangeRate = 100; // 100 prestige points = 1 platinum coin
        
        this.upgradeShop = {
            powerupInventory: {
                name: 'Extra Powerup Slots',
                baseCost: 50,
                maxLevel: 5,
                description: 'Increases powerup inventory by 1 slot'
            },
            coinMultiplier: {
                name: 'Coin Multiplier',
                baseCost: 100,
                maxLevel: 10,
                description: 'Increases coin gain by 5% per level'
            },
            expMultiplier: {
                name: 'Experience Multiplier',
                baseCost: 75,
                maxLevel: 10,
                description: 'Increases experience gain by 3% per level'
            },
            startingMass: {
                name: 'Starting Mass Bonus',
                baseCost: 200,
                maxLevel: 3,
                description: 'Start each game with +10 mass per level'
            }
        };
        
        gameEvents.on('levelUp', this.checkPrestigeAvailability.bind(this));
    }
    
    canPrestige(player) {
        return player.level >= this.prestigeRequirement;
    }
    
    calculatePrestigeRewards(player) {
        if (!this.canPrestige(player)) return null;
        
        const prestigePoints = Math.floor(player.level * this.prestigePointsMultiplier);
        const coinMultiplier = this.calculateCoinMultiplier(player.prestigeLevel + 1);
        const expMultiplier = this.calculateExpMultiplier(player.prestigeLevel + 1);
        
        return {
            prestigePoints,
            newCoinMultiplier: coinMultiplier,
            newExpMultiplier: expMultiplier,
            currentLevel: player.level,
            coinsLost: player.coins
        };
    }
    
    performPrestige(player) {
        if (!this.canPrestige(player)) return false;
        
        const rewards = this.calculatePrestigeRewards(player);
        
        // Reset stats but keep platinum coins
        const platinumCoins = player.platinumCoins;
        const achievements = [...player.achievements];
        const unlockedItems = [...player.unlockedItems];
        const prestigeUpgrades = { ...player.prestigeUpgrades };
        
        // Award prestige points
        player.prestigePoints = (player.prestigePoints || 0) + rewards.prestigePoints;
        player.prestigeLevel = (player.prestigeLevel || 0) + 1;
        
        // Reset progress
        player.level = 1;
        player.experience = 0;
        player.coins = 0;
        player.totalMassConsumed = 0;
        
        // Restore persistent data
        player.platinumCoins = platinumCoins;
        player.achievements = achievements;
        player.unlockedItems = unlockedItems;
        player.prestigeUpgrades = prestigeUpgrades || {};
        
        // Update multipliers
        player.coinMultiplier = this.calculateCoinMultiplier(player.prestigeLevel);
        player.expMultiplier = this.calculateExpMultiplier(player.prestigeLevel);
        
        gameEvents.emit('prestigeCompleted', {
            player,
            prestigeLevel: player.prestigeLevel,
            prestigePoints: rewards.prestigePoints
        });
        
        return true;
    }
    
    calculateCoinMultiplier(prestigeLevel) {
        return 1 + (prestigeLevel * this.prestigeCoinMultiplier);
    }
    
    calculateExpMultiplier(prestigeLevel) {
        return 1 + (prestigeLevel * this.prestigeExpMultiplier);
    }
    
    exchangePrestigePoints(player, amount) {
        const prestigePointsNeeded = amount * this.platinumExchangeRate;
        
        if (player.prestigePoints >= prestigePointsNeeded) {
            player.prestigePoints -= prestigePointsNeeded;
            player.platinumCoins += amount;
            
            gameEvents.emit('prestigePointsExchanged', {
                player,
                platinumCoinsGained: amount,
                prestigePointsSpent: prestigePointsNeeded
            });
            
            return true;
        }
        
        return false;
    }
    
    canPurchaseUpgrade(player, upgradeId) {
        const upgrade = this.upgradeShop[upgradeId];
        if (!upgrade) return false;
        
        const currentLevel = player.prestigeUpgrades[upgradeId] || 0;
        if (currentLevel >= upgrade.maxLevel) return false;
        
        const cost = this.calculateUpgradeCost(upgrade, currentLevel);
        return player.prestigePoints >= cost;
    }
    
    purchaseUpgrade(player, upgradeId) {
        if (!this.canPurchaseUpgrade(player, upgradeId)) return false;
        
        const upgrade = this.upgradeShop[upgradeId];
        const currentLevel = player.prestigeUpgrades[upgradeId] || 0;
        const cost = this.calculateUpgradeCost(upgrade, currentLevel);
        
        player.prestigePoints -= cost;
        player.prestigeUpgrades[upgradeId] = currentLevel + 1;
        
        gameEvents.emit('prestigeUpgradePurchased', {
            player,
            upgradeId,
            newLevel: currentLevel + 1,
            cost
        });
        
        return true;
    }
    
    calculateUpgradeCost(upgrade, currentLevel) {
        return upgrade.baseCost * Math.pow(1.5, currentLevel);
    }
    
    getUpgradeBonus(player, upgradeId) {
        const level = player.prestigeUpgrades[upgradeId] || 0;
        
        switch (upgradeId) {
            case 'powerupInventory':
                return level; // +1 slot per level
            case 'coinMultiplier':
                return level * 0.05; // +5% per level
            case 'expMultiplier':
                return level * 0.03; // +3% per level
            case 'startingMass':
                return level * 10; // +10 mass per level
            default:
                return 0;
        }
    }
    
    checkPrestigeAvailability(data) {
        if (data.player.level >= this.prestigeRequirement) {
            gameEvents.emit('prestigeAvailable', { player: data.player });
        }
    }
    
    getPrestigeInfo(player) {
        return {
            canPrestige: this.canPrestige(player),
            prestigeLevel: player.prestigeLevel || 0,
            prestigePoints: player.prestigePoints || 0,
            coinMultiplier: player.coinMultiplier || 1,
            expMultiplier: player.expMultiplier || 1,
            nextPrestigeRewards: this.calculatePrestigeRewards(player),
            availableUpgrades: this.getAvailableUpgrades(player)
        };
    }
    
    getAvailableUpgrades(player) {
        const upgrades = {};
        
        for (const [id, upgrade] of Object.entries(this.upgradeShop)) {
            const currentLevel = player.prestigeUpgrades[id] || 0;
            const cost = this.calculateUpgradeCost(upgrade, currentLevel);
            const canPurchase = this.canPurchaseUpgrade(player, id);
            
            upgrades[id] = {
                ...upgrade,
                currentLevel,
                nextCost: currentLevel < upgrade.maxLevel ? cost : null,
                canPurchase,
                maxed: currentLevel >= upgrade.maxLevel
            };
        }
        
        return upgrades;
    }
}
