// physics/Movement.js
import { MathUtils } from '../utils/Math.js';

export class Movement {
    constructor(physicsEngine) {
        this.physics = physicsEngine;
        this.config = {
            maxSpeed: 10,
            acceleration: 0.5,
            friction: 0.98,
            massSpeedFactor: 0.02,
            smoothingFactor: 0.15,
            minSpeed: 0.1,
            mouseDeadZone: 5
        };
    }

    // Update entity movement based on target position
    updateMovement(entity, targetX, targetY, deltaTime) {
        if (!entity.canMove) return;

        // Calculate direction to target
        const direction = this.calculateDirection(entity, targetX, targetY);
        
        // Apply mass-based speed modification
        const maxSpeed = this.calculateMaxSpeed(entity.mass);
        
        // Update velocity based on direction and speed
        this.updateVelocity(entity, direction, maxSpeed, deltaTime);
        
        // Apply physics constraints
        this.applyPhysics(entity, deltaTime);
        
        // Update position
        this.updatePosition(entity, deltaTime);
    }

    // Calculate direction vector from entity to target
    calculateDirection(entity, targetX, targetY) {
        const dx = targetX - entity.x;
        const dy = targetY - entity.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Check if target is within dead zone
        if (distance < this.config.mouseDeadZone) {
            return { x: 0, y: 0, distance: 0 };
        }
        
        return {
            x: dx / distance,
            y: dy / distance,
            distance: distance
        };
    }

    // Calculate max speed based on entity mass
    calculateMaxSpeed(mass) {
        const baseSpeed = this.config.maxSpeed;
        const massReduction = Math.log(mass) * this.config.massSpeedFactor;
        return Math.max(this.config.minSpeed, baseSpeed - massReduction);
    }

    // Update entity velocity towards target
    updateVelocity(entity, direction, maxSpeed, deltaTime) {
        if (direction.distance === 0) {
            // No target, apply friction
            entity.velocity.x *= this.config.friction;
            entity.velocity.y *= this.config.friction;
            return;
        }

        // Calculate desired velocity
        const desiredVelocityX = direction.x * maxSpeed;
        const desiredVelocityY = direction.y * maxSpeed;
        
        // Smoothly interpolate towards desired velocity
        const acceleration = this.config.acceleration * deltaTime;
        
        entity.velocity.x = MathUtils.lerp(
            entity.velocity.x, 
            desiredVelocityX, 
            acceleration
        );
        entity.velocity.y = MathUtils.lerp(
            entity.velocity.y, 
            desiredVelocityY, 
            acceleration
        );
        
        // Limit velocity to max speed
        this.limitVelocity(entity, maxSpeed);
    }

