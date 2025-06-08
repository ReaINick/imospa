// js/entities/Cell.js
import { CONFIG } from '../core/Config.js';
import { Utils } from '../utils/Utils.js';
import { MathUtils } from '../utils/Math.js';

export class Cell {
    constructor(x, y, mass = 20, options = {}) {
        // Position and physics
        this.x = x;
        this.y = y;
        this.mass = mass;
        this.radius = Math.sqrt(mass / Math.PI);
        this.velocity = { x: 0, y: 0 };
        
        // Visual properties
        this.color = options.color || this.generateColor();
        this.borderColor = options.borderColor || this.generateBorderColor();
        this.opacity = options.opacity || 1.0;
        
        // Identity and state
        this.id = Utils.generateId();
        this.isActive = true;
        this.canRecombine = false;
        this.type = options.type || 'cell';
        
        // Timing
        this.createdAt = Date.now();
        this.lastUpdate = Date.now();
        
        // Relationships
        this.parentId = options.parentId || null;
        this.playerId = options.playerId || null;
        
        // Effects and modifiers
        this.effects = new Map();
        this.modifiers = {
            speed: 1.0,
            size: 1.0,
            mass: 1.0
        };
        
        // Visual effects
        this.glowIntensity = 0;
        this.pulsePhase = Math.random() * Math.PI * 2;
        
        // Collision properties
        this.collisionLayer = options.collisionLayer || 'default';
        this.canCollide = options.canCollide !== false;
        
        // Initialize position history for smooth interpolation
        this.positionHistory = [
            { x: this.x, y: this.y, timestamp: Date.now() }
        ];
    }

    /**
     * Update cell state
     * @param {number} deltaTime - Time since last update in milliseconds
     */
    update(deltaTime) {
        if (!this.isActive) return;
        
        this.lastUpdate = Date.now();
        
        // Update effects
        this.updateEffects(deltaTime);
        
        // Update visual effects
        this.updateVisualEffects(deltaTime);
        
        // Update position history
        this.updatePositionHistory();
        
        // Update pulse animation
        this.pulsePhase += deltaTime * 0.002;
        if (this.pulsePhase > Math.PI * 2) {
            this.pulsePhase -= Math.PI * 2;
        }
    }

    /**
     * Update active effects
     * @param {number} deltaTime - Time delta
     */
    updateEffects(deltaTime) {
        const currentTime = Date.now();
        
        for (const [effectName, effect] of this.effects) {
            if (currentTime >= effect.endTime) {
                this.removeEffect(effectName);
            } else {
                // Update effect intensity based on remaining time
                const remainingTime = effect.endTime - currentTime;
                const totalDuration = effect.endTime - effect.startTime;
                effect.intensity = remainingTime / totalDuration;
            }
        }
    }

    /**
     * Update visual effects
     * @param {number} deltaTime - Time delta
     */
    updateVisualEffects(deltaTime) {
        // Update glow intensity
        if (this.glowIntensity > 0) {
            this.glowIntensity -= deltaTime * 0.001;
            if (this.glowIntensity < 0) this.glowIntensity = 0;
        }
    }

    /**
     * Update position history for interpolation
     */
    updatePositionHistory() {
        const now = Date.now();
        
        // Add current position
        this.positionHistory.push({
            x: this.x,
            y: this.y,
            timestamp: now
        });
        
        // Keep only recent history (last 100ms)
        this.positionHistory = this.positionHistory.filter(
            pos => now - pos.timestamp < 100
        );
    }

    /**
     * Get interpolated position for smooth rendering
     * @param {number} renderTime - Time for interpolation
     * @returns {Object} Interpolated position
     */
    getInterpolatedPosition(renderTime) {
        if (this.positionHistory.length < 2) {
            return { x: this.x, y: this.y };
        }
        
        // Find the two positions to interpolate between
        let beforePos = this.positionHistory[0];
        let afterPos = this.positionHistory[this.positionHistory.length - 1];
        
        for (let i = 0; i < this.positionHistory.length - 1; i++) {
            if (this.positionHistory[i].timestamp <= renderTime && 
                this.positionHistory[i + 1].timestamp >= renderTime) {
                beforePos = this.positionHistory[i];
                afterPos = this.positionHistory[i + 1];
                break;
            }
        }
        
        // Calculate interpolation factor
        const timeDiff = afterPos.timestamp - beforePos.timestamp;
        if (timeDiff === 0) {
            return { x: afterPos.x, y: afterPos.y };
        }
        
        const factor = (renderTime - beforePos.timestamp) / timeDiff;
        
        return {
            x: MathUtils.lerp(beforePos.x, afterPos.x, factor),
            y: MathUtils.lerp(beforePos.y, afterPos.y, factor)
        };
    }

