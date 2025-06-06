// js/entities/Food.js
import { Cell } from './Cell.js';
import { Utils } from '../utils/Utils.js';
import { Config } from '../core/Config.js';

export class Food extends Cell {
    constructor(x, y, type = 'normal') {
        // Food mass varies by type
        const mass = Food.getMassForType(type);
        super(x, y, mass);
        
        this.type = type;
        this.isFood = true;
        this.isStatic = true; // Food doesn't move
        
        // Visual properties
        this.color = this.generateFoodColor();
        this.pulsePhase = Math.random() * Math.PI * 2; // For animation
        this.glowIntensity = 0;
        
        // Spawn properties
        this.spawnTime = Date.now();
        this.lifetime = this.getLifetime();
        this.decayRate = 0; // Some food types decay over time
        
        // Special properties based on type
        this.setupTypeProperties();
        
        // Value properties
        this.experienceValue = this.calculateExperienceValue();
        this.coinValue = this.calculateCoinValue();
        
        // Physics (food doesn't move but has basic physics for consistency)
        this.velocity = { x: 0, y: 0 };
        this.isDead = false;
    }

    static getMassForType(type) {
        const massConfig = {
            'normal': Utils.randomRange(2, 5),
            'large': Utils.randomRange(8, 12),
            'mega': Utils.randomRange(15, 25),
            'golden': Utils.randomRange(10, 15),
            'speed': Utils.randomRange(3, 6),
            'toxic': Utils.randomRange(5, 8),
            'regenerative': Utils.randomRange(6, 10),
            'explosive': Utils.randomRange(4, 7)
        };
        
        return massConfig[type] || massConfig['normal'];
    }

    setupTypeProperties() {
        switch (this.type) {
            case 'normal':
                // Standard food, no special properties
                break;
                
            case 'large':
                this.experienceMultiplier = 1.5;
                this.coinMultiplier = 1.5;
                break;
                
            case 'mega':
                this.experienceMultiplier = 2.0;
                this.coinMultiplier = 2.0;
                this.glowIntensity = 0.3;
                break;
                
            case 'golden':
                this.experienceMultiplier = 3.0;
                this.coinMultiplier = 5.0;
                this.glowIntensity = 0.5;
                this.lifetime = 30000; // 30 seconds before despawn
                this.spawnChance = 0.001; // Very rare
                break;
                
            case 'speed':
                this.speedBoostDuration = 5000; // 5 seconds
                this.speedBoostMultiplier = 1.5;
                break;
                
            case 'toxic':
                this.toxicDamage = 0.1; // 10% mass loss over time
                this.toxicDuration = 8000; // 8 seconds
                this.decayRate = 0.001; // Slowly shrinks
                break;
                
            case 'regenerative':
                this.healAmount = 0.05; // 5% mass restoration
                this.healDuration = 10000; // 10 seconds
                break;
                
            case 'explosive':
                this.explosionRadius = 50;
                this.explosionForce = 200;
                this.armingTime = 2000; // 2 seconds after spawn
                break;
        }
    }

    generateFoodColor() {
        const colors = {
            'normal': () => Utils.randomColor([
                '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
                '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD'
            ]),
            'large': () => Utils.randomColor([
                '#FF4757', '#3742FA', '#2ED573', '#FFA502'
            ]),
            'mega': () => Utils.randomColor([
                '#FF3838', '#2F3542', '#40407A', '#706FD3'
            ]),
            'golden': () => '#FFD700',
            'speed': () => '#00D2FF',
            'toxic': () => '#00FF41',
            'regenerative': () => '#FF6B9D',
            'explosive': () => '#FF4444'
        };
        
        const colorFunc = colors[this.type] || colors['normal'];
        return colorFunc();
    }

    calculateExperienceValue() {
        const baseExp = Math.floor(this.mass * 0.5);
        const multiplier = this.experienceMultiplier || 1;
        return Math.floor(baseExp * multiplier);
    }

    calculateCoinValue() {
        const baseCoins = Math.floor(this.mass * 0.1);
        const multiplier = this.coinMultiplier || 1;
        return Math.floor(baseCoins * multiplier);
    }

