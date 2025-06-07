// js/systems/PowerupSystem.js
import { Utils } from '../utils/Utils.js';
import { CONFIG } from '../core/Config.js';
import { gameEvents } from '../core/EventSystem.js';

export class PowerupSystem {
    constructor(game) {
        this.game = game;
        this.activePowerups = new Map();
        this.powerupCooldowns = new Map();
        
        // Powerup definitions - exactly what UIManager expects
        this.powerups = {
            recombine: {
                id: 'recombine',
                name: 'Recombine',
                description: 'Instantly merge all your cells in the direction of your mouse',
                cooldown: 30000, // 30 seconds
                cost: 100,
                currency: 'coins',
                icon: '🔄'
            },
            speedBoost: {
                id: 'speedBoost',
                name: 'Speed Boost',
                description: 'Increases movement speed by 50% for 10 seconds',
                cooldown: 45000, // 45 seconds
                duration: 10000, // 10 seconds
                cost: 50,
                currency: 'coins',
                icon: '⚡'
            },
            massShield: {
                id: 'massShield',
                name: 'Mass Shield',
                description: 'Reduces mass loss when eaten by 50% for 15 seconds',
                cooldown: 60000, // 60 seconds
                duration: 15000, // 15 seconds
                cost: 150,
                currency: 'coins',
                icon: '🛡️'
            },
            splitBoost: {
                id: 'splitBoost',
                name: 'Split Boost',
                description: 'Increases split distance and speed by 100% for 8 seconds',
                cooldown: 35000, // 35 seconds
                duration: 8000, // 8 seconds
                cost: 75,
                currency: 'coins',
                icon: '💥'
            },
            magnetism: {
                id: 'magnetism',
                name: 'Food Magnetism',
                description: 'Attracts nearby food for 12 seconds',
                cooldown: 40000, // 40 seconds
                duration: 12000, // 12 seconds
                cost: 80,
                currency: 'coins',
                icon: '🧲'
            }
        };
        
        this.initialize();
    }
    
    initialize() {
        // Initialize cooldown tracking for all powerups
        for (const powerupId of Object.keys(this.powerups)) {
            this.powerupCooldowns.set(powerupId, 0);
        }
        
        // Listen for game events
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Listen for player damage to apply mass shield
        gameEvents.on('playerDamaged', (data) => {
            this.handlePlayerDamaged(data.player, data.damage);
        });
        
        // Listen for player split to apply split boost
        gameEvents.on('playerSplit', (data) => {
            this.handlePlayerSplit(data.player, data.cells);
        });
    }
    
    update(deltaTime, currentTime) {
        // Update active powerup effects
        this.updateActivePowerups(currentTime);
        
        // Update cooldowns (they're timestamp-based, so no active update needed)
        this.updateCooldowns(currentTime);
    }
    
    // CORE METHOD: Check if player can use a powerup (called by UIManager)
    canUsePowerup(player, powerupId) {
        const powerup = this.powerups[powerupId];
        if (!powerup) return false;
        
        // Check cooldown
        const cooldownEnd = this.powerupCooldowns.get(powerupId) || 0;
        if (Date.now() < cooldownEnd) return false;
        
        // Check if player can afford it
        if (powerup.currency === 'coins' && player.coins < powerup.cost) return false;
        if (powerup.currency === 'platinum' && player.platinumCoins < powerup.cost) return false;
        
        // Specific powerup requirements
        switch (powerupId) {
            case 'recombine':
                return player.cells && player.cells.length > 1;
            case 'splitBoost':
                return player.totalMass >= (CONFIG.physics?.minSplitMass || 35);
            default:
                return true;
        }
    }
    
    // CORE METHOD: Use a powerup (called by UIManager)
    usePowerup(player, powerupId, mouseX = 0, mouseY = 0) {
        if (!this.canUsePowerup(player, powerupId)) {
            return false;
        }
        
        const powerup = this.powerups[powerupId];
        
        // Deduct cost
        if (powerup.currency === 'coins') {
            player.coins -= powerup.cost;
        } else if (powerup.currency === 'platinum') {
            player.platinumCoins -= powerup.cost;
        }
        
        // Set cooldown
        this.powerupCooldowns.set(powerupId, Date.now() + powerup.cooldown);
        
        // Execute powerup effect
        const success = this.executePowerup(player, powerupId, mouseX, mouseY);
        
        if (success) {
            // Trigger events for UI and effects
            gameEvents.emit('powerupUsed', {
                player: player,
                powerupId: powerupId,
                powerup: powerup
            });
            
            // Show visual effect
            this.showPowerupEffect(player, powerup);
        }
        
        return success;
    }
    