    /**
     * Check if this cell can absorb another cell
     * @param {Cell} otherCell - Target cell
     * @returns {boolean} Can absorb
     */
    canAbsorb(otherCell) {
        if (!this.isActive || !otherCell.isActive) return false;
        if (this.id === otherCell.id) return false;
        
        // Check mass requirement
        const massThreshold = CONFIG.PHYSICS.ABSORPTION_THRESHOLD;
        const effectiveMass = this.getEffectiveMass();
        const otherEffectiveMass = otherCell.getEffectiveMass();
        
        return effectiveMass > otherEffectiveMass * massThreshold;
    }

    /**
     * Absorb another cell
     * @param {Cell} otherCell - Cell to absorb
     * @returns {boolean} Absorption successful
     */
    absorb(otherCell) {
        if (!this.canAbsorb(otherCell)) return false;
        
        // Calculate absorbed mass
        const absorbedMass = otherCell.getEffectiveMass();
        
        // Add mass
        this.addMass(absorbedMass);
        
        // Add visual effect
        this.addGlow(0.5);
        
        // Trigger absorption effect
        this.triggerAbsorptionEffect(otherCell);
        
        // Deactivate absorbed cell
        otherCell.isActive = false;
        
        return true;
    }

    /**
     * Add mass to this cell
     * @param {number} mass - Mass to add
     */
    addMass(mass) {
        this.mass += mass;
        this.updateRadius();
        
        // Check for mass overflow
        if (this.mass > CONFIG.PHYSICS.MAX_CELL_MASS) {
            this.handleMassOverflow();
        }
    }

    /**
     * Remove mass from this cell
     * @param {number} mass - Mass to remove
     */
    removeMass(mass) {
        this.mass = Math.max(CONFIG.PHYSICS.MIN_CELL_MASS, this.mass - mass);
        this.updateRadius();
    }

    /**
     * Get effective mass including modifiers
     * @returns {number} Effective mass
     */
    getEffectiveMass() {
        return this.mass * this.modifiers.mass;
    }

    /**
     * Get effective radius including modifiers
     * @returns {number} Effective radius
     */
    getEffectiveRadius() {
        return this.radius * this.modifiers.size;
    }

    /**
     * Update radius based on current mass
     */
    updateRadius() {
        this.radius = Math.sqrt(this.mass / Math.PI);
    }

    /**
     * Handle mass overflow (auto-split)
     */
    handleMassOverflow() {
        // This will be handled by the physics engine
        // For now, just cap the mass
        this.mass = CONFIG.PHYSICS.MAX_CELL_MASS;
        this.updateRadius();
    }

    /**
     * Generate random color for the cell
     * @returns {string} CSS color string
     */
generateColor() {
    const colors = CONFIG.CELL_COLORS;
    return colors[Math.floor(Math.random() * colors.length)];
}

    /**
     * Generate border color based on main color
     * @returns {string} CSS color string
     */
    generateBorderColor() {
        // Create a darker version of the main color
        return this.darkenColor(this.color, 0.3);
    }

    /**
     * Darken a color by a factor
     * @param {string} color - Original color
     * @param {number} factor - Darkening factor (0-1)
     * @returns {string} Darkened color
     */
    darkenColor(color, factor) {
        // Simple darkening - in a real implementation, you'd parse the color properly
        if (color.startsWith('#')) {
            const r = parseInt(color.substr(1, 2), 16);
            const g = parseInt(color.substr(3, 2), 16);
            const b = parseInt(color.substr(5, 2), 16);
            
            const darkR = Math.floor(r * (1 - factor));
            const darkG = Math.floor(g * (1 - factor));
            const darkB = Math.floor(b * (1 - factor));
            
            return `rgb(${darkR}, ${darkG}, ${darkB})`;
        }
        
        return color; // Fallback
    }

