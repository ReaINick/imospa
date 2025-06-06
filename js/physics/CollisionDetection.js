// physics/CollisionDetection.js
import { MathUtils } from '../utils/Math.js';

export class CollisionDetection {
    constructor() {
        this.absorptionThreshold = 1.1; // 110% mass needed to absorb
        this.collisionPairs = [];
        this.spatialGrid = new Map();
        this.gridSize = 100;
    }

    // Main collision detection loop
    detectCollisions(entities) {
        this.collisionPairs = [];
        this.updateSpatialGrid(entities);
        
        for (let entity of entities) {
            const nearbyEntities = this.getNearbyEntities(entity);
            for (let other of nearbyEntities) {
                if (entity.id !== other.id && this.checkCircleCollision(entity, other)) {
                    this.collisionPairs.push({ a: entity, b: other });
                }
            }
        }
        
        return this.collisionPairs;
    }

    // Spatial grid optimization for large numbers of entities
    updateSpatialGrid(entities) {
        this.spatialGrid.clear();
        
        for (let entity of entities) {
            const gridX = Math.floor(entity.x / this.gridSize);
            const gridY = Math.floor(entity.y / this.gridSize);
            const key = `${gridX},${gridY}`;
            
            if (!this.spatialGrid.has(key)) {
                this.spatialGrid.set(key, []);
            }
            this.spatialGrid.get(key).push(entity);
        }
    }

    // Get entities in nearby grid cells
    getNearbyEntities(entity) {
        const nearbyEntities = [];
        const gridX = Math.floor(entity.x / this.gridSize);
        const gridY = Math.floor(entity.y / this.gridSize);
        
        // Check 3x3 grid around entity
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const key = `${gridX + dx},${gridY + dy}`;
                if (this.spatialGrid.has(key)) {
                    nearbyEntities.push(...this.spatialGrid.get(key));
                }
            }
        }
        
        return nearbyEntities;
    }

    // Circle-circle collision detection
    checkCircleCollision(entityA, entityB) {
        const dx = entityA.x - entityB.x;
        const dy = entityA.y - entityB.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const combinedRadius = entityA.radius + entityB.radius;
        
        return distance < combinedRadius;
    }

    // Check if one entity can absorb another
    canAbsorb(absorber, target) {
        return absorber.mass > target.mass * this.absorptionThreshold;
    }

    // Process absorption between two entities
    processAbsorption(absorber, target) {
        if (!this.canAbsorb(absorber, target)) {
            return false;
        }

        // Calculate mass transfer
        const massGained = target.mass;
        absorber.mass += massGained;
        absorber.updateRadius();

        // If absorber is a player, update experience and stats
        if (absorber.isPlayer) {
            absorber.gainExperience(massGained);
            
            // Award coins based on what was absorbed
            if (target.isPlayer) {
                absorber.coins += Math.floor(massGained / 10);
            } else if (target.isFood) {
                absorber.coins += Math.floor(massGained / 20);
            }
        }

        return true;
    }

    // Handle collision between player cells (for splitting/merging)
    handlePlayerCellCollision(cellA, cellB) {
        // Check if cells belong to same player
        if (cellA.playerId === cellB.playerId) {
            // Check if cells can recombine
            if (cellA.canRecombine && cellB.canRecombine) {
                return this.mergeCells(cellA, cellB);
            }
            return false;
        }

        // Different players - check for absorption
        if (this.canAbsorb(cellA, cellB)) {
            return this.processAbsorption(cellA, cellB);
        } else if (this.canAbsorb(cellB, cellA)) {
            return this.processAbsorption(cellB, cellA);
        }

        return false;
    }

    // Merge two cells belonging to same player
    mergeCells(cellA, cellB) {
        // Combine masses
        const totalMass = cellA.mass + cellB.mass;
        
        // Calculate new position (weighted average)
        const newX = (cellA.x * cellA.mass + cellB.x * cellB.mass) / totalMass;
        const newY = (cellA.y * cellA.mass + cellB.y * cellB.mass) / totalMass;
        
        // Update larger cell
        const largerCell = cellA.mass >= cellB.mass ? cellA : cellB;
        const smallerCell = cellA.mass < cellB.mass ? cellA : cellB;
        
        largerCell.x = newX;
        largerCell.y = newY;
        largerCell.mass = totalMass;
        largerCell.updateRadius();
        
        // Combine velocities
        largerCell.velocity.x = (largerCell.velocity.x + smallerCell.velocity.x) * 0.5;
        largerCell.velocity.y = (largerCell.velocity.y + smallerCell.velocity.y) * 0.5;
        
        return {
            merged: largerCell,
            removed: smallerCell
        };
    }

    // Check collision with game boundaries
    checkBoundaryCollision(entity, worldBounds) {
        const collisions = {
            left: entity.x - entity.radius < worldBounds.left,
            right: entity.x + entity.radius > worldBounds.right,
            top: entity.y - entity.radius < worldBounds.top,
            bottom: entity.y + entity.radius > worldBounds.bottom
        };

        return collisions;
    }

    // Resolve boundary collision
    resolveBoundaryCollision(entity, worldBounds, bounceVelocity = 0.8) {
        const collisions = this.checkBoundaryCollision(entity, worldBounds);
        
        if (collisions.left) {
            entity.x = worldBounds.left + entity.radius;
            entity.velocity.x = Math.abs(entity.velocity.x) * bounceVelocity;
        }
        if (collisions.right) {
            entity.x = worldBounds.right - entity.radius;
            entity.velocity.x = -Math.abs(entity.velocity.x) * bounceVelocity;
        }
        if (collisions.top) {
            entity.y = worldBounds.top + entity.radius;
            entity.velocity.y = Math.abs(entity.velocity.y) * bounceVelocity;
        }
        if (collisions.bottom) {
            entity.y = worldBounds.bottom - entity.radius;
            entity.velocity.y = -Math.abs(entity.velocity.y) * bounceVelocity;
        }
    }

    // Get distance between two entities
    getDistance(entityA, entityB) {
        const dx = entityA.x - entityB.x;
        const dy = entityA.y - entityB.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Check if entity is within range of another
    isWithinRange(entityA, entityB, range) {
        return this.getDistance(entityA, entityB) <= range;
    }

    // Find all entities within range of a point
    findEntitiesInRange(x, y, range, entities) {
        const entitiesInRange = [];
        
        for (let entity of entities) {
            const distance = MathUtils.distance(x, y, entity.x, entity.y);
            if (distance <= range) {
                entitiesInRange.push({
                    entity: entity,
                    distance: distance
                });
            }
        }
        
        // Sort by distance
        entitiesInRange.sort((a, b) => a.distance - b.distance);
        return entitiesInRange;
    }

    // Advanced collision detection for splitting cells
    checkSplitCellCollision(originalCell, splitDirection, splitDistance) {
        // Calculate where the split cell would be positioned
        const splitX = originalCell.x + Math.cos(splitDirection) * splitDistance;
        const splitY = originalCell.y + Math.sin(splitDirection) * splitDistance;
        const splitRadius = originalCell.radius * 0.7; // Split cells are smaller
        
        return {
            x: splitX,
            y: splitY,
            radius: splitRadius,
            wouldCollide: false // Will be updated by collision system
        };
    }
}
