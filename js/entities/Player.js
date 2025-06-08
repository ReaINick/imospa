// js/entities/Player.js
import { Cell } from './Cell.js';
import { Utils } from '../utils/Utils.js';
import { CONFIG } from '../core/Config.js';
import { gameEvents } from '../core/EventSystem.js';

export class Player extends Cell {
    constructor(x, y, name = 'Player') {
        super(x, y, CONFIG.PLAYER.STARTING_MASS);
        
        // Player identification
        this.name = name;
        this.id = Utils.generateId();
        this.isPlayer = true;
        
        // Multiple cells system
        this.cells = [this];
        this.maxCells = CONFIG.PLAYER.MAX_CELLS;
        this.splitCooldown = 0;
        this.recombineTimer = new Map(); // Track when cells can recombine
        
        // Progression
        this.level = 1;
        this.experience = 0;
        this.experienceToNext = this.calculateExperienceToNext();
        
        // Currency
        this.coins = 0;
        this.platinumCoins = 0;
        
        // Stats
        this.statistics = {
            totalMassConsumed: 0,
            cellsAbsorbed: 0,
            playersDefeated: 0,
            timesEaten: 0,
            highestMass: CONFIG.PLAYER.STARTING_MASS,
            gamesPlayed: 0,
            totalPlayTime: 0
        };
        
        // Powerups and effects
        this.activePowerups = new Map();
        this.powerupCooldowns = new Map();
        
        // Visual effects
        this.nameColor = '#FFFFFF';
        this.skinId = 'default';
        this.trailEffect = null;
        
        // Input handling
        this.mouseX = 0;
        this.mouseY = 0;
        this.targetDirection = { x: 0, y: 0 };
        
        // State
        this.isDead = false;
        this.lastSplitTime = 0;
        this.invulnerabilityTime = 0;
    }

    // Core player methods
    update(deltaTime) {
        if (this.isDead) return;
        
        this.updateCooldowns(deltaTime);
        this.updatePowerups(deltaTime);
        this.updateCells(deltaTime);
        this.updateCombinedStats();
        this.checkLevelUp();
        
        // Update highest mass stat if needed
        if (this.getTotalMass() > this.statistics.highestMass) {
            this.statistics.highestMass = this.getTotalMass();
        }
    }

    updateCells(deltaTime) {
        for (let i = 0; i < this.cells.length; i++) {
            const cell = this.cells[i];
            
            // Update cell physics
            this.updateCellMovement(cell, deltaTime);
            
            // Check if cells can recombine
            this.checkCellRecombination(cell);
        }
        
        // Remove dead cells
        this.cells = this.cells.filter(cell => !cell.isDead);
        
        // Check if player is completely dead
        if (this.cells.length === 0) {
            this.die();
        }
    }

    updateCellMovement(cell, deltaTime) {
        // Calculate direction to mouse
        this.updateTargetDirection(cell);
        
        // Apply movement force based on mass
        const maxSpeed = this.getMaxSpeed(cell.mass);
        const acceleration = CONFIG.PHYSICS.ACCELERATION / Math.sqrt(cell.mass);
        
        // Apply acceleration towards target
        cell.velocity.x += this.targetDirection.x * acceleration * deltaTime;
        cell.velocity.y += this.targetDirection.y * acceleration * deltaTime;
        
        // Limit velocity
        const currentSpeed = Math.sqrt(cell.velocity.x ** 2 + cell.velocity.y ** 2);
        if (currentSpeed > maxSpeed) {
            cell.velocity.x = (cell.velocity.x / currentSpeed) * maxSpeed;
            cell.velocity.y = (cell.velocity.y / currentSpeed) * maxSpeed;
        }
        
        // Apply friction
        cell.velocity.x *= CONFIG.PHYSICS.FRICTION;
        cell.velocity.y *= CONFIG.PHYSICS.FRICTION;
        
        // Update position
        cell.x += cell.velocity.x * deltaTime;
        cell.y += cell.velocity.y * deltaTime;
        
        // Keep within bounds
        this.keepCellInBounds(cell);
    }