    /**
     * Add effect to this cell
     * @param {string} name - Effect name
     * @param {number} duration - Duration in milliseconds
     * @param {Object} properties - Effect properties
     */
    addEffect(name, duration, properties = {}) {
        const effect = {
            name,
            startTime: Date.now(),
            endTime: Date.now() + duration,
            intensity: 1.0,
            properties
        };
        
        this.effects.set(name, effect);
        this.applyEffectModifiers(effect);
    }

    /**
     * Remove effect from this cell
     * @param {string} name - Effect name
     */
    removeEffect(name) {
        const effect = this.effects.get(name);
        if (effect) {
            this.removeEffectModifiers(effect);
            this.effects.delete(name);
        }
    }

    /**
     * Apply modifiers from an effect
     * @param {Object} effect - Effect object
     */
    applyEffectModifiers(effect) {
        const props = effect.properties;
        
        if (props.speedMultiplier) {
            this.modifiers.speed *= props.speedMultiplier;
        }
        
        if (props.sizeMultiplier) {
            this.modifiers.size *= props.sizeMultiplier;
        }
        
        if (props.massMultiplier) {
            this.modifiers.mass *= props.massMultiplier;
        }
    }

    /**
     * Remove modifiers from an effect
     * @param {Object} effect - Effect object
     */
    removeEffectModifiers(effect) {
        const props = effect.properties;
        
        if (props.speedMultiplier) {
            this.modifiers.speed /= props.speedMultiplier;
        }
        
        if (props.sizeMultiplier) {
            this.modifiers.size /= props.sizeMultiplier;
        }
        
        if (props.massMultiplier) {
            this.modifiers.mass /= props.massMultiplier;
        }
    }

    /**
     * Add glow effect
     * @param {number} intensity - Glow intensity
     */
    addGlow(intensity) {
        this.glowIntensity = Math.max(this.glowIntensity, intensity);
    }

    /**
     * Trigger absorption effect
     * @param {Cell} absorbedCell - The cell that was absorbed
     */
    triggerAbsorptionEffect(absorbedCell) {
        // This will be implemented when we have the particle system
        // For now, just add a glow effect
        this.addGlow(0.8);
    }

    /**
     * Check if cell is within bounds
     * @param {number} minX - Minimum X coordinate
     * @param {number} maxX - Maximum X coordinate
     * @param {number} minY - Minimum Y coordinate
     * @param {number} maxY - Maximum Y coordinate
     * @returns {boolean} Within bounds
     */
    isWithinBounds(minX, maxX, minY, maxY) {
        return this.x >= minX && this.x <= maxX && 
               this.y >= minY && this.y <= maxY;
    }

    /**
     * Get distance to another cell
     * @param {Cell} otherCell - Other cell
     * @returns {number} Distance
     */
    getDistanceTo(otherCell) {
        const dx = this.x - otherCell.x;
        const dy = this.y - otherCell.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Get squared distance to another cell (faster for comparisons)
     * @param {Cell} otherCell - Other cell
     * @returns {number} Squared distance
     */
    getSquaredDistanceTo(otherCell) {
        const dx = this.x - otherCell.x;
        const dy = this.y - otherCell.y;
        return dx * dx + dy * dy;
    }

    /**
     * Check if this cell is touching another cell
     * @param {Cell} otherCell - Other cell
     * @returns {boolean} Is touching
     */
    isTouching(otherCell) {
        const distance = this.getDistanceTo(otherCell);
        return distance <= (this.getEffectiveRadius() + otherCell.getEffectiveRadius());
    }

    /**
     * Get direction vector to another cell
     * @param {Cell} otherCell - Target cell
     * @returns {Object} Normalized direction vector
     */
    getDirectionTo(otherCell) {
        const dx = otherCell.x - this.x;
        const dy = otherCell.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) {
            return { x: 0, y: 0 };
        }
        
        return {
            x: dx / distance,
            y: dy / distance
        };
    }

    /**
     * Apply force towards a target
     * @param {number} targetX - Target X coordinate
     * @param {number} targetY - Target Y coordinate
     * @param {number} force - Force magnitude
     */
    applyForceTowards(targetX, targetY, force) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return;
        
        const normalizedX = dx / distance;
        const normalizedY = dy / distance;
        
