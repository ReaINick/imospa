// core/GameLoop.js
import { EventSystem } from './EventSystem.js';

export class GameLoop {
    constructor(game) {
        this.game = game;
        this.isRunning = false;
        this.isPaused = false;
        
        // Timing configuration
        this.targetFPS = 60;
        this.frameTime = 1000 / this.targetFPS;
        this.maxFrameTime = 50; // Cap frame time to prevent spiral of death
        
        // Frame tracking
        this.lastTime = 0;
        this.accumulator = 0;
        this.currentTime = 0;
        this.frameCount = 0;
        this.fpsCounter = 0;
        this.lastFPSUpdate = 0;
        
        // Performance monitoring
        this.performanceStats = {
            fps: 60,
            frameTime: 16.67,
            updateTime: 0,
            renderTime: 0,
            totalEntities: 0
        };
        
        // Update phases
        this.updatePhases = [
            'input',
            'physics',
            'entities',
            'collisions',
            'ai',
            'systems',
            'cleanup'
        ];
        
        this.renderPhases = [
            'background',
            'entities',
            'effects',
            'ui',
            'debug'
        ];
    }

    // Start the game loop
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.isPaused = false;
        this.lastTime = performance.now();
        
        EventSystem.emit('gameloop:started');
        
        // Start the main loop
        this.loop();
    }

    // Stop the game loop
    stop() {
        this.isRunning = false;
        this.isPaused = false;
        
        EventSystem.emit('gameloop:stopped');
    }

    // Pause the game loop
    pause() {
        this.isPaused = true;
        EventSystem.emit('gameloop:paused');
    }

    // Resume the game loop
    resume() {
        if (!this.isRunning) return;
        
        this.isPaused = false;
        this.lastTime = performance.now(); // Reset timing to prevent large delta
        
        EventSystem.emit('gameloop:resumed');
        this.loop();
    }

    // Main game loop using fixed timestep with interpolation
    loop() {
        if (!this.isRunning) return;
        
        if (this.isPaused) {
            // Keep the loop alive but don't update
            requestAnimationFrame(() => this.loop());
            return;
        }

        const startTime = performance.now();
        this.currentTime = startTime;
        const deltaTime = Math.min(this.currentTime - this.lastTime, this.maxFrameTime);
        
        this.lastTime = this.currentTime;
        this.accumulator += deltaTime;

        // Fixed timestep updates
        let updateCount = 0;
        const maxUpdates = 5; // Prevent spiral of death
        
        while (this.accumulator >= this.frameTime && updateCount < maxUpdates) {
            this.update(this.frameTime);
            this.accumulator -= this.frameTime;
            updateCount++;
        }

        // Calculate interpolation alpha for smooth rendering
        const alpha = this.accumulator / this.frameTime;
        
        // Render with interpolation
        const updateEndTime = performance.now();
        this.render(alpha);
        const renderEndTime = performance.now();

        // Update performance stats
        this.updatePerformanceStats(startTime, updateEndTime, renderEndTime);
        
        // Continue loop
        requestAnimationFrame(() => this.loop());
    }

    // Update game state with fixed timestep
    update(deltaTime) {
        const updateStart = performance.now();
        
        try {
            // Execute update phases in order
            for (let phase of this.updatePhases) {
                this.executeUpdatePhase(phase, deltaTime);
            }
            
            // Increment frame counter
            this.frameCount++;
            
        } catch (error) {
            console.error('Error in game update:', error);
            EventSystem.emit('gameloop:error', { phase: 'update', error });
        }
        
        this.performanceStats.updateTime = performance.now() - updateStart;
    }

    // Execute specific update phase
    executeUpdatePhase(phase, deltaTime) {
        const phaseStart = performance.now();
        
        switch (phase) {
            case 'input':
                this.updateInput(deltaTime);
                break;
                
            case 'physics':
                this.updatePhysics(deltaTime);
                break;
                
            case 'entities':
                this.updateEntities(deltaTime);
                break;
                
            case 'collisions':
                this.updateCollisions(deltaTime);
                break;
                
            case 'ai':
                this.updateAI(deltaTime);
                break;
                
            case 'systems':
                this.updateSystems(deltaTime);
                break;
                
            case 'cleanup':
                this.updateCleanup(deltaTime);
                break;
        }
        
        // Emit phase completion event
        EventSystem.emit(`gameloop:phase:${phase}`, { 
            deltaTime, 
            duration: performance.now() - phaseStart 
        });
    }

    // Update input handling
    updateInput(deltaTime) {
        if (this.game.inputManager) {
            this.game.inputManager.update(deltaTime);
        }
    }

    // Update physics systems
    updatePhysics(deltaTime) {
        if (this.game.physicsEngine) {
            // Update physics for all entities
            const allEntities = [
                ...this.game.players,
                ...this.game.food,
                ...this.game.bots
            ];
            
            for (let entity of allEntities) {
                this.game.physicsEngine.updateEntityPhysics(entity, deltaTime);
            }
            
            // Update movement systems
            if (this.game.movementSystem) {
                for (let player of this.game.players) {
                    if (player.isActive) {
                        this.game.movementSystem.handleMouseMovement(
                            player, 
                            player.targetX || player.x, 
                            player.targetY || player.y, 
                            deltaTime
                        );
                    }
                }
            }
        }
    }

    // Update entities
    updateEntities(deltaTime) {
        // Update players
        for (let player of this.game.players) {
            if (player.update) {
                player.update(deltaTime);
            }
            
            // Update splitting system for player
            if (this.game.splittingSystem) {
                this.game.splittingSystem.update(player, deltaTime);
            }
        }
        
        // Update bots
        for (let bot of this.game.bots) {
            if (bot.update) {
                const nearbyEntities = this.getNearbyEntities(bot, 200);
                bot.update(deltaTime, nearbyEntities);
            }
        }
        
        // Update food (if food has update logic)
        for (let food of this.game.food) {
            if (food.update) {
                food.update(deltaTime);
            }
        }
    }

    // Update collision detection and resolution
    updateCollisions(deltaTime) {
        if (!this.game.collisionDetection) return;
        
        // Get all entities that can collide
        const allEntities = [];
        
        // Add all player cells
        for (let player of this.game.players) {
            allEntities.push(...player.cells);
        }
        
        // Add bot cells
        for (let bot of this.game.bots) {
            allEntities.push(...bot.cells);
        }
        
        // Add food
        allEntities.push(...this.game.food);
        
        // Detect collisions
        const collisions = this.game.collisionDetection.detectCollisions(allEntities);
        
        // Process collisions
        this.processCollisions(collisions);
        
        // Check boundary collisions
        this.checkBoundaryCollisions(allEntities);
    }

    // Process collision results
    processCollisions(collisions) {
        const entitiesToRemove = [];
        
        for (let collision of collisions) {
            const { a, b } = collision;
            
            // Handle different collision types
            if (a.isFood || b.isFood) {
                // Food absorption
                const food = a.isFood ? a : b;
                const consumer = a.isFood ? b : a;
                
                if (this.game.collisionDetection.processAbsorption(consumer, food)) {
                    entitiesToRemove.push(food);
                }
            } else if (a.isPlayer && b.isPlayer) {
                // Player cell collision
                this.game.collisionDetection.handlePlayerCellCollision(a, b);
            }
        }
        
        // Remove absorbed entities
        this.removeEntities(entitiesToRemove);
    }

    // Check boundary collisions for all entities
    checkBoundaryCollisions(entities) {
        if (!this.game.worldBounds) return;
        
        for (let entity of entities) {
            this.game.collisionDetection.resolveBoundaryCollision(
                entity, 
                this.game.worldBounds
            );
        }
    }

    // Update AI systems
    updateAI(deltaTime) {
        if (!this.game.botManager) return;
        
        this.game.botManager.update(deltaTime);
    }

    // Update game systems
    updateSystems(deltaTime) {
        // Update progression systems
        if (this.game.progressionSystem) {
            this.game.progressionSystem.update(deltaTime);
        }
        
        // Update powerup systems
        if (this.game.powerupSystem) {
            this.game.powerupSystem.update(deltaTime);
        }
        
        // Update currency systems
        if (this.game.currencyManager) {
            this.game.currencyManager.update(deltaTime);
        }
        
        // Update food spawning
        if (this.game.foodManager) {
            this.game.foodManager.update(deltaTime);
        }
    }

    // Cleanup phase
    updateCleanup(deltaTime) {
        // Remove inactive players
        this.game.players = this.game.players.filter(player => player.isActive);
        
        // Remove destroyed bots
        this.game.bots = this.game.bots.filter(bot => bot.isActive);
        
        // Clean up empty food
        this.game.food = this.game.food.filter(food => food.mass > 0);
        
        // Update entity counts for performance monitoring
        this.performanceStats.totalEntities = 
            this.game.players.length + 
            this.game.bots.length + 
            this.game.food.length;
    }

    // Render game state with interpolation
    render(alpha) {
        const renderStart = performance.now();
        
        try {
            // Execute render phases
            for (let phase of this.renderPhases) {
                this.executeRenderPhase(phase, alpha);
            }
            
        } catch (error) {
            console.error('Error in game render:', error);
            EventSystem.emit('gameloop:error', { phase: 'render', error });
        }
        
        this.performanceStats.renderTime = performance.now() - renderStart;
    }

    // Execute specific render phase
    executeRenderPhase(phase, alpha) {
        switch (phase) {
            case 'background':
                this.renderBackground(alpha);
                break;
                
            case 'entities':
                this.renderEntities(alpha);
                break;
                
            case 'effects':
                this.renderEffects(alpha);
                break;
                
            case 'ui':
                this.renderUI(alpha);
                break;
                
            case 'debug':
                this.renderDebug(alpha);
                break;
        }
    }

    // Render background
    renderBackground(alpha) {
        if (this.game.renderer) {
            this.game.renderer.renderBackground(alpha);
        }
    }

    // Render all entities
    renderEntities(alpha) {
        if (!this.game.renderer) return;
        
        // Render food
        for (let food of this.game.food) {
            this.game.renderer.renderEntity(food, alpha);
        }
        
        // Render player cells
        for (let player of this.game.players) {
            for (let cell of player.cells) {
                this.game.renderer.renderEntity(cell, alpha);
            }
        }
        
        // Render bot cells
        for (let bot of this.game.bots) {
            for (let cell of bot.cells) {
                this.game.renderer.renderEntity(cell, alpha);
            }
        }
    }

    // Render effects
    renderEffects(alpha) {
        if (this.game.particleSystem) {
            this.game.particleSystem.render(alpha);
        }
    }

    // Render UI
    renderUI(alpha) {
        if (this.game.uiManager) {
            this.game.uiManager.render(alpha);
        }
    }

    // Render debug information
    renderDebug(alpha) {
        if (this.game.debugMode && this.game.renderer) {
            this.game.renderer.renderDebugInfo(this.performanceStats);
        }
    }

    // Get entities near a specific entity
    getNearbyEntities(entity, radius) {
        const nearby = [];
        const allEntities = [
            ...this.game.players.flatMap(p => p.cells),
            ...this.game.bots.flatMap(b => b.cells),
            ...this.game.food
        ];
        
        for (let other of allEntities) {
            if (other.id !== entity.id) {
                const dx = entity.x - other.x;
                const dy = entity.y - other.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance <= radius) {
                    nearby.push({
                        entity: other,
                        distance: distance
                    });
                }
            }
        }
        
        return nearby.sort((a, b) => a.distance - b.distance);
    }

    // Remove entities from game
    removeEntities(entities) {
        for (let entity of entities) {
            if (entity.isFood) {
                const index = this.game.food.indexOf(entity);
                if (index > -1) {
                    this.game.food.splice(index, 1);
                }
            }
        }
    }

    // Update performance statistics
    updatePerformanceStats(startTime, updateEndTime, renderEndTime) {
        this.performanceStats.frameTime = renderEndTime - startTime;
        this.performanceStats.updateTime = updateEndTime - startTime;
        this.performanceStats.renderTime = renderEndTime - updateEndTime;
        
        // Update FPS counter
        this.fpsCounter++;
        if (startTime - this.lastFPSUpdate >= 1000) {
            this.performanceStats.fps = this.fpsCounter;
            this.fpsCounter = 0;
            this.lastFPSUpdate = startTime;
        }
    }

    // Get current performance stats
    getPerformanceStats() {
        return { ...this.performanceStats };
    }

    // Set target FPS
    setTargetFPS(fps) {
        this.targetFPS = Math.max(30, Math.min(120, fps));
        this.frameTime = 1000 / this.targetFPS;
    }
}
