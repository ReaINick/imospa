// js/physics/PhysicsEngine.js
import { CONFIG } from '../core/Config.js';
import { MathUtils } from '../utils/Math.js';

export class PhysicsEngine {
    constructor() {
        this.config = {
            friction: CONFIG.PHYSICS.FRICTION,
            massSpeedFactor: CONFIG.PHYSICS.MASS_SPEED_FACTOR,
            absorptionThreshold: CONFIG.PHYSICS.ABSORPTION_THRESHOLD,
            splitMomentum: CONFIG.PHYSICS.SPLIT_MOMENTUM,
            boundaryBounce: CONFIG.PHYSICS.BOUNDARY_BOUNCE,
            minSplitMass: CONFIG.PHYSICS.MIN_SPLIT_MASS,
            maxVelocity: CONFIG.PHYSICS.MAX_VELOCITY
        };
        
        this.worldBounds = {
            minX: -CONFIG.WORLD.WIDTH / 2,
            maxX: CONFIG.WORLD.WIDTH / 2,
            minY: -CONFIG.WORLD.HEIGHT / 2,
            maxY: CONFIG.WORLD.HEIGHT / 2
        };
    }

    /**
     * Update physics for all entities
     * @param {Array} entities - Array of entities to update
     * @param {number} deltaTime - Time since last update in milliseconds
     */
    updateEntities(entities, deltaTime) {
        const dt = deltaTime / 1000; // Convert to seconds
        
        entities.forEach(entity => {
            if (entity.isActive) {
                this.updateEntityPhysics(entity, dt);
            }
        });
    }

    /**
     * Update physics for a single entity
     * @param {Object} entity - Entity to update
     * @param {number} deltaTime - Time delta in seconds
     */
    updateEntityPhysics(entity, deltaTime) {
        // Apply friction
        this.applyFriction(entity);
        
        // Calculate mass-based speed limitation
        const maxSpeed = this.calculateMassBasedSpeed(entity.mass);
        this.limitMaxVelocity(entity, maxSpeed);
        
        // Update position based on velocity
        this.updatePosition(entity, deltaTime);
        
        // Handle world boundary collisions
        this.handleBoundaryCollision(entity);
        
        // Update radius based on mass
        this.updateRadius(entity);
    }

    /**
     * Apply friction to entity velocity
     * @param {Object} entity - Entity to apply friction to
     */
    applyFriction(entity) {
        entity.velocity.x *= this.config.friction;
        entity.velocity.y *= this.config.friction;
        
        // Stop very small velocities to prevent floating point drift
        if (Math.abs(entity.velocity.x) < 0.01) entity.velocity.x = 0;
        if (Math.abs(entity.velocity.y) < 0.01) entity.velocity.y = 0;
    }

    /**
     * Calculate maximum speed based on mass
     * @param {number} mass - Entity mass
     * @returns {number} Maximum speed
     */
    calculateMassBasedSpeed(mass) {
        return Math.max(
            CONFIG.PHYSICS.MIN_SPEED,
            CONFIG.PHYSICS.BASE_SPEED - (mass * this.config.massSpeedFactor)
        );
    }

    /**
     * Limit entity velocity to maximum speed
     * @param {Object} entity - Entity to limit
     * @param {number} maxSpeed - Maximum allowed speed
     */
    limitMaxVelocity(entity, maxSpeed) {
        const currentSpeed = Math.sqrt(
            entity.velocity.x * entity.velocity.x + 
            entity.velocity.y * entity.velocity.y
        );
        
        if (currentSpeed > maxSpeed) {
            const ratio = maxSpeed / currentSpeed;
            entity.velocity.x *= ratio;
            entity.velocity.y *= ratio;
        }
    }

    /**
     * Update entity position based on velocity
     * @param {Object} entity - Entity to update
     * @param {number} deltaTime - Time delta in seconds
     */
    updatePosition(entity, deltaTime) {
        entity.x += entity.velocity.x * deltaTime;
        entity.y += entity.velocity.y * deltaTime;
    }

    /**
     * Handle collision with world boundaries
     * @param {Object} entity - Entity to check
     */
    handleBoundaryCollision(entity) {
        const bounce = this.config.boundaryBounce;
        
        // Left boundary
        if (entity.x - entity.radius < this.worldBounds.minX) {
            entity.x = this.worldBounds.minX + entity.radius;
            entity.velocity.x = Math.abs(entity.velocity.x) * bounce;
        }
        
        // Right boundary
        if (entity.x + entity.radius > this.worldBounds.maxX) {
            entity.x = this.worldBounds.maxX - entity.radius;
            entity.velocity.x = -Math.abs(entity.velocity.x) * bounce;
        }
        
        // Top boundary
        if (entity.y - entity.radius < this.worldBounds.minY) {
            entity.y = this.worldBounds.minY + entity.radius;
            entity.velocity.y = Math.abs(entity.velocity.y) * bounce;
        }
        
        // Bottom boundary
        if (entity.y + entity.radius > this.worldBounds.maxY) {
            entity.y = this.worldBounds.maxY - entity.radius;
            entity.velocity.y = -Math.abs(entity.velocity.y) * bounce;
        }
    }

