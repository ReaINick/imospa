// Advanced math utilities for game physics and calculations
export class MathUtils {
    // Vector operations for physics calculations
    static createVector(x = 0, y = 0) {
        return { x, y };
    }
    
    static addVectors(v1, v2) {
        return { x: v1.x + v2.x, y: v1.y + v2.y };
    }
    
    static subtractVectors(v1, v2) {
        return { x: v1.x - v2.x, y: v1.y - v2.y };
    }
    
    static multiplyVector(vector, scalar) {
        return { x: vector.x * scalar, y: vector.y * scalar };
    }
    
    static divideVector(vector, scalar) {
        if (scalar === 0) return { x: 0, y: 0 };
        return { x: vector.x / scalar, y: vector.y / scalar };
    }
    
    static vectorMagnitude(vector) {
        return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
    }
    
    static normalizeVector(vector) {
        const magnitude = this.vectorMagnitude(vector);
        if (magnitude === 0) return { x: 0, y: 0 };
        return this.divideVector(vector, magnitude);
    }
    
    static vectorToMouse(fromX, fromY, mouseX, mouseY) {
        return this.normalizeVector({
            x: mouseX - fromX,
            y: mouseY - fromY
        });
    }
    
    // Physics calculations
    static calculateMassBasedSpeed(mass, baseFactor = 0.02) {
        return Math.max(2, 10 - Math.log(mass) * baseFactor);
    }
    
    static applyFriction(velocity, frictionCoeff = 0.98) {
        return {
            x: velocity.x * frictionCoeff,
            y: velocity.y * frictionCoeff
        };
    }
    
    static calculateAcceleration(currentVel, targetVel, mass) {
        const force = this.subtractVectors(targetVel, currentVel);
        const massResistance = 1 / (1 + mass * 0.01);
        return this.multiplyVector(force, massResistance);
    }
    
    // Collision and absorption calculations
    static canAbsorb(absorberMass, targetMass, threshold = 1.1) {
        return absorberMass > targetMass * threshold;
    }
    
    static calculateAbsorptionMass(absorberMass, targetMass) {
        // Slightly less than full mass transfer for balance
        return absorberMass + (targetMass * 0.95);
    }
    
    static calculateSplitMass(originalMass) {
        // Each split cell gets slightly less than half
        return originalMass * 0.45;
    }
    
    // Powerup calculations - Recombine specific
    static calculateRecombineDirection(player, mouseX, mouseY) {
        if (!player.cells || player.cells.length === 0) {
            return { x: 1, y: 0 }; // Default direction
        }
        
        // Get center of mass of all player cells
        const centerMass = this.getPlayerCenterMass(player);
        
        // Calculate direction from center of mass to mouse
        const direction = this.vectorToMouse(centerMass.x, centerMass.y, mouseX, mouseY);
        
        // If mouse direction is invalid, use last known direction or default
        if (this.vectorMagnitude(direction) < 0.1) {
            return player.lastDirection || { x: 1, y: 0 };
        }
        
        return direction;
    }
    
    static getPlayerCenterMass(player) {
        if (!player.cells || player.cells.length === 0) {
            return { x: player.x || 0, y: player.y || 0 };
        }
        
        let totalMass = 0;
        let weightedX = 0;
        let weightedY = 0;
        
        player.cells.forEach(cell => {
            totalMass += cell.mass;
            weightedX += cell.x * cell.mass;
            weightedY += cell.y * cell.mass;
        });
        
        return {
            x: weightedX / totalMass,
            y: weightedY / totalMass
        };
    }
    
    static calculateMergeTrajectories(cells, targetDirection, mergeSpeed = 8.0) {
        const centerMass = this.calculateCellGroupCenter(cells);
        const trajectories = [];
        
        cells.forEach(cell => {
            // Calculate path from cell to center, influenced by target direction
            const toCenter = this.normalizeVector({
                x: centerMass.x - cell.x,
                y: centerMass.y - cell.y
            });
            
            // Blend center direction with target direction
            const blendedDirection = this.normalizeVector({
                x: toCenter.x * 0.7 + targetDirection.x * 0.3,
                y: toCenter.y * 0.7 + targetDirection.y * 0.3
            });
            
            trajectories.push({
                cellId: cell.id,
                direction: blendedDirection,
                speed: mergeSpeed,
                startPos: { x: cell.x, y: cell.y }
            });
        });
        
        return trajectories;
    }
    
    static calculateCellGroupCenter(cells) {
        if (cells.length === 0) return { x: 0, y: 0 };
        
        let totalX = 0;
        let totalY = 0;
        
        cells.forEach(cell => {
            totalX += cell.x;
            totalY += cell.y;
        });
        
        return {
            x: totalX / cells.length,
            y: totalY / cells.length
        };
    }
    
    // Splitting calculations
    static calculateSplitDirection(fromX, fromY, mouseX, mouseY) {
        const direction = this.vectorToMouse(fromX, fromY, mouseX, mouseY);
        return this.multiplyVector(direction, 15); // Split momentum
    }
    
    static applySplitMomentum(cell, direction, momentum = 15) {
        const splitVelocity = this.multiplyVector(direction, momentum);
        return {
            x: cell.x + direction.x * 20, // Offset position
            y: cell.y + direction.y * 20,
            velocity: splitVelocity
        };
    }
    
    // Camera and viewport calculations
    static calculateCameraPosition(player, currentCamera, smoothing = 0.1) {
        const targetX = player.x;
        const targetY = player.y;
        
        return {
            x: this.lerp(currentCamera.x, targetX, smoothing),
            y: this.lerp(currentCamera.y, targetY, smoothing)
        };
    }
    
    static calculateZoomLevel(playerMass, minZoom = 0.5, maxZoom = 1.0) {
        // Zoom out as player gets bigger
        const zoomFactor = Math.max(0.3, 1 - Math.log(playerMass / 20) * 0.1);
        return Math.max(minZoom, Math.min(maxZoom, zoomFactor));
    }
    
    // Movement interpolation for smooth gameplay  
    static interpolateMovement(current, target, deltaTime, speed) {
        const distance = this.vectorMagnitude(this.subtractVectors(target, current));
        if (distance < 0.1) return target;
        
        const direction = this.normalizeVector(this.subtractVectors(target, current));
        const moveAmount = Math.min(distance, speed * deltaTime);
        
        return this.addVectors(current, this.multiplyVector(direction, moveAmount));
    }
    
    // Utility math functions
    static lerp(start, end, factor) {
        return start + (end - start) * factor;
    }
    
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
    
    static map(value, inMin, inMax, outMin, outMax) {
        return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    }
    
    static distanceToLineSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
        
        const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (length * length)));
        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        
        return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
    }
    
    // Angle utilities
    static angleBetweenPoints(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    }
    
    static angleFromVector(vector) {
        return Math.atan2(vector.y, vector.x);
    }
    
    static vectorFromAngle(angle, magnitude = 1) {
        return {
            x: Math.cos(angle) * magnitude,
            y: Math.sin(angle) * magnitude
        };
    }
    
    // MISSING METHOD - Add this to fix PhysicsEngine
    static randomAngle() {
        return Math.random() * Math.PI * 2;
    }
    
    // Additional utility methods for compatibility
    static distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    static random(min, max) {
        return Math.random() * (max - min) + min;
    }
    
    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    static degrees(radians) {
        return radians * (180 / Math.PI);
    }
    
    static radians(degrees) {
        return degrees * (Math.PI / 180);
    }
}