    // CORE METHOD: Get cooldown remaining (called by UIManager)
    getCooldownRemaining(powerupId) {
        const cooldownEnd = this.powerupCooldowns.get(powerupId) || 0;
        const remaining = Math.max(0, cooldownEnd - Date.now());
        return remaining;
    }
    
    // CORE METHOD: Get all powerups (called by UIManager)
    getAllPowerups() {
        return this.powerups;
    }
    
    // Execute specific powerup effects
    executePowerup(player, powerupId, mouseX, mouseY) {
        switch (powerupId) {
            case 'recombine':
                return this.executeRecombinePowerup(player, mouseX, mouseY);
            case 'speedBoost':
                return this.executeSpeedBoost(player);
            case 'massShield':
                return this.executeMassShield(player);
            case 'splitBoost':
                return this.executeSplitBoost(player);
            case 'magnetism':
                return this.executeMagnetism(player);
            default:
                return false;
        }
    }
    
    // RECOMBINE POWERUP - Complete implementation
    executeRecombinePowerup(player, mouseX, mouseY) {
        if (!player.cells || player.cells.length <= 1) return false;
        
        // Calculate direction from player center to mouse
        const centerMass = this.getPlayerCenterMass(player);
        const direction = this.calculateMouseDirection(centerMass, mouseX, mouseY);
        
        // Start recombine sequence with directional momentum
        this.startRecombineSequence(player, direction);
        
        return true;
    }
    
    getPlayerCenterMass(player) {
        let totalX = 0, totalY = 0, totalMass = 0;
        
        for (const cell of player.cells) {
            totalX += cell.x * cell.mass;
            totalY += cell.y * cell.mass;
            totalMass += cell.mass;
        }
        
        return {
            x: totalX / totalMass,
            y: totalY / totalMass
        };
    }
    
    calculateMouseDirection(center, mouseX, mouseY) {
        const dx = mouseX - center.x;
        const dy = mouseY - center.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) {
            // If no direction, use a default direction
            return { x: 1, y: 0 };
        }
        