    /**
     * Update entity radius based on mass
     * @param {Object} entity - Entity to update
     */
    updateRadius(entity) {
        entity.radius = Math.sqrt(entity.mass / Math.PI);
    }

    /**
     * Calculate movement force towards target
     * @param {Object} entity - Entity to move
     * @param {number} targetX - Target X coordinate
     * @param {number} targetY - Target Y coordinate
     * @param {number} force - Force magnitude
     */
    calculateMovementForce(entity, targetX, targetY, force = 1) {
        const direction = this.getDirectionVector(entity, targetX, targetY);
        const massResistance = this.applyMassResistance(entity.mass, force);
        
        entity.velocity.x += direction.x * massResistance;
        entity.velocity.y += direction.y * massResistance;
    }

    /**
     * Get normalized direction vector to target
     * @param {Object} entity - Source entity
     * @param {number} targetX - Target X coordinate
     * @param {number} targetY - Target Y coordinate
     * @returns {Object} Normalized direction vector
     */
    getDirectionVector(entity, targetX, targetY) {
        const dx = targetX - entity.x;
        const dy = targetY - entity.y;
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
     * Apply mass resistance to force
     * @param {number} mass - Entity mass
     * @param {number} force - Base force
     * @returns {number} Adjusted force
     */
    applyMassResistance(mass, force) {
        return force / (1 + mass * 0.001);
    }

    /**
     * Check if one cell can absorb another
     * @param {Object} absorber - Absorbing cell
     * @param {Object} target - Target cell
     * @returns {boolean} Can absorb
     */
    canAbsorb(absorber, target) {
        return absorber.mass > target.mass * this.config.absorptionThreshold;
    }

    /**
     * Handle cell absorption
     * @param {Object} absorber - Absorbing cell
     * @param {Object} target - Target cell
     * @returns {boolean} Absorption successful
     */
    handleCellAbsorption(absorber, target) {
        if (!this.canAbsorb(absorber, target)) {
            return false;
        }
        
        // Transfer mass
        this.transferMass(absorber, target);
        
        // Update radius
        this.updateRadius(absorber);
        
        // Trigger absorption effects
        this.triggerAbsorptionEffects(absorber, target);
        
        // Mark target as inactive
        target.isActive = false;
        
        return true;
    }

    /**
     * Transfer mass from target to absorber
     * @param {Object} absorber - Absorbing cell
     * @param {Object} target - Target cell
     */
    transferMass(absorber, target) {
        absorber.mass += target.mass;
        
        // Handle mass overflow for split cells
        if (absorber.mass > CONFIG.PHYSICS.MAX_CELL_MASS) {
            this.handleMassOverflow(absorber);
        }
    }

    /**
     * Handle mass overflow by auto-splitting
     * @param {Object} cell - Cell with overflow
     */
    handleMassOverflow(cell) {
        if (cell.cells && cell.cells.length < CONFIG.PHYSICS.MAX_CELLS) {
            // Auto-split if possible
            const splitDirection = MathUtils.randomAngle();
            this.processCellSplitting(cell, splitDirection, this.config.splitMomentum);
        }
    }

    /**
     * Trigger visual and audio effects for absorption
     * @param {Object} absorber - Absorbing cell
     * @param {Object} target - Absorbed cell
     */
    triggerAbsorptionEffects(absorber, target) {
        // This will be implemented when we create the particle system
        // For now, just placeholder
        console.log(`Cell absorbed! Mass: ${target.mass}`);
    }

    /**
     * Process cell splitting
     * @param {Object} cell - Cell to split
     * @param {number} direction - Direction angle in radians
     * @param {number} force - Split force
     * @returns {Object|null} New split cell or null if can't split
     */
    processCellSplitting(cell, direction, force) {
        if (!this.validateSplitConditions(cell)) {
            return null;
        }
        
        const splitMass = this.calculateSplitMass(cell);
        const newCell = this.createSplitCell(cell, splitMass);
        
        // Apply split velocity
        this.applySplitVelocity(cell, newCell, direction, force);
        
        // Update parent cell
        this.updateParentCell(cell, splitMass);
        
        // Start recombine timer
        this.startRecombineTimer(cell, newCell);
        
        return newCell;
    }

    /**
     * Validate if cell can split
     * @param {Object} cell - Cell to validate
     * @returns {boolean} Can split
     */
    validateSplitConditions(cell) {
        return cell.mass >= this.config.minSplitMass && 
               (!cell.cells || cell.cells.length < CONFIG.PHYSICS.MAX_CELLS);
    }

    /**
     * Calculate mass for split cell
     * @param {Object} cell - Parent cell
     * @returns {number} Split mass
     */
    calculateSplitMass(cell) {
        return Math.floor(cell.mass / 2);
    }

    /**
     * Create new split cell
     * @param {Object} parentCell - Parent cell
     * @param {number} mass - New cell mass
     * @returns {Object} New cell
     */
    createSplitCell(parentCell, mass) {
        // This will be implemented when we create the Cell class
        return {
            x: parentCell.x,
            y: parentCell.y,
            mass: mass,
            radius: Math.sqrt(mass / Math.PI),
            velocity: { x: 0, y: 0 },
            isActive: true,
            canRecombine: false,
            parentId: parentCell.id
        };
    }

    /**
     * Apply velocity to split cells
     * @param {Object} parentCell - Parent cell
     * @param {Object} newCell - New split cell
     * @param {number} direction - Split direction
     * @param {number} force - Split force
     */
    applySplitVelocity(parentCell, newCell, direction, force) {
        const splitVelocityX = Math.cos(direction) * force;
        const splitVelocityY = Math.sin(direction) * force;
        
        // New cell moves in split direction
        newCell.velocity.x = splitVelocityX;
        newCell.velocity.y = splitVelocityY;
        
        // Parent cell moves in opposite direction (conservation of momentum)
        const momentumRatio = newCell.mass / parentCell.mass;
        parentCell.velocity.x -= splitVelocityX * momentumRatio;
        parentCell.velocity.y -= splitVelocityY * momentumRatio;
    }

    /**
     * Update parent cell after split
     * @param {Object} cell - Parent cell
     * @param {number} splitMass - Mass that was split off
     */
    updateParentCell(cell, splitMass) {
        cell.mass -= splitMass;
        this.updateRadius(cell);
    }

    /**
     * Start recombine timer for split cells
     * @param {Object} parentCell - Parent cell
     * @param {Object} newCell - New split cell
     */
    startRecombineTimer(parentCell, newCell) {
        setTimeout(() => {
            if (parentCell.isActive) parentCell.canRecombine = true;
            if (newCell.isActive) newCell.canRecombine = true;
        }, CONFIG.PHYSICS.RECOMBINE_TIME);
    }

    /**
     * Check collision between two circular entities
     * @param {Object} entityA - First entity
     * @param {Object} entityB - Second entity
     * @returns {boolean} Collision detected
     */
    checkCircleCollision(entityA, entityB) {
        const dx = entityA.x - entityB.x;
        const dy = entityA.y - entityB.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < (entityA.radius + entityB.radius);
    }

    /**
     * Calculate collision response between two entities
     * @param {Object} entityA - First entity
     * @param {Object} entityB - Second entity
     */
    calculateCollisionResponse(entityA, entityB) {
        const dx = entityA.x - entityB.x;
        const dy = entityA.y - entityB.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return; // Prevent division by zero
        
        // Normalize collision vector
        const nx = dx / distance;
        const ny = dy / distance;
        
        // Calculate relative velocity
        const relativeVelocityX = entityA.velocity.x - entityB.velocity.x;
        const relativeVelocityY = entityA.velocity.y - entityB.velocity.y;
        
        // Calculate relative velocity along collision normal
        const speed = relativeVelocityX * nx + relativeVelocityY * ny;
        
        // Don't resolve if entities are separating
        if (speed > 0) return;
        
        // Calculate collision impulse
        const impulse = 2 * speed / (entityA.mass + entityB.mass);
        
        // Apply impulse to velocities
        entityA.velocity.x -= impulse * entityB.mass * nx;
        entityA.velocity.y -= impulse * entityB.mass * ny;
        entityB.velocity.x += impulse * entityA.mass * nx;
        entityB.velocity.y += impulse * entityA.mass * ny;
    }

    /**
     * Separate overlapping entities
     * @param {Object} entityA - First entity
     * @param {Object} entityB - Second entity
     */
    separateEntities(entityA, entityB) {
        const dx = entityA.x - entityB.x;
        const dy = entityA.y - entityB.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) {
            // Handle exact overlap
            entityA.x += Math.random() - 0.5;
            entityA.y += Math.random() - 0.5;
            return;
        }
        
        const overlap = (entityA.radius + entityB.radius) - distance;
        if (overlap > 0) {
            const separationX = (dx / distance) * overlap * 0.5;
            const separationY = (dy / distance) * overlap * 0.5;
            
            entityA.x += separationX;
            entityA.y += separationY;
            entityB.x -= separationX;
            entityB.y -= separationY;
        }
    }
}
