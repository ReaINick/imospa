// js/main.js
import { EventSystem } from './core/EventSystem.js';
import { Config } from './core/Config.js';
import { GameLoop } from './core/GameLoop.js';
import { PhysicsEngine } from './physics/PhysicsEngine.js';
import { Renderer } from './rendering/Renderer.js';
import { Camera } from './rendering/Camera.js';
import { ViewportManager } from './rendering/ViewportManager.js';
import { ParticleSystem } from './rendering/ParticleSystem.js';
import { CollisionDetection } from './physics/CollisionDetection.js';
import { Movement } from './physics/Movement.js';
import { SplittingSystem } from './physics/Splitting.js';
import { Player } from './entities/Player.js';
import { Food } from './entities/Food.js';
import { Powerup } from './entities/Powerup.js';
import { BotManager } from './ai/BotManager.js';
import { UIManager } from './ui/UIManager.js';
import { Shop } from './ui/Shop.js';
import { HUD } from './ui/HUD.js';
import { Leaderboard } from './ui/Leaderboard.js';
import { PowerupSystem } from './systems/PowerupSystem.js';
import { ProgressionSystem } from './systems/ProgressionSystem.js';
import { CurrencyManager } from './systems/CurrencyManager.js';
import { SaveSystem } from './systems/SaveSystem.js';
import { PrestigeSystem } from './systems/PrestigeSystem.js';
import { AccountSystem } from './systems/AccountSystem.js';
import { QuadTree } from './utils/QuadTree.js';
import { Utils } from './utils/Utils.js';
import { GameMath } from './utils/Math.js';

class Main {
    constructor() {
        this.initialized = false;
        this.gameState = 'menu'; // menu, playing, paused, shop, prestige
        this.lastTime = 0;
        this.deltaTime = 0;
        
        // Input handling
        this.input = {
            mouse: { x: 0, y: 0, worldX: 0, worldY: 0 },
            keys: new Set(),
            mouseDown: false
        };
        
        // Game systems
        this.eventSystem = new EventSystem();
        this.physicsEngine = new PhysicsEngine();
        this.collisionDetection = new CollisionDetection();
        this.movement = new Movement(this.physicsEngine);
        this.splittingSystem = new SplittingSystem(this.physicsEngine);
        
        // Render systems
        this.renderer = null;
        this.camera = null;
        this.viewport = null;
        this.particles = null;
        
        // UI systems
        this.uiManager = null;
        this.shop = null;
        this.hud = null;
        this.leaderboard = null;
        
        // Game systems
        this.powerupSystem = new PowerupSystem();
        this.progressionSystem = new ProgressionSystem();
        this.currencyManager = new CurrencyManager();
        this.saveSystem = new SaveSystem();
        this.prestigeSystem = new PrestigeSystem();
        this.accountSystem = new AccountSystem();
        this.botManager = new BotManager();
        
        // Game entities
        this.player = null;
        this.food = [];
        this.powerups = [];
        this.quadTree = null;
        
        // Game loop
        this.gameLoop = new GameLoop((deltaTime) => this.update(deltaTime));
        
        // World settings
        this.worldBounds = {
            left: -Config.WORLD.WIDTH / 2,
            right: Config.WORLD.WIDTH / 2,
            top: -Config.WORLD.HEIGHT / 2,
            bottom: Config.WORLD.HEIGHT / 2
        };
        
        this.setupEventListeners();
    }
    
    async init() {
        try {
            console.log('Initializing Agar.io Clone...');
            
            // Initialize canvas and rendering
            await this.initializeCanvas();
            
            // Initialize UI systems
            this.initializeUI();
            
            // Initialize game systems
            this.initializeGameSystems();
            
            // Setup event handlers
            this.setupGameEvents();
            
            // Load save data
            await this.loadGameData();
            
            // Initialize world
            this.initializeWorld();
            
            this.initialized = true;
            console.log('Game initialized successfully!');
            
            // Show main menu
            this.showMainMenu();
            
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.showError('Failed to initialize game. Please refresh the page.');
        }
    }
    