    // Limit velocity to maximum speed
    limitVelocity(entity, maxSpeed) {
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

    // Apply physics effects like friction
    applyPhysics(entity, deltaTime) {
        // Apply friction
        entity.velocity.x *= this.config.friction;
        entity.velocity.y *= this.config.friction;
        
        // Stop very slow movement to prevent jitter
        if (Math.abs(entity.velocity.x) < 0.01) entity.velocity.x = 0;
        if (Math.abs(entity.velocity.y) < 0.01) entity.velocity.y = 0;
    }

    // Update entity position based on velocity
    updatePosition(entity, deltaTime) {
        entity.x += entity.velocity.x * deltaTime;
        entity.y += entity.velocity.y * deltaTime;
    }

    // Handle mouse-based movement for players
    handleMouseMovement(player, mouseX, mouseY, deltaTime) {
        // Convert screen coordinates to world coordinates if needed
        const worldMouseX = mouseX; // Assume already converted
        const worldMouseY = mouseY;
        
        // Update all player cells
        for (let cell of player.cells) {
            this.updateMovement(cell, worldMouseX, worldMouseY, deltaTime);
        }
    }

    // Handle keyboard-based movement (WASD)
    handleKeyboardMovement(entity, keys, deltaTime) {
        let moveX = 0;
        let moveY = 0;
        
        if (keys['w'] || keys['W']) moveY -= 1;
        if (keys['s'] || keys['S']) moveY += 1;
        if (keys['a'] || keys['A']) moveX -= 1;
        if (keys['d'] || keys['D']) moveX += 1;
        
        // Normalize diagonal movement
        if (moveX !== 0 && moveY !== 0) {
            const length = Math.sqrt(moveX * moveX + moveY * moveY);
            moveX /= length;
            moveY /= length;
        }
        
        // Calculate target position
        const maxSpeed = this.calculateMaxSpeed(entity.mass);
        const targetX = entity.x + moveX * maxSpeed * 10;
        const targetY = entity.y + moveY * maxSpeed * 10;
        
        this.updateMovement(entity, targetX, targetY, deltaTime);
    }

    // Apply movement momentum (for splitting, powerups, etc.)
    applyMomentum(entity, forceX, forceY, duration = 1000) {
        entity.velocity.x += forceX;
        entity.velocity.y += forceY;
        
        // Store momentum data for gradual reduction
        entity.momentum = {
            x: forceX,
            y: forceY,
            duration: duration,
            timeLeft: duration
        };
    }

    // Update momentum effects
    updateMomentum(entity, deltaTime) {
        if (!entity.momentum) return;
        
        entity.momentum.timeLeft -= deltaTime;
        
        // Gradually reduce momentum effect
        const remainingRatio = entity.momentum.timeLeft / entity.momentum.duration;
        if (remainingRatio > 0) {
            const momentumDecay = 0.95; // Momentum decays over time
            entity.momentum.x *= momentumDecay;
            entity.momentum.y *= momentumDecay;
        } else {
            // Momentum expired
            delete entity.momentum;
        }
    }

    // Handle collision response movement
    handleCollisionResponse(entityA, entityB, separationForce = 1.0) {
        const dx = entityA.x - entityB.x;
        const dy = entityA.y - entityB.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return; // Avoid division by zero
        
        // Calculate separation vector
        const separationX = (dx / distance) * separationForce;
        const separationY = (dy / distance) * separationForce;
        
        // Apply separation based on mass ratio
        const totalMass = entityA.mass + entityB.mass;
        const massRatioA = entityB.mass / totalMass;
        const massRatioB = entityA.mass / totalMass;
        
        entityA.velocity.x += separationX * massRatioA;
        entityA.velocity.y += separationY * massRatioA;
        entityB.velocity.x -= separationX * massRatioB;
        entityB.velocity.y -= separationY * massRatioB;
    }

    // Smooth movement interpolation for rendering
    interpolateMovement(entity, previousState, alpha) {
        return {
            x: MathUtils.lerp(previousState.x, entity.x, alpha),
            y: MathUtils.lerp(previousState.y, entity.y, alpha),
            radius: MathUtils.lerp(previousState.radius, entity.radius, alpha)
        };
    }

    // Calculate movement prediction for AI
    predictMovement(entity, steps = 10, deltaTime = 16.67) {
        const predictions = [];
        let tempX = entity.x;
        let tempY = entity.y;
        let tempVelX = entity.velocity.x;
        let tempVelY = entity.velocity.y;
        
        for (let i = 0; i < steps; i++) {
            // Simulate physics step
            tempVelX *= this.config.friction;
            tempVelY *= this.config.friction;
            tempX += tempVelX * deltaTime;
            tempY += tempVelY * deltaTime;
            
            predictions.push({
                x: tempX,
                y: tempY,
                step: i,
                time: i * deltaTime
            });
        }
        
        return predictions;
    }

    // Handle easing movement (for smooth UI animations)
    easeToPosition(entity, targetX, targetY, easeType = 'easeOutQuad', speed = 0.1) {
        const dx = targetX - entity.x;
        const dy = targetY - entity.y;
        
        switch (easeType) {
            case 'easeOutQuad':
                entity.x += dx * speed * speed;
                entity.y += dy * speed * speed;
                break;
            case 'easeInOutQuad':
                const t = speed < 0.5 ? 2 * speed * speed : 1 - Math.pow(-2 * speed + 2, 2) / 2;
                entity.x += dx * t;
                entity.y += dy * t;
                break;
            default:
                entity.x += dx * speed;
                entity.y += dy * speed;
        }
    }

    // Get movement statistics
    getMovementStats(entity) {
        const speed = Math.sqrt(
            entity.velocity.x * entity.velocity.x + 
            entity.velocity.y * entity.velocity.y
        );
        
        return {
            speed: speed,
            maxSpeed: this.calculateMaxSpeed(entity.mass),
            efficiency: speed / this.calculateMaxSpeed(entity.mass),
            direction: Math.atan2(entity.velocity.y, entity.velocity.x),
            isMoving: speed > this.config.minSpeed
        };
    }
}