    getLifetime() {
        const lifetimes = {
            'normal': -1, // Permanent
            'large': -1,
            'mega': 60000, // 1 minute
            'golden': 30000, // 30 seconds
            'speed': -1,
            'toxic': 45000, // 45 seconds
            'regenerative': -1,
            'explosive': 20000 // 20 seconds
        };
        
        return lifetimes[this.type] || -1;
    }

    update(deltaTime) {
        if (this.isDead) return;
        
        // Update visual effects
        this.updateVisuals(deltaTime);
        
        // Handle decay
        if (this.decayRate > 0) {
            this.mass -= this.mass * this.decayRate * deltaTime / 1000;
            this.updateRadius();
            
            if (this.mass < 1) {
                this.isDead = true;
                return;
            }
        }
        
        // Handle lifetime
        if (this.lifetime > 0) {
            const age = Date.now() - this.spawnTime;
            if (age > this.lifetime) {
                this.startDespawn();
            }
        }
        
        // Type-specific updates
        this.updateTypeSpecific(deltaTime);
    }

    updateVisuals(deltaTime) {
        // Pulse animation for all food
        this.pulsePhase += deltaTime * 0.003; // Slow pulse
        
        // Glow effect for special food
        if (this.glowIntensity > 0) {
            this.currentGlow = this.glowIntensity * (0.8 + 0.2 * Math.sin(this.pulsePhase));
        }
    }

    updateTypeSpecific(deltaTime) {
        switch (this.type) {
            case 'explosive':
                if (this.isArmed()) {
                    this.updateExplosiveState(deltaTime);
                }
                break;
                
            case 'golden':
                // Sparkle effect updates would go here
                break;
        }
    }

    isArmed() {
        return this.type === 'explosive' && 
               (Date.now() - this.spawnTime) > (this.armingTime || 0);
    }

    updateExplosiveState(deltaTime) {
        // Increase visual intensity as it gets ready to explode
        const timeAlive = Date.now() - this.spawnTime;
        const timeUntilExplosion = this.lifetime - timeAlive;
        
        if (timeUntilExplosion < 3000) { // Last 3 seconds
            this.pulsePhase += deltaTime * 0.01; // Faster pulse
            this.glowIntensity = 0.3 + 0.4 * (1 - timeUntilExplosion / 3000);
        }
    }

    // Consumption effects
    onConsumed(consumer) {
        // Apply type-specific effects to the consumer
        switch (this.type) {
            case 'speed':
                this.applySpeedBoost(consumer);
                break;
                
            case 'toxic':
                this.applyToxicEffect(consumer);
                break;
                
            case 'regenerative':
                this.applyRegenerativeEffect(consumer);
                break;
                
            case 'explosive':
                if (this.isArmed()) {
                    this.triggerExplosion(consumer);
                }
                break;
        }
        
        // Common effects
        return {
            experience: this.experienceValue,
            coins: this.coinValue,
            mass: this.mass
        };
    }

    applySpeedBoost(consumer) {
        if (!consumer.activePowerups) return;
        
        consumer.activePowerups.set('speed_boost', {
            type: 'speed_boost',
            duration: this.speedBoostDuration,
            multiplier: this.speedBoostMultiplier,
            onRemove: (player) => {
                // Remove speed boost effect
            }
        });
    }

    applyToxicEffect(consumer) {
        if (!consumer.activePowerups) return;
        
        consumer.activePowerups.set('toxic_effect', {
            type: 'toxic_effect',
            duration: this.toxicDuration,
            damagePerSecond: this.toxicDamage,
            onUpdate: (player, deltaTime) => {
                // Apply damage over time to all cells
                for (const cell of player.cells) {
                    const damage = cell.mass * this.toxicDamage * (deltaTime / 1000);
                    cell.mass = Math.max(5, cell.mass - damage);
                    cell.updateRadius();
                }
            },
            onRemove: (player) => {
                // Toxic effect ends
            }
        });
    }