    async initializeCanvas() {
        const canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            throw new Error('Game canvas not found');
        }
        
        // Set canvas size
        this.resizeCanvas();
        
        // Initialize rendering systems
        this.renderer = new Renderer(canvas);
        this.camera = new Camera(canvas.width, canvas.height);
        this.viewport = new ViewportManager(this.camera);
        this.particles = new ParticleSystem();
        
        // Handle window resize
        window.addEventListener('resize', () => this.resizeCanvas());
    }
    
    initializeUI() {
        this.uiManager = new UIManager();
        this.shop = new Shop();
        this.hud = new HUD();
        this.leaderboard = new Leaderboard();
        
        // Connect systems
        this.shop.setCurrencyManager(this.currencyManager);
        this.hud.setProgressionSystem(this.progressionSystem);
    }
    
    initializeGameSystems() {
        // Connect systems together
        this.powerupSystem.setEventSystem(this.eventSystem);
        this.progressionSystem.setEventSystem(this.eventSystem);
        this.currencyManager.setEventSystem(this.eventSystem);
        this.prestigeSystem.setProgressionSystem(this.progressionSystem);
        this.prestigeSystem.setCurrencyManager(this.currencyManager);
        
        // Initialize bot manager
        this.botManager.initialize(this.worldBounds);
    }
    
    setupGameEvents() {
        // Player progression events
        this.eventSystem.on('player.levelUp', (data) => {
            this.handleLevelUp(data);
        });
        
        this.eventSystem.on('player.absorption', (data) => {
            this.handleAbsorption(data);
        });
        
        // Currency events
        this.eventSystem.on('currency.earned', (data) => {
            this.handleCurrencyEarned(data);
        });
        
        // Powerup events
        this.eventSystem.on('powerup.activated', (data) => {
            this.handlePowerupActivated(data);
        });
        
        // Shop events
        this.eventSystem.on('shop.purchase', (data) => {
            this.handleShopPurchase(data);
        });
        
        // Game state events
        this.eventSystem.on('game.stateChange', (state) => {
            this.gameState = state;
        });
    }
    
    async loadGameData() {
        try {
            const saveData = await this.saveSystem.load();
            if (saveData) {
                this.accountSystem.loadAccount(saveData);
                console.log('Save data loaded successfully');
            }
        } catch (error) {
            console.warn('Could not load save data:', error);
        }
    }
    
    initializeWorld() {
        // Initialize QuadTree for spatial partitioning
        this.quadTree = new QuadTree({
            x: this.worldBounds.left,
            y: this.worldBounds.top,
            width: Config.WORLD.WIDTH,
            height: Config.WORLD.HEIGHT
        });
        
        // Generate initial food
        this.generateFood();
        
        // Generate initial powerups
        this.generatePowerups();
        
        // Spawn bots
        this.botManager.spawnInitialBots(Config.BOTS.INITIAL_COUNT);
    }
    
    startGame(playerName) {
        if (!this.initialized) {
            console.error('Game not initialized');
            return;
        }
        
        try {
            // Create player
            this.createPlayer(playerName);
            
            // Change game state
            this.gameState = 'playing';
            this.eventSystem.emit('game.stateChange', 'playing');
            
            // Start game loop
            this.gameLoop.start();
            
            // Show HUD
            this.hud.show();
            this.leaderboard.show();
            
            console.log('Game started with player:', playerName);
            
        } catch (error) {
            console.error('Failed to start game:', error);
            this.showError('Failed to start game');
        }
    }
    
    createPlayer(name) {
        const spawnPos = this.getRandomSpawnPosition();
        this.player = new Player(spawnPos.x, spawnPos.y, name);
        
        // Set up player progression
        this.progressionSystem.setPlayer(this.player);
        this.currencyManager.setPlayer(this.player);
        
        // Position camera on player
        this.camera.setTarget(this.player);
        
        console.log(`Player '${name}' created at position (${spawnPos.x}, ${spawnPos.y})`);
    }
    
    update(deltaTime) {
        if (this.gameState !== 'playing' || !this.player) {
            return;
        }
        
        this.deltaTime = deltaTime;
        
        try {
            // Clear and rebuild QuadTree
            this.quadTree.clear();
            this.populateQuadTree();
            
            // Update input
            this.updateInput();
            
            // Update player
            this.updatePlayer(deltaTime);
            
            // Update bots
            this.botManager.update(deltaTime, this.quadTree);
            
            // Update physics
            this.updatePhysics(deltaTime);
            
            // Update powerups
            this.updatePowerups(deltaTime);
            
            // Update particles
            this.particles.update(deltaTime);
            
            // Update camera
            this.camera.update(deltaTime);
            
            // Update UI
            this.updateUI(deltaTime);
            
            // Handle collisions
            this.handleCollisions();
            
            // Clean up entities
            this.cleanupEntities();
            
            // Maintain world state
            this.maintainWorld();
            
            // Render frame
            this.render();
            
        } catch (error) {
            console.error('Error in game update:', error);
        }
    }
    
    populateQuadTree() {
        // Add player cells
        if (this.player) {
            this.player.cells.forEach(cell => {
                this.quadTree.insert(cell);
            });
        }
        
        // Add bot cells
        this.botManager.bots.forEach(bot => {
            bot.cells.forEach(cell => {
                this.quadTree.insert(cell);
            });
        });
        
        // Add food
        this.food.forEach(food => {
            this.quadTree.insert(food);
        });
        
        // Add powerups
        this.powerups.forEach(powerup => {
            this.quadTree.insert(powerup);
        });
    }
    
    updateInput() {
        // Update world mouse position
        this.input.mouse.worldX = this.camera.screenToWorldX(this.input.mouse.x);
        this.input.mouse.worldY = this.camera.screenToWorldY(this.input.mouse.y);
    }
    
    updatePlayer(deltaTime) {
        if (!this.player) return;
        
        // Update player movement
        this.movement.updatePlayer(
            this.player,
            this.input.mouse.worldX,
            this.input.mouse.worldY,
            deltaTime
        );
        
        // Update player progression
        this.progressionSystem.update(deltaTime);
        
        // Check world boundaries
        this.enforceWorldBoundaries(this.player);
    }
    
    updatePhysics(deltaTime) {
        // Update all entities physics
        if (this.player) {
            this.player.cells.forEach(cell => {
                this.physicsEngine.updateEntity(cell, deltaTime);
            });
        }
        
        this.botManager.bots.forEach(bot => {
            bot.cells.forEach(cell => {
                this.physicsEngine.updateEntity(cell, deltaTime);
            });
        });
    }
    
    updatePowerups(deltaTime) {
        this.powerups.forEach((powerup, index) => {
            powerup.update(deltaTime);
            
            if (powerup.shouldRemove) {
                this.powerups.splice(index, 1);
            }
        });
        
        // Update powerup system
        this.powerupSystem.update(deltaTime);
    }
    
    updateUI(deltaTime) {
        if (this.player) {
            this.hud.update(this.player);
            this.leaderboard.update(this.getAllPlayers());
        }
    }
    
    handleCollisions() {
        // Player vs Food collisions
        if (this.player) {
            this.handlePlayerFoodCollisions();
            this.handlePlayerPowerupCollisions();
            this.handlePlayerBotCollisions();
        }
        
        // Bot vs Food collisions
        this.handleBotCollisions();
    }
    
    handlePlayerFoodCollisions() {
        this.player.cells.forEach(cell => {
            const nearby = this.quadTree.retrieve(cell.getBounds());
            
            nearby.forEach(entity => {
                if (entity instanceof Food && 
                    this.collisionDetection.checkCollision(cell, entity)) {
                    
                    this.absorbeFood(cell, entity);
                }
            });
        });
    }
    
    handlePlayerPowerupCollisions() {
        this.player.cells.forEach(cell => {
            const nearby = this.quadTree.retrieve(cell.getBounds());
            
            nearby.forEach(entity => {
                if (entity instanceof Powerup && 
                    this.collisionDetection.checkCollision(cell, entity)) {
                    
                    this.collectPowerup(this.player, entity);
                }
            });
        });
    }
    
    handlePlayerBotCollisions() {
        this.player.cells.forEach(playerCell => {
            const nearby = this.quadTree.retrieve(playerCell.getBounds());
            
            nearby.forEach(entity => {
                if (entity.owner && entity.owner !== this.player &&
                    this.collisionDetection.checkCollision(playerCell, entity)) {
                    
                    this.handleCellAbsorption(playerCell, entity);
                }
            });
        });
    }
    
    handleBotCollisions() {
        this.botManager.bots.forEach(bot => {
            bot.cells.forEach(cell => {
                const nearby = this.quadTree.retrieve(cell.getBounds());
                
                nearby.forEach(entity => {
                    if (entity instanceof Food && 
                        this.collisionDetection.checkCollision(cell, entity)) {
                        
                        this.absorbeFood(cell, entity);
                    }
                });
            });
        });
    }
    
    absorbeFood(cell, food) {
        cell.absorb(food);
        
        // Remove food from array
        const index = this.food.indexOf(food);
        if (index > -1) {
            this.food.splice(index, 1);
        }
        
        // Award currency and experience
        if (cell.owner) {
            this.currencyManager.awardCoins(cell.owner, 1);
            this.progressionSystem.awardExperience(cell.owner, food.mass);
        }
        
        // Create absorption particle effect
        this.particles.createAbsorptionEffect(food.x, food.y, food.color);
        
        // Emit absorption event
        this.eventSystem.emit('player.absorption', {
            player: cell.owner,
            absorbed: food,
            mass: food.mass
        });
    }
    
    collectPowerup(player, powerup) {
        this.powerupSystem.collectPowerup(player, powerup);
        
        // Remove powerup from array
        const index = this.powerups.indexOf(powerup);
        if (index > -1) {
            this.powerups.splice(index, 1);
        }
        
        // Create collection effect
        this.particles.createPowerupEffect(powerup.x, powerup.y, powerup.type);
    }
    
    handleCellAbsorption(cellA, cellB) {
        if (this.collisionDetection.canAbsorb(cellA, cellB)) {
            const absorbed = cellA.mass > cellB.mass ? cellB : cellA;
            const absorber = cellA.mass > cellB.mass ? cellA : cellB;
            
            // Handle absorption
            absorber.absorb(absorbed);
            
            // Remove absorbed cell
            this.removeCellFromOwner(absorbed);
            
            // Create effects
            this.particles.createAbsorptionEffect(absorbed.x, absorbed.y, absorbed.color);
            
            // Award points
            if (absorber.owner) {
                const points = Math.floor(absorbed.mass / 2);
                this.currencyManager.awardCoins(absorber.owner, points);
                this.progressionSystem.awardExperience(absorber.owner, absorbed.mass);
            }
        }
    }
    
    removeCellFromOwner(cell) {
        if (cell.owner) {
            const index = cell.owner.cells.indexOf(cell);
            if (index > -1) {
                cell.owner.cells.splice(index, 1);
                cell.owner.updateTotalMass();
                
                // Check if player is eliminated
                if (cell.owner.cells.length === 0) {
                    this.handlePlayerElimination(cell.owner);
                }
            }
        }
    }
    
    handlePlayerElimination(player) {
        if (player === this.player) {
            // Player died - show game over
            this.gameOver();
        } else {
            // Bot died - respawn or remove
            this.botManager.handleBotDeath(player);
        }
    }
    
    cleanupEntities() {
        // Remove old food
        this.food = this.food.filter(food => !food.shouldRemove);
        
        // Remove old powerups
        this.powerups = this.powerups.filter(powerup => !powerup.shouldRemove);
    }
    
    maintainWorld() {
        // Maintain food count
        while (this.food.length < Config.FOOD.MAX_COUNT) {
            this.generateFood(1);
        }
        
        // Maintain powerup count
        if (this.powerups.length < Config.POWERUPS.MAX_COUNT && 
            Math.random() < Config.POWERUPS.SPAWN_RATE) {
            this.generatePowerups(1);
        }
        
        // Maintain bot count
        this.botManager.maintainBotCount();
    }
    
    render() {
        // Clear canvas
        this.renderer.clear();
        
        // Get visible entities
        const visibleBounds = this.viewport.getVisibleBounds();
        const visibleEntities = this.quadTree.retrieve(visibleBounds);
        
        // Render background
        this.renderer.renderBackground(this.camera, this.worldBounds);
        
        // Render food
        this.food.forEach(food => {
            if (this.viewport.isVisible(food)) {
                this.renderer.renderFood(food, this.camera);
            }
        });
        
        // Render powerups
        this.powerups.forEach(powerup => {
            if (this.viewport.isVisible(powerup)) {
                this.renderer.renderPowerup(powerup, this.camera);
            }
        });
        
        // Render players (bots and player)
        if (this.player) {
            this.renderer.renderPlayer(this.player, this.camera);
        }
        
        this.botManager.bots.forEach(bot => {
            if (this.viewport.isPlayerVisible(bot)) {
                this.renderer.renderPlayer(bot, this.camera);
            }
        });
        
        // Render particles
        this.particles.render(this.renderer, this.camera);
        
        // Render UI overlays
        this.renderer.renderUI();
    }
    
    // Event handlers
    handleLevelUp(data) {
        console.log(`Player ${data.player.name} leveled up to ${data.newLevel}!`);
        this.particles.createLevelUpEffect(data.player.getCenterX(), data.player.getCenterY());
        this.hud.showLevelUpNotification(data.newLevel);
    }
    
    handleAbsorption(data) {
        // Handle any special absorption logic
    }
    
    handleCurrencyEarned(data) {
        this.hud.showCurrencyGain(data.amount, data.type);
    }
    
    handlePowerupActivated(data) {
        console.log(`Powerup activated: ${data.type}`);
        this.hud.showPowerupNotification(data.type);
    }
    
    handleShopPurchase(data) {
        console.log(`Item purchased: ${data.itemId}`);
        this.hud.showPurchaseNotification(data.itemName);
    }
    
    // Input event handlers
    setupEventListeners() {
        // Mouse events
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('mousedown', (e) => this.onMouseDown(e));
        document.addEventListener('mouseup', (e) => this.onMouseUp(e));
        
        // Keyboard events
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        // UI events
        document.addEventListener('click', (e) => this.onUIClick(e));
    }
    
    onMouseMove(event) {
        const canvas = document.getElementById('gameCanvas');
        const rect = canvas.getBoundingClientRect();
        
        this.input.mouse.x = event.clientX - rect.left;
        this.input.mouse.y = event.clientY - rect.top;
    }
    
    onMouseDown(event) {
        this.input.mouseDown = true;
        
        if (this.gameState === 'playing' && this.player) {
            // Split on mouse click
            this.splittingSystem.performSplit(
                this.player,
                this.input.mouse.worldX,
                this.input.mouse.worldY
            );
        }
    }
    
    onMouseUp(event) {
        this.input.mouseDown = false;
    }
    
    onKeyDown(event) {
        this.input.keys.add(event.code);
        
        if (this.gameState === 'playing' && this.player) {
            switch (event.code) {
                case 'Space':
                    event.preventDefault();
                    // Split with spacebar
                    this.splittingSystem.performSplit(
                        this.player,
                        this.input.mouse.worldX,
                        this.input.mouse.worldY
                    );
                    break;
                    
                case 'KeyW':
                    // Eject mass
                    this.ejectMass();
                    break;
                    
                case 'KeyR':
                    // Use recombine powerup
                    this.powerupSystem.usePowerup(this.player, 'recombine', {
                        mouseX: this.input.mouse.worldX,
                        mouseY: this.input.mouse.worldY
                    });
                    break;
                    
                case 'Tab':
                    event.preventDefault();
                    this.toggleLeaderboard();
                    break;
                    
                case 'Enter':
                    this.toggleShop();
                    break;
                    
                case 'Escape':
                    this.togglePauseMenu();
                    break;
            }
        }
    }
    
    onKeyUp(event) {
        this.input.keys.delete(event.code);
    }
    
    onUIClick(event) {
        // Handle UI button clicks
        const target = event.target;
        
        if (target.classList.contains('start-game-btn')) {
            const nameInput = document.getElementById('playerName');
            const playerName = nameInput?.value?.trim() || 'Anonymous';
            this.startGame(playerName);
        }
        
        if (target.classList.contains('shop-btn')) {
            this.toggleShop();
        }
        
        if (target.classList.contains('prestige-btn')) {
            this.showPrestigeMenu();
        }
    }
    
    // Utility functions
    getRandomSpawnPosition() {
        const margin = 200;
        return {
            x: Utils.random(
                this.worldBounds.left + margin,
                this.worldBounds.right - margin
            ),
            y: Utils.random(
                this.worldBounds.top + margin,
                this.worldBounds.bottom - margin
            )
        };
    }
    
    generateFood(count = Config.FOOD.SPAWN_COUNT) {
        for (let i = 0; i < count; i++) {
            const pos = this.getRandomSpawnPosition();
            const food = new Food(pos.x, pos.y);
            this.food.push(food);
        }
    }
    
    generatePowerups(count = 1) {
        for (let i = 0; i < count; i++) {
            const pos = this.getRandomSpawnPosition();
            const types = ['speed', 'shield', 'recombine', 'mass'];
            const type = types[Math.floor(Math.random() * types.length)];
            const powerup = new Powerup(pos.x, pos.y, type);
            this.powerups.push(powerup);
        }
    }
    
    getAllPlayers() {
        const players = [];
        if (this.player) players.push(this.player);
        players.push(...this.botManager.bots);
        return players.sort((a, b) => b.totalMass - a.totalMass);
    }
    
    enforceWorldBoundaries(player) {
        player.cells.forEach(cell => {
            if (cell.x - cell.radius < this.worldBounds.left) {
                cell.x = this.worldBounds.left + cell.radius;
                cell.velocity.x *= -0.5;
            }
            if (cell.x + cell.radius > this.worldBounds.right) {
                cell.x = this.worldBounds.right - cell.radius;
                cell.velocity.x *= -0.5;
            }
            if (cell.y - cell.radius < this.worldBounds.top) {
                cell.y = this.worldBounds.top + cell.radius;
                cell.velocity.y *= -0.5;
            }
            if (cell.y + cell.radius > this.worldBounds.bottom) {
                cell.y = this.worldBounds.bottom - cell.radius;
                cell.velocity.y *= -0.5;
            }
        });
    }
    
    resizeCanvas() {
        const canvas = document.getElementById('gameCanvas');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        if (this.camera) {
            this.camera.resize(canvas.width, canvas.height);
        }
    }
    
    ejectMass() {
        if (!this.player) return;
        
        this.player.cells.forEach(cell => {
            if (cell.mass > Config.PLAYER.MIN_EJECT_MASS) {
                const direction = GameMath.getDirection(
                    cell.x, cell.y,
                    this.input.mouse.worldX, this.input.mouse.worldY
                );
                
                // Create ejected mass as food
                const ejectMass = Config.PLAYER.EJECT_MASS;
                const ejectSpeed = Config.PLAYER.EJECT_SPEED;
                
                const ejectedFood = new Food(
                    cell.x + direction.x * (cell.radius + 20),
                    cell.y + direction.y * (cell.radius + 20),
                    ejectMass
                );
                
                ejectedFood.velocity.x = direction.x * ejectSpeed;
                ejectedFood.velocity.y = direction.y * ejectSpeed;
                ejectedFood.color = cell.color;
                
                this.food.push(ejectedFood);
                
                // Reduce cell mass
                cell.mass -= ejectMass;
                cell.updateRadius();
                
                // Update player total mass
                this.player.updateTotalMass();
            }
        });
    }
    
    // UI state management
    showMainMenu() {
        this.gameState = 'menu';
        this.uiManager.showMenu('main');
    }
    
    toggleShop() {
        if (this.gameState === 'shop') {
            this.gameState = 'playing';
            this.shop.hide();
            if (this.player) {
                this.gameLoop.resume();
            }
        } else {
            this.gameState = 'shop';
            this.shop.show(this.player);
            this.gameLoop.pause();
        }
    }
    
    toggleLeaderboard() {
        this.leaderboard.toggle();
    }
    
    togglePauseMenu() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.gameLoop.pause();
            this.uiManager.showMenu('pause');
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.gameLoop.resume();
            this.uiManager.hideMenu('pause');
        }
    }
    
    showPrestigeMenu() {
        this.gameState = 'prestige';
        this.gameLoop.pause();
        this.prestigeSystem.show(this.player);
    }
    
    gameOver() {
        console.log('Game Over!');
        
        // Stop game loop
        this.gameLoop.stop();
        
        // Save progress
        this.saveGame();
        
        // Show game over screen
        this.gameState = 'gameOver';
        this.uiManager.showGameOver(this.player);
        
        // Reset for new game
        this.player = null;
    }
    
    saveGame() {
        if (this.player) {
            this.saveSystem.save(this.player);
            console.log('Game saved');
        }
    }
    
    showError(message) {
        console.error(message);
        this.uiManager.showError(message);
    }
    
    // Public API for external access
    getGameState() {
        return this.gameState;
    }
    
    getPlayer() {
        return this.player;
    }
    
    getCurrentStats() {
        if (!this.player) return null;
        
        return {
            name: this.player.name,
            level: this.player.level,
            experience: this.player.experience,
            totalMass: this.player.totalMass,
            coins: this.player.coins,
            platinumCoins: this.player.platinumCoins,
            cellCount: this.player.cells.length,
            position: this.player.getCenterPosition()
        };
    }
    
    // Debug functions
    enableDebugMode() {
        this.debugMode = true;
        console.log('Debug mode enabled');
    }
    
    disableDebugMode() {
        this.debugMode = false;
        console.log('Debug mode disabled');
    }
    
    getDebugInfo() {
        return {
            gameState: this.gameState,
            entityCount: {
                food: this.food.length,
                powerups: this.powerups.length,
                bots: this.botManager.bots.length,
                particles: this.particles.getParticleCount()
            },
            performance: {
                fps: this.gameLoop.getFPS(),
                deltaTime: this.deltaTime,
                quadTreeNodes: this.quadTree.getNodeCount()
            },
            player: this.getCurrentStats()
        };
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded, initializing game...');
    
    const game = new Main();
    window.game = game; // Make game accessible globally for debugging
    
    try {
        await game.init();
    } catch (error) {
        console.error('Failed to initialize game:', error);
        document.body.innerHTML = `
            <div style="
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                font-family: Arial, sans-serif;
                color: #ff4444;
                text-align: center;
            ">
                <div>
                    <h1>Failed to Load Game</h1>
                    <p>Please refresh the page and try again.</p>
                    <p style="font-size: 12px; opacity: 0.7;">${error.message}</p>
                </div>
            </div>
        `;
    }
});

export { Main };