    updateTargetDirection(cell) {
        const dx = this.mouseX - cell.x;
        const dy = this.mouseY - cell.y;
        const distance = Math.sqrt(dx ** 2 + dy ** 2);
        
        if (distance > 0) {
            this.targetDirection.x = dx / distance;
            this.targetDirection.y = dy / distance;
        }
    }

    getMaxSpeed(mass) {
        const baseSpeed = CONFIG.PHYSICS.BASE_SPEED;
        const massPenalty = Math.log(mass) * CONFIG.PHYSICS.MASS_SPEED_FACTOR;
        return Math.max(CONFIG.PHYSICS.MIN_SPEED, baseSpeed - massPenalty);
    }

    keepCellInBounds(cell) {
        const margin = cell.radius;
        
        if (cell.x - margin < 0) {
            cell.x = margin;
            cell.velocity.x *= -CONFIG.PHYSICS.BOUNDARY_BOUNCE;
        } else if (cell.x + margin > CONFIG.WORLD.WIDTH) {
            cell.x = CONFIG.WORLD.WIDTH - margin;
            cell.velocity.x *= -CONFIG.PHYSICS.BOUNDARY_BOUNCE;
        }
        
        if (cell.y - margin < 0) {
            cell.y = margin;
            cell.velocity.y *= -CONFIG.PHYSICS.BOUNDARY_BOUNCE;
        } else if (cell.y + margin > CONFIG.WORLD.HEIGHT) {
            cell.y = CONFIG.WORLD.HEIGHT - margin;
            cell.velocity.y *= -CONFIG.PHYSICS.BOUNDARY_BOUNCE;
        }
    }

    // Splitting system
    split() {
        if (!this.canSplit()) return false;
        
        const cellsToSplit = this.cells.filter(cell => 
            cell.mass >= CONFIG.PLAYER.MIN_SPLIT_MASS
        );
        
        if (cellsToSplit.length === 0) return false;
        
        const newCells = [];
        
        for (const cell of cellsToSplit) {
            if (this.cells.length + newCells.length >= this.maxCells) break;
            
            const newCell = this.createSplitCell(cell);
            if (newCell) {
                newCells.push(newCell);
                
                // Set recombine timer
                const cellId = cell.id + '-' + newCell.id;
                this.recombineTimer.set(cellId, Date.now() + CONFIG.PLAYER.RECOMBINE_TIME);
            }
        }
        
        if (newCells.length > 0) {
            this.cells.push(...newCells);
            this.lastSplitTime = Date.now();
            this.splitCooldown = CONFIG.PLAYER.SPLIT_COOLDOWN;
            
            gameEvents.emit('playerSplit', {
                player: this,
                newCells: newCells.length
            });
            
            return true;
        }
        
        return false;
    }

    createSplitCell(parentCell) {
        // Calculate split masses
        const totalMass = parentCell.mass;
        const newMass = totalMass / 2;
        
        // Create new cell
        const splitDirection = this.getSplitDirection(parentCell);
        const distance = parentCell.radius + Math.sqrt(newMass / Math.PI) + 5;
        
        const newCell = new Cell(
            parentCell.x + splitDirection.x * distance,
            parentCell.y + splitDirection.y * distance,
            newMass
        );
        
        // Apply split momentum
        const momentum = CONFIG.PHYSICS.SPLIT_MOMENTUM;
        newCell.velocity.x = splitDirection.x * momentum;
        newCell.velocity.y = splitDirection.y * momentum;
        
        // Update parent cell
        parentCell.mass = newMass;
        parentCell.updateRadius();
        parentCell.velocity.x = -splitDirection.x * momentum * 0.5;
        parentCell.velocity.y = -splitDirection.y * momentum * 0.5;
        
        // Copy visual properties
        newCell.color = parentCell.color;
        newCell.ownerId = this.id;
        
        return newCell;
    }