    applyRegenerativeEffect(consumer) {
        if (!consumer.activePowerups) return;
        
        consumer.activePowerups.set('regenerative_effect', {
            type: 'regenerative_effect',
            duration: this.healDuration,
            healPerSecond: this.healAmount,
            onUpdate: (player, deltaTime) => {
                // Slowly heal all cells
                for (const cell of player.cells) {
                    const healing = cell.mass * this.healAmount * (deltaTime / 1000);
                    cell.mass += healing;
                    cell.updateRadius();
                }
            },
            onRemove: (player) => {
                // Regeneration ends
            }
        });
    }

    triggerExplosion(consumer) {
        // Create explosion effect
        const explosion = {
            x: this.x,
            y: this.y,
            radius: this.explosionRadius,
            force: this.explosionForce,
            source: consumer
        };
        
        // This would be handled by the physics engine
        // For now, we'll emit an event
        if (typeof EventSystem !== 'undefined') {
            EventSystem.emit('foodExplosion', explosion);
        }
    }

    startDespawn() {
        // Begin despawn animation
        this.isDespawning = true;
        this.despawnStartTime = Date.now();
        this.despawnDuration = 2000; // 2 second fade out
    }

    getDespawnAlpha() {
        if (!this.isDespawning) return 1;
        
        const elapsed = Date.now() - this.despawnStartTime;
        const progress = elapsed / this.despawnDuration;
        
        if (progress >= 1) {
            this.isDead = true;
            return 0;
        }
        
        return 1 - progress;
    }

    // Rendering helpers
    getRenderRadius() {
        const baseRadius = this.radius;
        const pulseEffect = 1 + 0.1 * Math.sin(this.pulsePhase);
        return baseRadius * pulseEffect;
    }

    getRenderColor() {
        if (this.isDespawning) {
            const alpha = this.getDespawnAlpha();
            return this.addAlphaToColor(this.color, alpha);
        }
        
        return this.color;
    }

    addAlphaToColor(color, alpha) {
        // Convert hex to rgba if needed
        if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        
        return color;
    }

    // Static factory methods for different food types
    static createNormalFood(x, y) {
        return new Food(x, y, 'normal');
    }

    static createLargeFood(x, y) {
        return new Food(x, y, 'large');
    }

    static createMegaFood(x, y) {
        return new Food(x, y, 'mega');
    }

    static createGoldenFood(x, y) {
        return new Food(x, y, 'golden');
    }

    static createSpeedFood(x, y) {
        return new Food(x, y, 'speed');
    }

    static createToxicFood(x, y) {
        return new Food(x, y, 'toxic');
    }

    static createRegenerativeFood(x, y) {
        return new Food(x, y, 'regenerative');
    }

    static createExplosiveFood(x, y) {
        return new Food(x, y, 'explosive');
    }

    // Utility methods
    canBeEaten() {
        return !this.isDead && !this.isDespawning;
    }

    getAge() {
        return Date.now() - this.spawnTime;
    }

    getTimeUntilDespawn() {
        if (this.lifetime <= 0) return -1;
        return Math.max(0, this.lifetime - this.getAge());
    }

    isRare() {
        return ['golden', 'mega', 'explosive'].includes(this.type);
    }

    getSpawnWeight() {
        // Used by food spawner to determine spawn probability
        const weights = {
            'normal': 70,
            'large': 20,
            'mega': 5,
            'golden': 1,
            'speed': 15,
            'toxic': 8,
            'regenerative': 10,
            'explosive': 3
        };
        
        return weights[this.type] || weights['normal'];
    }

    // Serialization (for saving special food states if needed)
    serialize() {
        return {
            x: this.x,
            y: this.y,
            mass: this.mass,
            type: this.type,
            spawnTime: this.spawnTime,
            color: this.color
        };
    }

    static deserialize(data) {
        const food = new Food(data.x, data.y, data.type);
        food.mass = data.mass;
        food.spawnTime = data.spawnTime;
        food.color = data.color;
        food.updateRadius();
        return food;
    }
}