        return {
            x: dx / length,
            y: dy / length
        };
    }
    
    startRecombineSequence(player, direction) {
        if (player.cells.length <= 1) return;
        
        const mergeSpeed = 8.0;
        const momentumRetention = 0.3;
        
        // Sort cells by distance from direction
        const cells = [...player.cells];
        const center = this.getPlayerCenterMass(player);
        
        // Calculate target position in the direction of mouse
        const targetDistance = 50;
        const targetX = center.x + direction.x * targetDistance;
        const targetY = center.y + direction.y * targetDistance;
        
        // Start merging cells sequentially
        this.executeMergeSequence(player, cells, targetX, targetY, mergeSpeed, momentumRetention);
    }
    
    executeMergeSequence(player, cells, targetX, targetY, mergeSpeed, momentumRetention) {
        // Keep the largest cell as the base
        cells.sort((a, b) => b.mass - a.mass);
        const mainCell = cells[0];
        const cellsToMerge = cells.slice(1);
        
        // Apply directional momentum to main cell
        const totalMomentumX = cells.reduce((sum, cell) => sum + (cell.velocity?.x || 0) * cell.mass, 0);
        const totalMomentumY = cells.reduce((sum, cell) => sum + (cell.velocity?.y || 0) * cell.mass, 0);
        const totalMass = player.totalMass;
        
        // Ensure velocity object exists
        if (!mainCell.velocity) {
            mainCell.velocity = { x: 0, y: 0 };
        }
        
        // Set main cell velocity with retained momentum and directional boost
        mainCell.velocity.x = (totalMomentumX / totalMass) * momentumRetention + (targetX - mainCell.x) * 0.1;
        mainCell.velocity.y = (totalMomentumY / totalMass) * momentumRetention + (targetY - mainCell.y) * 0.1;
        
        // Merge all other cells into the main cell
        for (const cell of cellsToMerge) {
            mainCell.mass += cell.mass;
        }
        
        // Update player cells array
        player.cells = [mainCell];
        if (typeof player.updateTotalMass === 'function') {
            player.updateTotalMass();
        } else {
            player.totalMass = mainCell.mass;
        }
        
        if (typeof mainCell.updateRadius === 'function') {
            mainCell.updateRadius();
        } else {
            mainCell.radius = Math.sqrt(mainCell.mass / Math.PI);
        }
        
        // Reset recombine timer
        player.recombineTime = Date.now() + (CONFIG.physics?.recombineDelay || 15000);
        
        // Create merge effect
        this.createMergeEffect(mainCell, cellsToMerge);
    }
    
    // SPEED BOOST POWERUP
    executeSpeedBoost(player) {
        const powerupId = 'speedBoost_' + (player.id || player.name);
        const duration = this.powerups.speedBoost.duration;
        
        this.activePowerups.set(powerupId, {
            type: 'speedBoost',
            player: player,
            startTime: Date.now(),
            duration: duration,
            multiplier: 1.5
        });
        
        return true;
    }
    
    // MASS SHIELD POWERUP
    executeMassShield(player) {
        const powerupId = 'massShield_' + (player.id || player.name);
        const duration = this.powerups.massShield.duration;
        
        this.activePowerups.set(powerupId, {
            type: 'massShield',
            player: player,
            startTime: Date.now(),
            duration: duration,
            protection: 0.5 // 50% damage reduction
        });
        
        return true;
    }
    
    // SPLIT BOOST POWERUP
    executeSplitBoost(player) {
        const powerupId = 'splitBoost_' + (player.id || player.name);
        const duration = this.powerups.splitBoost.duration;
        
        this.activePowerups.set(powerupId, {
            type: 'splitBoost',
            player: player,
            startTime: Date.now(),
            duration: duration,
            multiplier: 2.0 // 100% increase
        });
        
        return true;
    }
    
    // MAGNETISM POWERUP
    executeMagnetism(player) {
        const powerupId = 'magnetism_' + (player.id || player.name);
        const duration = this.powerups.magnetism.duration;
        
        this.activePowerups.set(powerupId, {
            type: 'magnetism',
            player: player,
            startTime: Date.now(),
            duration: duration,
            radius: 100,
            force: 5.0
        });
        
        return true;
    }
    
    // Update active powerups
    updateActivePowerups(currentTime) {
        const toRemove = [];
        
        for (const [powerupId, powerup] of this.activePowerups) {
            const elapsed = currentTime - powerup.startTime;
            
            if (elapsed >= powerup.duration) {
                // Powerup expired
                this.removePowerupEffect(powerup);
                toRemove.push(powerupId);
            } else {
                // Update powerup effect
                this.updatePowerupEffect(powerup, elapsed);
            }
        }
        
        // Remove expired powerups
        for (const powerupId of toRemove) {
            this.activePowerups.delete(powerupId);
        }
    }
    
    updatePowerupEffect(powerup, elapsed) {
        switch (powerup.type) {
            case 'magnetism':
                this.updateMagnetismEffect(powerup);
                break;
            case 'speedBoost':
                // Speed boost is passive - checked by movement system
                break;
            case 'massShield':
                // Mass shield is passive - checked during damage calculation
                break;
            case 'splitBoost':
                // Split boost is passive - checked during splitting
                break;
        }
    }
    
    updateMagnetismEffect(powerup) {
        const player = powerup.player;
        const magnetRadius = powerup.radius;
        const magnetForce = powerup.force;
        
        // Only process if game has quadTree
        if (!this.game.quadTree) return;
        
        // Find nearby food for each player cell
        for (const cell of player.cells) {
            const nearbyFood = this.game.quadTree.queryRange(
                cell.x - magnetRadius,
                cell.y - magnetRadius,
                cell.x + magnetRadius,
                cell.y + magnetRadius
            );
            
            for (const item of nearbyFood) {
                if (item.type === 'food') {
                    const dx = cell.x - item.x;
                    const dy = cell.y - item.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < magnetRadius && distance > 0) {
                        const force = magnetForce / (distance * distance + 1);
                        
                        // Ensure velocity object exists
                        if (!item.velocity) {
                            item.velocity = { x: 0, y: 0 };
                        }
                        
                        item.velocity.x += (dx / distance) * force;
                        item.velocity.y += (dy / distance) * force;
                    }
                }
            }
        }
    }
    
    removePowerupEffect(powerup) {
        // Clean up any temporary effects
        gameEvents.emit('powerupExpired', {
            player: powerup.player,
            type: powerup.type
        });
    }
    
    updateCooldowns(currentTime) {
        // Cooldowns are handled by checking against stored timestamps
        // No active cleanup needed
    }
    
    // Visual effects
    showPowerupEffect(player, powerup) {
        // Create visual effect for powerup activation
        gameEvents.emit('showPowerupEffect', {
            player: player,
            powerup: powerup,
            x: player.x || (player.cells && player.cells[0] ? player.cells[0].x : 0),
            y: player.y || (player.cells && player.cells[0] ? player.cells[0].y : 0)
        });
    }
    
    createMergeEffect(mainCell, mergedCells) {
        // Create particle effect for cell merging
        gameEvents.emit('createMergeEffect', {
            mainCell: mainCell,
            mergedCells: mergedCells
        });
    }
    
    // Helper methods for other systems to check powerup states
    hasActivePowerup(player, type) {
        for (const [_, powerup] of this.activePowerups) {
            if (powerup.player === player && powerup.type === type) {
                return true;
            }
        }
        return false;
    }
    
    getPowerupMultiplier(player, type) {
        for (const [_, powerup] of this.activePowerups) {
            if (powerup.player === player && powerup.type === type) {
                return powerup.multiplier || 1;
            }
        }
        return 1;
    }
    
    getPowerupProtection(player, type) {
        for (const [_, powerup] of this.activePowerups) {
            if (powerup.player === player && powerup.type === type) {
                return powerup.protection || 0;
            }
        }
        return 0;
    }
    
    getActivePowerupsForPlayer(player) {
        const activePowerups = [];
        
        for (const [_, powerup] of this.activePowerups) {
            if (powerup.player === player) {
                activePowerups.push({
                    type: powerup.type,
                    timeRemaining: powerup.duration - (Date.now() - powerup.startTime)
                });
            }
        }
        
        return activePowerups;
    }
    
    // Event handlers for game events
    handlePlayerDamaged(player, damage) {
        // Apply mass shield protection if active
        if (this.hasActivePowerup(player, 'massShield')) {
            const protection = this.getPowerupProtection(player, 'massShield');
            const reducedDamage = damage * (1 - protection);
            
            // Emit event with reduced damage
            gameEvents.emit('damageReduced', {
                player: player,
                originalDamage: damage,
                finalDamage: reducedDamage,
                protection: protection
            });
            
            return reducedDamage;
        }
        
        return damage;
    }
    
    handlePlayerSplit(player, cells) {
        // Apply split boost if active
        if (this.hasActivePowerup(player, 'splitBoost')) {
            const multiplier = this.getPowerupMultiplier(player, 'splitBoost');
            
            // Boost the velocity of newly split cells
            for (const cell of cells) {
                if (cell.velocity) {
                    cell.velocity.x *= multiplier;
                    cell.velocity.y *= multiplier;
                }
            }
        }
    }
    
    // Method to get speed multiplier for movement system
    getSpeedMultiplier(player) {
        return this.getPowerupMultiplier(player, 'speedBoost');
    }
    
    // Method to get split multiplier for physics system
    getSplitMultiplier(player) {
        return this.getPowerupMultiplier(player, 'splitBoost');
    }
    
    // Method to check if player has damage reduction
    getDamageReduction(player) {
        return this.getPowerupProtection(player, 'massShield');
    }
    
    // Cleanup method
    cleanup() {
        this.activePowerups.clear();
        this.powerupCooldowns.clear();
    }
}