        // Apply mass resistance
        const effectiveForce = force / (1 + this.mass * CONFIG.PHYSICS.MASS_SPEED_FACTOR);
        
        this.velocity.x += normalizedX * effectiveForce * this.modifiers.speed;
        this.velocity.y += normalizedY * effectiveForce * this.modifiers.speed;
    }

    /**
     * Set velocity directly
     * @param {number} vx - X velocity
     * @param {number} vy - Y velocity
     */
    setVelocity(vx, vy) {
        this.velocity.x = vx;
        this.velocity.y = vy;
    }

    /**
     * Add velocity to current velocity
     * @param {number} vx - X velocity to add
     * @param {number} vy - Y velocity to add
     */
    addVelocity(vx, vy) {
        this.velocity.x += vx;
        this.velocity.y += vy;
    }

    /**
     * Get current speed
     * @returns {number} Current speed
     */
    getSpeed() {
        return Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
    }

    /**
     * Set position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Move to a specific position
     * @param {number} x - Target X coordinate
     * @param {number} y - Target Y coordinate
     */
    moveTo(x, y) {
        this.x = x;
        this.y = y;
    }

    /**
     * Check if cell has a specific effect
     * @param {string} effectName - Effect name
     * @returns {boolean} Has effect
     */
    hasEffect(effectName) {
        return this.effects.has(effectName);
    }

    /**
     * Get effect by name
     * @param {string} effectName - Effect name
     * @returns {Object|null} Effect object or null
     */
    getEffect(effectName) {
        return this.effects.get(effectName) || null;
    }

    /**
     * Get age of cell in milliseconds
     * @returns {number} Age in milliseconds
     */
    getAge() {
        return Date.now() - this.createdAt;
    }

    /**
     * Check if cell is young (recently created)
     * @param {number} threshold - Age threshold in milliseconds
     * @returns {boolean} Is young
     */
    isYoung(threshold = 1000) {
        return this.getAge() < threshold;
    }

    /**
     * Get cell info for debugging
     * @returns {Object} Cell information
     */
    getInfo() {
        return {
            id: this.id,
            position: { x: this.x, y: this.y },
            mass: this.mass,
            radius: this.radius,
            velocity: { ...this.velocity },
            isActive: this.isActive,
            effects: Array.from(this.effects.keys()),
            age: this.getAge()
        };
    }

    /**
     * Serialize cell data for saving
     * @returns {Object} Serialized data
     */
    serialize() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            mass: this.mass,
            color: this.color,
            borderColor: this.borderColor,
            type: this.type,
            parentId: this.parentId,
            playerId: this.playerId,
            createdAt: this.createdAt,
            canRecombine: this.canRecombine
        };
    }

    /**
     * Deserialize cell data
     * @param {Object} data - Serialized data
     */
    deserialize(data) {
        this.id = data.id;
        this.x = data.x;
        this.y = data.y;
        this.mass = data.mass;
        this.color = data.color;
        this.borderColor = data.borderColor;
        this.type = data.type;
        this.parentId = data.parentId;
        this.playerId = data.playerId;
        this.createdAt = data.createdAt;
        this.canRecombine = data.canRecombine;
        
        this.updateRadius();
    }

    /**
     * Clone this cell
     * @param {Object} overrides - Properties to override
     * @returns {Cell} Cloned cell
     */
    clone(overrides = {}) {
        const clonedCell = new Cell(this.x, this.y, this.mass, {
            color: this.color,
            borderColor: this.borderColor,
            type: this.type,
            parentId: this.parentId,
            playerId: this.playerId,
            ...overrides
        });
        
        clonedCell.velocity = { ...this.velocity };
        clonedCell.modifiers = { ...this.modifiers };
        
        return clonedCell;
    }

    /**
     * Destroy this cell
     */
    destroy() {
        this.isActive = false;
        this.effects.clear();
        this.positionHistory = [];
    }

    /**
     * Reset cell to initial state
     */
    reset() {
        this.velocity = { x: 0, y: 0 };
        this.effects.clear();
        this.modifiers = {
            speed: 1.0,
            size: 1.0,
            mass: 1.0
        };
        this.glowIntensity = 0;
        this.isActive = true;
        this.canRecombine = false;
    }
}