    getSplitDirection(cell) {
        // Use mouse direction or random if mouse is too close
        const dx = this.mouseX - cell.x;
        const dy = this.mouseY - cell.y;
        const distance = Math.sqrt(dx ** 2 + dy ** 2);
        
        if (distance > 20) {
            return { x: dx / distance, y: dy / distance };
        } else {
            // Random direction
            const angle = Math.random() * Math.PI * 2;
            return { x: Math.cos(angle), y: Math.sin(angle) };
        }
    }

    canSplit() {
        return this.splitCooldown <= 0 && 
               this.cells.length < this.maxCells &&
               this.cells.some(cell => cell.mass >= CONFIG.PLAYER.MIN_SPLIT_MASS);
    }

    // Recombination system
    checkCellRecombination(cell) {
        for (let i = 0; i < this.cells.length; i++) {
            const otherCell = this.cells[i];
            if (cell === otherCell) continue;
            
            const cellPairId = Math.min(cell.id, otherCell.id) + '-' + Math.max(cell.id, otherCell.id);
            const recombineTime = this.recombineTimer.get(cellPairId);
            
            if (!recombineTime || Date.now() < recombineTime) continue;
            
            // Check if cells are close enough to recombine
            const distance = Utils.getDistance(cell.x, cell.y, otherCell.x, otherCell.y);
            const combinedRadius = cell.radius + otherCell.radius;
            
            if (distance < combinedRadius * 0.8) {
                this.recombineCells(cell, otherCell);
                this.recombineTimer.delete(cellPairId);
                break;
            }
        }
    }

    recombineCells(cell1, cell2) {
        // Combine masses
        const totalMass = cell1.mass + cell2.mass;
        
        // Keep the larger cell, remove the smaller
        const keepCell = cell1.mass >= cell2.mass ? cell1 : cell2;
        const removeCell = cell1.mass >= cell2.mass ? cell2 : cell1;
        
        // Update the kept cell
        keepCell.mass = totalMass;
        keepCell.updateRadius();
        
        // Average velocities based on mass
        const massRatio1 = cell1.mass / totalMass;
        const massRatio2 = cell2.mass / totalMass;
        
        keepCell.velocity.x = cell1.velocity.x * massRatio1 + cell2.velocity.x * massRatio2;
        keepCell.velocity.y = cell1.velocity.y * massRatio1 + cell2.velocity.y * massRatio2;
        
        // Remove the smaller cell
        const index = this.cells.indexOf(removeCell);
        if (index > -1) {
            this.cells.splice(index, 1);
        }
        
        gameEvents.emit('cellsRecombined', {
            player: this,
            finalMass: totalMass
        });
    }

    // Absorption and growth
    absorb(target) {
        // Find the best cell to do the absorption
        let bestCell = null;
        let bestDistance = Infinity;
        
        for (const cell of this.cells) {
            const distance = Utils.getDistance(cell.x, cell.y, target.x, target.y);
            if (distance < bestDistance && cell.canAbsorb(target)) {
                bestCell = cell;
                bestDistance = distance;
            }
        }
        
        if (bestCell && bestCell.absorb(target)) {
            this.onAbsorption(target);
            return true;
        }
        
        return false;
    }

    onAbsorption(target) {
        const massGained = target.mass;
        
        // Update statistics
        this.statistics.totalMassConsumed += massGained;
        
        if (target.isPlayer) {
            this.statistics.playersDefeated++;
            this.statistics.cellsAbsorbed++;
        } else if (target.isFood) {
            // Food absorption
        } else {
            this.statistics.cellsAbsorbed++;
        }
        
        // Award experience and coins
        this.gainExperience(Math.floor(massGained));
        this.gainCoins(Math.floor(massGained / 10));
        
        gameEvents.emit('playerAbsorption', {
            player: this,
            target: target,
            massGained: massGained
        });
    }

    // Progression system
    gainExperience(amount) {
        this.experience += amount;
        this.checkLevelUp();
    }

    checkLevelUp() {
        while (this.experience >= this.experienceToNext) {
            this.levelUp();
        }
    }

