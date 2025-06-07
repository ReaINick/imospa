import { EventSystem } from './EventSystem.js';
import { CONFIG } from './Config.js';
import { GameLoop } from './GameLoop.js';
import { PhysicsEngine } from '../physics/PhysicsEngine.js';
import { CollisionDetection } from '../physics/CollisionDetection.js';
import { Movement } from '../physics/Movement.js';
import { Splitting } from '../physics/Splitting.js';
import { Renderer } from '../rendering/Renderer.js';
import { Camera } from '../rendering/Camera.js';
import { ViewportManager } from '../rendering/ViewportManager.js';
import { ParticleSystem } from '../rendering/ParticleSystem.js';
import { Player } from '../entities/Player.js';
import { Food } from '../entities/Food.js';
import { BotManager } from '../ai/BotManager.js';
import { QuadTree } from '../utils/QuadTree.js';
import { PowerupSystem } from '../systems/PowerupSystem.js';
import { ProgressionSystem } from '../systems/ProgressionSystem.js';
import { CurrencyManager } from '../systems/CurrencyManager.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { UIManager } from '../ui/UIManager.js';
import { Utils } from '../utils/Utils.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.isRunning = false;
        this.isPaused = false;
        this.gameState = 'menu'; // menu, playing, paused, gameover
        
        // Initialize core systems
        this.eventSystem = new EventSystem();
        this.CONFIG = new CONFIG();
        this.physicsEngine = new PhysicsEngine();
        this.collisionDetection = new CollisionDetection();
        this.movement = new Movement(this.physicsEngine);
        this.splitting = new Splitting(this.physicsEngine);
        
        // Initialize rendering systems
        this.camera = new Camera(canvas.width, canvas.height);
        this.viewportManager = new ViewportManager(this.camera);
        this.particleSystem = new ParticleSystem();
        this.renderer = new Renderer(this.ctx, this.camera, this.particleSystem);
        
        // Initialize game systems
        this.powerupSystem = new PowerupSystem();
        this.progressionSystem = new ProgressionSystem();
        this.currencyManager = new CurrencyManager();
        this.saveSystem = new SaveSystem();
        this.uiManager = new UIManager(this.eventSystem);
        this.botManager = new BotManager();
        
        // Game state
        this.player = null;
        this.food = [];
        this.entities = [];
        this.quadTree = null;
        this.worldBounds = {
            left: -CONFIG.WORLD_SIZE / 2,
            right: CONFIG.WORLD_SIZE / 2,
            top: -CONFIG.WORLD_SIZE / 2,
            bottom: CONFIG.WORLD_SIZE / 2
        };
        
        // Performance tracking
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.fps = 0;
        
        // Initialize systems
        this.initializeSystems();
        this.setupEventListeners();
        
        // Create game loop
        this.gameLoop = new GameLoop(this.update.bind(this), this.render.bind(this));
    }
    
    initializeSystems() {
        // Initialize quad tree for spatial partitioning
        this.quadTree = new QuadTree({
            x: this.worldBounds.left,
            y: this.worldBounds.top,
            width: CONFIG.WORLD_SIZE,
            height: CONFIG.WORLD_SIZE
        });
        
        // Initialize food spawning
        this.generateFood();
        
        // Initialize bots
        this.botManager.initialize(this.worldBounds);
        
        // Setup currency system
        this.currencyManager.initialize();
        
        // Setup powerup system
        this.powerupSystem.initialize();
        
        // Setup UI
        this.uiManager.initialize();
    }
    
    setupEventListeners() {
        // Player input events
        this.eventSystem.on('playerMove', (data) => {
            if (this.player && this.gameState === 'playing') {
                this.movement.updatePlayerMovement(this.player, data.mouseX, data.mouseY);
            }
        });
        
        this.eventSystem.on('playerSplit', () => {
            if (this.player && this.gameState === 'playing') {
                this.splitting.performSplit(this.player);
            }
        });
        
        this.eventSystem.on('playerEject', () => {
            if (this.player && this.gameState === 'playing') {
                this.ejectMass(this.player);
            }
        });
        
        // Powerup events
        this.eventSystem.on('usePowerup', (data) => {
            if (this.player && this.gameState === 'playing') {
                this.powerupSystem.usePowerup(this.player, data.powerupType, data.mouseX, data.mouseY);
            }
        });
        
        // Game state events
        this.eventSystem.on('gameStart', (data) => {
            this.startGame(data.playerName);
        });
        
        this.eventSystem.on('gameEnd', () => {
            this.endGame();
        });
        
        this.eventSystem.on('gamePause', () => {
            this.togglePause();
        });
        
        // Shop events
        this.eventSystem.on('purchaseItem', (data) => {
            if (this.player) {
                this.currencyManager.processPurchase(this.player, data.itemId, data.currency);
            }
        });
        
        // Save/Load events
        this.eventSystem.on('saveGame', () => {
            this.saveGame();
        });
        
        this.eventSystem.on('loadGame', () => {
            this.loadGame();
        });
        
        // Achievement events
        this.eventSystem.on('achievementUnlocked', (data) => {
            this.uiManager.showAchievementNotification(data.achievement);
        });
    }
    
    startGame(playerName) {
        // Create player
        this.player = new Player(0, 0, playerName);
        
        // Reset game state
        this.entities = [this.player];
        this.gameState = 'playing';
        this.isRunning = true;
        
        // Add bots
        const bots = this.botManager.spawnBots(CONFIG.INITIAL_BOT_COUNT);
        this.entities.push(...bots);
        
        // Set camera target
        this.camera.setTarget(this.player);
        
        // Start game loop
        this.gameLoop.start();
        
        // Update UI
        this.uiManager.showGameUI();
        
        // Fire game start event
        this.eventSystem.emit('gameStarted', { player: this.player });
    }
    
    endGame() {
        this.gameState = 'gameover';
        this.isRunning = false;
        
        // Calculate final stats
        const finalStats = {
            finalMass: this.player.getTotalMass(),
            level: this.player.level,
            experience: this.player.experience,
            timeAlive: Date.now() - this.player.startTime,
            coinsEarned: this.player.coins,
            cellsAbsorbed: this.player.stats.cellsAbsorbed,
            playersDefeated: this.player.stats.playersDefeated
        };
        
        // Update progression
        this.progressionSystem.processGameEnd(this.player, finalStats);
        
        // Save progress
        this.saveGame();
        
        // Show game over screen
        this.uiManager.showGameOverScreen(finalStats);
        
        // Stop game loop
        this.gameLoop.stop();
        
        // Fire game end event
        this.eventSystem.emit('gameEnded', finalStats);
    }
    
    togglePause() {
        if (this.gameState === 'playing') {
            this.isPaused = !this.isPaused;
            this.uiManager.togglePauseMenu(this.isPaused);
            
            if (this.isPaused) {
                this.gameLoop.pause();
            } else {
                this.gameLoop.resume();
            }
        }
    }
    
    update(deltaTime) {
        if (this.gameState !== 'playing' || this.isPaused) return;
        
        // Update quad tree
        this.updateQuadTree();
        
        // Update player
        if (this.player && this.player.isAlive) {
            this.updatePlayer(deltaTime);
        } else if (this.player && !this.player.isAlive) {
            this.endGame();
            return;
        }
        
        // Update bots
        this.botManager.update(deltaTime, this.quadTree);
        
        // Update entities
        this.updateEntities(deltaTime);
        
        // Check collisions
        this.processCollisions();
        
        // Update powerups
        this.powerupSystem.update(deltaTime);
        
        // Update particles
        this.particleSystem.update(deltaTime);
        
        // Update camera
        this.camera.update(deltaTime);
        
        // Update UI
        this.uiManager.update(deltaTime);
        
        // Spawn food if needed
        this.maintainFoodCount();
        
        // Update progression
        this.progressionSystem.update(this.player, deltaTime);
        
        // Clean up dead entities
        this.cleanupEntities();
    }
    
    updateQuadTree() {
        this.quadTree.clear();
        
        // Insert all entities into quadtree
        for (const entity of this.entities) {
            if (entity.isAlive) {
                if (entity.cells && entity.cells.length > 0) {
                    // For players/bots with multiple cells
                    for (const cell of entity.cells) {
                        this.quadTree.insert(cell);
                    }
                } else {
                    // For single entities
                    this.quadTree.insert(entity);
                }
            }
        }
        
        // Insert food
        for (const food of this.food) {
            this.quadTree.insert(food);
        }
    }
    
    updatePlayer(deltaTime) {
        // Update player movement
        this.movement.update(this.player, deltaTime);
        
        // Update cell physics
        for (const cell of this.player.cells) {
            this.physicsEngine.updateEntityPhysics(cell, deltaTime);
        }
        
        // Check world boundaries
        this.enforceWorldBoundaries(this.player);
        
        // Update splitting cooldowns
        this.splitting.update(this.player, deltaTime);
    }
    
    updateEntities(deltaTime) {
        for (const entity of this.entities) {
            if (!entity.isAlive) continue;
            
            // Update entity physics
            if (entity.cells) {
                for (const cell of entity.cells) {
                    this.physicsEngine.updateEntityPhysics(cell, deltaTime);
                }
            } else {
                this.physicsEngine.updateEntityPhysics(entity, deltaTime);
            }
            
            // Check world boundaries
            this.enforceWorldBoundaries(entity);
        }
    }
    
    processCollisions() {
        // Player collisions
        if (this.player && this.player.isAlive) {
            this.processPlayerCollisions();
        }
        
        // Bot collisions
        for (const bot of this.botManager.bots) {
            if (bot.isAlive) {
                this.processBotCollisions(bot);
            }
        }
    }
    
    processPlayerCollisions() {
        for (const playerCell of this.player.cells) {
            const nearby = this.quadTree.retrieve(playerCell);
            
            for (const entity of nearby) {
                if (entity === playerCell) continue;
                
                if (this.collisionDetection.checkCollision(playerCell, entity)) {
                    this.handleCollision(playerCell, entity);
                }
            }
        }
    }
    
    processBotCollisions(bot) {
        for (const botCell of bot.cells) {
            const nearby = this.quadTree.retrieve(botCell);
            
            for (const entity of nearby) {
                if (entity === botCell || entity.owner === bot) continue;
                
                if (this.collisionDetection.checkCollision(botCell, entity)) {
                    this.handleCollision(botCell, entity);
                }
            }
        }
    }
    
    handleCollision(cellA, cellB) {
        // Food collision
        if (cellB instanceof Food) {
            this.handleFoodCollision(cellA, cellB);
        }
        // Cell vs Cell collision
        else if (cellB.mass !== undefined) {
            this.handleCellCollision(cellA, cellB);
        }
    }
    
    handleFoodCollision(cell, food) {
        // Absorb food
        cell.absorb(food);
        
        // Award currency
        if (cell.owner === this.player) {
            this.currencyManager.awardFoodCurrency(this.player, food.mass);
        }
        
        // Remove food
        const index = this.food.indexOf(food);
        if (index > -1) {
            this.food.splice(index, 1);
        }
        
        // Create absorption particle effect
        this.particleSystem.createAbsorptionEffect(food.x, food.y, food.color);
    }
    
    handleCellCollision(cellA, cellB) {
        if (cellA.canAbsorb(cellB)) {
            // Store absorbed cell info for rewards
            const absorbedMass = cellB.mass;
            const absorbedOwner = cellB.owner;
            
            // Perform absorption
            cellA.absorb(cellB);
            
            // Award currency and experience
            if (cellA.owner === this.player) {
                this.currencyManager.awardAbsorptionCurrency(this.player, absorbedMass);
                this.progressionSystem.awardExperience(this.player, absorbedMass);
                
                // Track statistics
                this.player.stats.cellsAbsorbed++;
                if (absorbedOwner && absorbedOwner !== this.player) {
                    this.player.stats.playersDefeated++;
                }
            }
            
            // Remove absorbed cell
            if (cellB.owner && cellB.owner.cells) {
                const index = cellB.owner.cells.indexOf(cellB);
                if (index > -1) {
                    cellB.owner.cells.splice(index, 1);
                    
                    // Check if owner is eliminated
                    if (cellB.owner.cells.length === 0) {
                        cellB.owner.isAlive = false;
                    }
                }
            }
            
            // Create absorption particle effect
            this.particleSystem.createAbsorptionEffect(cellB.x, cellB.y, cellB.color);
        }
    }
    
    enforceWorldBoundaries(entity) {
        const cells = entity.cells || [entity];
        
        for (const cell of cells) {
            // Left boundary
            if (cell.x - cell.radius < this.worldBounds.left) {
                cell.x = this.worldBounds.left + cell.radius;
                cell.velocity.x *= -CONFIG.BOUNDARY_BOUNCE;
            }
            
            // Right boundary
            if (cell.x + cell.radius > this.worldBounds.right) {
                cell.x = this.worldBounds.right - cell.radius;
                cell.velocity.x *= -CONFIG.BOUNDARY_BOUNCE;
            }
            
            // Top boundary
            if (cell.y - cell.radius < this.worldBounds.top) {
                cell.y = this.worldBounds.top + cell.radius;
                cell.velocity.y *= -CONFIG.BOUNDARY_BOUNCE;
            }
            
            // Bottom boundary
            if (cell.y + cell.radius > this.worldBounds.bottom) {
                cell.y = this.worldBounds.bottom - cell.radius;
                cell.velocity.y *= -CONFIG.BOUNDARY_BOUNCE;
            }
        }
    }
    
    ejectMass(player) {
        if (player.getTotalMass() < CONFIG.MIN_EJECT_MASS) return;
        
        for (const cell of player.cells) {
            if (cell.mass > CONFIG.MIN_EJECT_MASS) {
                // Create ejected mass
                const ejectedMass = Math.min(cell.mass * 0.1, CONFIG.MAX_EJECT_MASS);
                cell.mass -= ejectedMass;
                cell.updateRadius();
                
                // Create food pellet
                const angle = Math.random() * Math.PI * 2;
                const distance = cell.radius + 20;
                const food = new Food(
                    cell.x + Math.cos(angle) * distance,
                    cell.y + Math.sin(angle) * distance,
                    ejectedMass
                );
                
                // Add velocity to ejected mass
                food.velocity = {
                    x: Math.cos(angle) * CONFIG.EJECT_VELOCITY,
                    y: Math.sin(angle) * CONFIG.EJECT_VELOCITY
                };
                
                this.food.push(food);
            }
        }
    }
    
    generateFood() {
        const foodCount = CONFIG.FOOD_COUNT;
        
        for (let i = 0; i < foodCount; i++) {
            this.spawnFood();
        }
    }
    
    spawnFood() {
        const x = Utils.randomBetween(this.worldBounds.left, this.worldBounds.right);
        const y = Utils.randomBetween(this.worldBounds.top, this.worldBounds.bottom);
        const mass = Utils.randomBetween(CONFIG.FOOD_MIN_MASS, CONFIG.FOOD_MAX_MASS);
        
        const food = new Food(x, y, mass);
        this.food.push(food);
    }
    
    maintainFoodCount() {
        while (this.food.length < CONFIG.FOOD_COUNT) {
            this.spawnFood();
        }
    }
    
    cleanupEntities() {
        // Remove dead entities
        this.entities = this.entities.filter(entity => entity.isAlive);
        
        // Remove absorbed food (already handled in collision detection)
        // this.food = this.food.filter(food => food.isAlive);
    }
    
    render() {
        // Clear canvas
        this.renderer.clear();
        
        // Set viewport
        this.viewportManager.update(this.entities, this.food);
        
        // Render background grid
        this.renderer.renderGrid(this.worldBounds);
        
        // Render food
        const visibleFood = this.viewportManager.getVisibleEntities(this.food);
        this.renderer.renderFood(visibleFood);
        
        // Render entities
        const visibleEntities = this.viewportManager.getVisibleEntities(this.entities);
        for (const entity of visibleEntities) {
            this.renderer.renderEntity(entity);
        }
        
        // Render particles
        this.renderer.renderParticles(this.particleSystem.particles);
        
        // Render UI
        if (this.gameState === 'playing') {
            this.uiManager.render(this.ctx, this.player);
        }
        
        // Render debug info if enabled
        if (CONFIG.DEBUG_MODE) {
            this.renderDebugInfo();
        }
    }
    
    renderDebugInfo() {
        this.ctx.save();
        this.ctx.resetTransform();
        this.ctx.fillStyle = 'white';
        this.ctx.font = '14px Arial';
        
        const debugInfo = [
            `FPS: ${this.fps}`,
            `Entities: ${this.entities.length}`,
            `Food: ${this.food.length}`,
            `Particles: ${this.particleSystem.particles.length}`,
            `Player Mass: ${this.player ? this.player.getTotalMass().toFixed(1) : 'N/A'}`,
            `Camera Zoom: ${this.camera.zoom.toFixed(2)}`
        ];
        
        debugInfo.forEach((info, index) => {
            this.ctx.fillText(info, 10, 20 + index * 20);
        });
        
        this.ctx.restore();
    }
    
    saveGame() {
        if (this.player) {
            this.saveSystem.save(this.player);
        }
    }
    
    loadGame() {
        const savedData = this.saveSystem.load();
        if (savedData) {
            // Apply saved data to current player or create new player
            // Implementation depends on save system structure
            this.eventSystem.emit('gameLoaded', savedData);
        }
    }
    
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.camera.resize(width, height);
        this.renderer.resize(width, height);
        this.uiManager.resize(width, height);
    }
    
    destroy() {
        this.gameLoop.stop();
        this.eventSystem.removeAllListeners();
        this.uiManager.destroy();
        this.particleSystem.clear();
        this.botManager.destroy();
    }
    
    // Getter methods for external access
    getGameState() {
        return this.gameState;
    }
    
    getPlayer() {
        return this.player;
    }
    
    getEntities() {
        return this.entities;
    }
    
    getFood() {
        return this.food;
    }
    
    getLeaderboard() {
        const leaderboard = [];
        
        for (const entity of this.entities) {
            if (entity.isAlive) {
                leaderboard.push({
                    name: entity.name,
                    mass: entity.getTotalMass(),
                    isPlayer: entity === this.player
                });
            }
        }
        
        return leaderboard.sort((a, b) => b.mass - a.mass).slice(0, 10);
    }
}