    levelUp() {
        this.experience -= this.experienceToNext;
        this.level++;
        
        // Award level up rewards
        const coinReward = 25 + (this.level * 5);
        this.gainCoins(coinReward);
        
        // Recalculate experience needed for next level
        this.experienceToNext = this.calculateExperienceToNext();
        
        gameEvents.emit('playerLevelUp', {
            player: this,
            newLevel: this.level,
            coinReward: coinReward
        });
    }

    calculateExperienceToNext() {
        return Math.floor(100 * Math.pow(1.5, this.level - 1));
    }

    gainCoins(amount) {
        this.coins += amount;
        
        gameEvents.emit('coinsGained', {
            player: this,
            amount: amount,
            total: this.coins
        });
    }

    // Utility methods
    updateCombinedStats() {
        // This is called to update stats that depend on all cells
    }

    updateCooldowns(deltaTime) {
        if (this.splitCooldown > 0) {
            this.splitCooldown -= deltaTime;
        }
        
        if (this.invulnerabilityTime > 0) {
            this.invulnerabilityTime -= deltaTime;
        }
    }

    updatePowerups(deltaTime) {
        for (const [powerupId, powerup] of this.activePowerups) {
            powerup.duration -= deltaTime;
            
            if (powerup.duration <= 0) {
                this.removePowerup(powerupId);
            }
        }
        
        // Update cooldowns
        for (const [powerupId, cooldown] of this.powerupCooldowns) {
            const newCooldown = cooldown - deltaTime;
            if (newCooldown <= 0) {
                this.powerupCooldowns.delete(powerupId);
            } else {
                this.powerupCooldowns.set(powerupId, newCooldown);
            }
        }
    }

    removePowerup(powerupId) {
        const powerup = this.activePowerups.get(powerupId);
        if (powerup && powerup.onRemove) {
            powerup.onRemove(this);
        }
        
        this.activePowerups.delete(powerupId);
    }

    getTotalMass() {
        return this.cells.reduce((total, cell) => total + cell.mass, 0);
    }

    getLargestCell() {
        return this.cells.reduce((largest, cell) => 
            cell.mass > largest.mass ? cell : largest, this.cells[0]);
    }

    getCenterOfMass() {
        let totalMass = 0;
        let weightedX = 0;
        let weightedY = 0;
        
        for (const cell of this.cells) {
            totalMass += cell.mass;
            weightedX += cell.x * cell.mass;
            weightedY += cell.y * cell.mass;
        }
        
        return {
            x: weightedX / totalMass,
            y: weightedY / totalMass
        };
    }

    setMousePosition(x, y) {
        this.mouseX = x;
        this.mouseY = y;
    }

    die() {
        this.isDead = true;
        this.statistics.timesEaten++;
        
        gameEvents.emit('playerDied', {
            player: this,
            finalMass: this.getTotalMass(),
            level: this.level
        });
    }

    respawn(x, y) {
        this.isDead = false;
        this.cells = [new Cell(x, y, CONFIG.PLAYER.STARTING_MASS)];
        this.cells[0].color = this.generateColor();
        this.cells[0].ownerId = this.id;
        
        // Reset some stats but keep progression
        this.invulnerabilityTime = CONFIG.PLAYER.RESPAWN_INVULNERABILITY;
        this.recombineTimer.clear();
        this.splitCooldown = 0;
        
        gameEvents.emit('playerRespawned', { player: this });
    }

    // Serialization for save system
    serialize() {
        return {
            name: this.name,
            id: this.id,
            level: this.level,
            experience: this.experience,
            coins: this.coins,
            platinumCoins: this.platinumCoins,
            statistics: { ...this.statistics },
            nameColor: this.nameColor,
            skinId: this.skinId,
            trailEffect: this.trailEffect
        };
    }

    static deserialize(data, x, y) {
        const player = new Player(x, y, data.name);
        player.id = data.id;
        player.level = data.level;
        player.experience = data.experience;
        player.experienceToNext = player.calculateExperienceToNext();
        player.coins = data.coins;
        player.platinumCoins = data.platinumCoins;
        player.statistics = { ...player.statistics, ...data.statistics };
        player.nameColor = data.nameColor;
        player.skinId = data.skinId;
        player.trailEffect = data.trailEffect;
        
        return player;
    }
}
