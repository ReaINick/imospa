// js/ui/UIManager.js
import { EventSystem } from '../core/EventSystem.js';
import { CONFIG } from '../core/Config.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        this.elements = {};
        this.panels = {};
        this.isInitialized = false;
        
        // UI State
        this.currentPanel = null;
        this.powerupButtons = [];
        this.keyBindings = {
            'KeyQ': 'recombine',
            'KeyW': 'speedBoost',
            'KeyE': 'massShield',
            'KeyR': 'splitBoost',
            'KeyT': 'magnetism'
        };
        
        this.initialize();
    }
    
    initialize() {
        try {
            this.createUIElements();
            this.setupEventListeners();
            this.setupKeyBindings();
            this.isInitialized = true;
            console.log('UIManager initialized successfully');
        } catch (error) {
            console.error('Failed to initialize UIManager:', error);
            throw error;
        }
    }
    
    createUIElements() {
        // Create main UI container
        this.elements.uiContainer = this.createElement('div', 'ui-container');
        document.body.appendChild(this.elements.uiContainer);
        
        // Create HUD elements
        this.createHUD();
        
        // Create powerup bar
        this.createPowerupBar();
        
        // Create menu panels
        this.createMenuPanels();
        
        // Create game over screen
        this.createGameOverScreen();
        
        // Create leaderboard
        this.createLeaderboard();
        
        // Create error display
        this.createErrorDisplay();
    }
    
    createHUD() {
        // HUD Container
        this.elements.hud = this.createElement('div', 'hud');
        this.elements.uiContainer.appendChild(this.elements.hud);
        
        // Player stats
        this.elements.playerStats = this.createElement('div', 'player-stats');
        this.elements.hud.appendChild(this.elements.playerStats);
        
        // Mass display
        this.elements.massDisplay = this.createElement('div', 'mass-display');
        this.elements.massDisplay.innerHTML = `
            <div class="stat-label">Mass</div>
            <div class="stat-value" id="mass-value">0</div>
        `;
        this.elements.playerStats.appendChild(this.elements.massDisplay);
        
        // Level display
        this.elements.levelDisplay = this.createElement('div', 'level-display');
        this.elements.levelDisplay.innerHTML = `
            <div class="stat-label">Level</div>
            <div class="stat-value" id="level-value">1</div>
        `;
        this.elements.playerStats.appendChild(this.elements.levelDisplay);
        
        // Currency display
        this.elements.currencyDisplay = this.createElement('div', 'currency-display');
        this.elements.currencyDisplay.innerHTML = `
            <div class="currency-item">
                <span class="currency-icon">🪙</span>
                <span id="coins-value">0</span>
            </div>
            <div class="currency-item">
                <span class="currency-icon">💎</span>
                <span id="platinum-value">0</span>
            </div>
        `;
        this.elements.playerStats.appendChild(this.elements.currencyDisplay);
        
        // XP Bar
        this.elements.xpBar = this.createElement('div', 'xp-bar');
        this.elements.xpBar.innerHTML = `
            <div class="xp-bar-bg">
                <div class="xp-bar-fill" id="xp-fill"></div>
                <div class="xp-bar-text" id="xp-text">0 / 100 XP</div>
            </div>
        `;
        this.elements.hud.appendChild(this.elements.xpBar);
    }
    
    createPowerupBar() {
        // Powerup bar container
        this.elements.powerupBar = this.createElement('div', 'powerup-bar');
        this.elements.uiContainer.appendChild(this.elements.powerupBar);
        
        // Create basic powerup buttons without requiring powerupSystem
        const basicPowerups = {
            recombine: { icon: '🔄', name: 'Recombine', description: 'Merge all cells', cost: 100 },
            speedBoost: { icon: '⚡', name: 'Speed Boost', description: 'Temporary speed increase', cost: 50 },
            massShield: { icon: '🛡️', name: 'Mass Shield', description: 'Damage reduction', cost: 150 },
            splitBoost: { icon: '💥', name: 'Split Boost', description: 'Faster splitting', cost: 75 },
            magnetism: { icon: '🧲', name: 'Magnetism', description: 'Attract nearby food', cost: 80 }
        };
        
        // Create powerup buttons
        Object.entries(basicPowerups).forEach(([id, powerup], index) => {
            const button = this.createPowerupButton(id, powerup, index);
            this.powerupButtons.push(button);
            this.elements.powerupBar.appendChild(button.element);
        });
    }
    
    createPowerupButton(powerupId, powerup, index) {
        const button = this.createElement('div', 'powerup-button');
        button.dataset.powerupId = powerupId;
        
        // Get key binding
        const keyCode = Object.keys(this.keyBindings)[index];
        const key = keyCode ? keyCode.replace('Key', '') : (index + 1).toString();
        
        button.innerHTML = `
            <div class="powerup-icon">${powerup.icon}</div>
            <div class="powerup-key">${key}</div>
            <div class="powerup-cooldown" id="cooldown-${powerupId}"></div>
            <div class="powerup-cost">${powerup.cost}</div>
        `;
        
        // Add click handler
        button.addEventListener('click', () => {
            this.usePowerup(powerupId);
        });
        
        // Add hover tooltip
        button.title = `${powerup.name}: ${powerup.description}`;
        
        return {
            element: button,
            powerupId: powerupId,
            cooldownElement: button.querySelector(`#cooldown-${powerupId}`)
        };
    }
    
    createMenuPanels() {
        // Main menu
        this.panels.mainMenu = this.createElement('div', 'panel main-menu');
        this.panels.mainMenu.innerHTML = `
            <div class="panel-header">
                <h2>Agar.io Clone</h2>
            </div>
            <div class="panel-content">
                <input type="text" id="player-name" placeholder="Enter your name..." maxlength="15">
                <button id="play-button" class="btn btn-primary">Play</button>
                <button id="shop-button" class="btn btn-secondary">Shop</button>
                <button id="settings-button" class="btn btn-secondary">Settings</button>
            </div>
        `;
        this.elements.uiContainer.appendChild(this.panels.mainMenu);
        
        // Shop panel
        this.panels.shop = this.createElement('div', 'panel shop-panel hidden');
        this.panels.shop.innerHTML = `
            <div class="panel-header">
                <h2>Shop</h2>
                <button id="close-shop" class="btn btn-close">×</button>
            </div>
            <div class="panel-content">
                <div class="shop-tabs">
                    <button class="shop-tab active" data-tab="powerups">Powerups</button>
                    <button class="shop-tab" data-tab="bots">Bots</button>
                    <button class="shop-tab" data-tab="premium">Premium</button>
                </div>
                <div class="shop-content" id="shop-content">
                    <!-- Shop items will be populated dynamically -->
                </div>
            </div>
        `;
        this.elements.uiContainer.appendChild(this.panels.shop);
        
        // Settings panel
        this.panels.settings = this.createElement('div', 'panel settings-panel hidden');
        this.panels.settings.innerHTML = `
            <div class="panel-header">
                <h2>Settings</h2>
                <button id="close-settings" class="btn btn-close">×</button>
            </div>
            <div class="panel-content">
                <div class="setting-group">
                    <label for="mouse-sensitivity">Mouse Sensitivity</label>
                    <input type="range" id="mouse-sensitivity" min="0.1" max="2" step="0.1" value="1">
                </div>
                <div class="setting-group">
                    <label for="show-grid">Show Grid</label>
                    <input type="checkbox" id="show-grid" checked>
                </div>
                <div class="setting-group">
                    <label for="show-mass">Show Mass</label>
                    <input type="checkbox" id="show-mass" checked>
                </div>
                <div class="setting-group">
                    <label for="sound-enabled">Sound Effects</label>
                    <input type="checkbox" id="sound-enabled" checked>
                </div>
            </div>
        `;
        this.elements.uiContainer.appendChild(this.panels.settings);
    }
    
    createGameOverScreen() {
        this.elements.gameOverScreen = this.createElement('div', 'panel game-over-screen hidden');
        this.elements.gameOverScreen.innerHTML = `
            <div class="panel-header">
                <h2>Game Over</h2>
            </div>
            <div class="panel-content">
                <div class="game-over-stats">
                    <div class="stat-item">
                        <span class="stat-label">Final Mass:</span>
                        <span class="stat-value" id="final-mass">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Survival Time:</span>
                        <span class="stat-value" id="survival-time">0:00</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Cells Consumed:</span>
                        <span class="stat-value" id="cells-consumed">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Coins Earned:</span>
                        <span class="stat-value" id="coins-earned">0</span>
                    </div>
                </div>
                <div class="game-over-buttons">
                    <button id="play-again-button" class="btn btn-primary">Play Again</button>
                    <button id="main-menu-button" class="btn btn-secondary">Main Menu</button>
                </div>
            </div>
        `;
        this.elements.uiContainer.appendChild(this.elements.gameOverScreen);
    }
    
    createLeaderboard() {
        this.elements.leaderboard = this.createElement('div', 'leaderboard');
        this.elements.leaderboard.innerHTML = `
            <div class="leaderboard-header">
                <h3>Leaderboard</h3>
            </div>
            <div class="leaderboard-content" id="leaderboard-content">
                <!-- Leaderboard entries will be populated dynamically -->
            </div>
        `;
        this.elements.uiContainer.appendChild(this.elements.leaderboard);
    }
    
    createErrorDisplay() {
        this.elements.errorDisplay = this.createElement('div', 'error-display hidden');
        this.elements.errorDisplay.innerHTML = `
            <div class="error-content">
                <h3>Error</h3>
                <p id="error-message">An error occurred</p>
                <button id="error-close" class="btn btn-secondary">Close</button>
            </div>
        `;
        this.elements.uiContainer.appendChild(this.elements.errorDisplay);
        
        // Add close event listener
        document.getElementById('error-close')?.addEventListener('click', () => {
            this.hideError();
        });
    }
    
    setupEventListeners() {
        // Main menu events
        document.getElementById('play-button')?.addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('shop-button')?.addEventListener('click', () => {
            this.showPanel('shop');
        });
        
        document.getElementById('settings-button')?.addEventListener('click', () => {
            this.showPanel('settings');
        });
        
        // Panel close events
        document.getElementById('close-shop')?.addEventListener('click', () => {
            this.hidePanel('shop');
        });
        
        document.getElementById('close-settings')?.addEventListener('click', () => {
            this.hidePanel('settings');
        });
        
        // Game over events
        document.getElementById('play-again-button')?.addEventListener('click', () => {
            this.restartGame();
        });
        
        document.getElementById('main-menu-button')?.addEventListener('click', () => {
            this.showMainMenu();
        });
        
        // Shop tab events
        document.querySelectorAll('.shop-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchShopTab(e.target.dataset.tab);
            });
        });
        
        // Settings events
        document.getElementById('mouse-sensitivity')?.addEventListener('input', (e) => {
            if (this.game.settings) {
                this.game.settings.mouseSensitivity = parseFloat(e.target.value);
            }
        });
        
        document.getElementById('show-grid')?.addEventListener('change', (e) => {
            if (this.game.settings) {
                this.game.settings.showGrid = e.target.checked;
            }
        });
        
        document.getElementById('show-mass')?.addEventListener('change', (e) => {
            if (this.game.settings) {
                this.game.settings.showMass = e.target.checked;
            }
        });
        
        document.getElementById('sound-enabled')?.addEventListener('change', (e) => {
            if (this.game.settings) {
                this.game.settings.soundEnabled = e.target.checked;
            }
        });
    }
    
    setupKeyBindings() {
        document.addEventListener('keydown', (e) => {
            if (this.game.gameState !== 'playing') return;
            
            const powerupId = this.keyBindings[e.code];
            if (powerupId) {
                e.preventDefault();
                this.usePowerup(powerupId);
            }
        });
    }
    
    // UI State Management Methods (MISSING METHODS ADDED)
    showMenu() {
        this.showMainMenu();
    }
    
    hideMenu() {
        this.hideAllPanels();
    }
    
    showError(message) {
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.textContent = message;
        }
        
        if (this.elements.errorDisplay) {
            this.elements.errorDisplay.classList.remove('hidden');
        }
        
        console.error('UI Error:', message);
    }
    
    hideError() {
        if (this.elements.errorDisplay) {
            this.elements.errorDisplay.classList.add('hidden');
        }
    }
    
    showPanel(panelName) {
        // Hide current panel
        if (this.currentPanel) {
            this.panels[this.currentPanel].classList.add('hidden');
        }
        
        // Show new panel
        if (this.panels[panelName]) {
            this.panels[panelName].classList.remove('hidden');
            this.currentPanel = panelName;
        }
        
        // Update shop content if opening shop
        if (panelName === 'shop') {
            this.updateShopContent();
        }
    }
    
    hidePanel(panelName) {
        if (this.panels[panelName]) {
            this.panels[panelName].classList.add('hidden');
            if (this.currentPanel === panelName) {
                this.currentPanel = null;
            }
        }
    }
    
    showMainMenu() {
        this.hideAllPanels();
        this.panels.mainMenu.classList.remove('hidden');
        this.currentPanel = 'mainMenu';
        
        // Hide game HUD
        if (this.elements.hud) {
            this.elements.hud.classList.add('hidden');
        }
        if (this.elements.powerupBar) {
            this.elements.powerupBar.classList.add('hidden');
        }
        if (this.elements.leaderboard) {
            this.elements.leaderboard.classList.add('hidden');
        }
    }
    
    hideAllPanels() {
        Object.values(this.panels).forEach(panel => {
            panel.classList.add('hidden');
        });
        this.currentPanel = null;
    }
    
    // Game State Management
    startGame() {
        const playerName = document.getElementById('player-name')?.value || 'Anonymous';
        
        // Hide main menu
        this.hideAllPanels();
        
        // Show game HUD
        if (this.elements.hud) {
            this.elements.hud.classList.remove('hidden');
        }
        if (this.elements.powerupBar) {
            this.elements.powerupBar.classList.remove('hidden');
        }
        if (this.elements.leaderboard) {
            this.elements.leaderboard.classList.remove('hidden');
        }
        
        // Start the game
        if (this.game && this.game.startGame) {
            this.game.startGame(playerName);
        }
    }
    
    restartGame() {
        this.hidePanel('gameOverScreen');
        this.startGame();
    }
    
    showGameOver(stats) {
        // Update game over stats
        const finalMassEl = document.getElementById('final-mass');
        const survivalTimeEl = document.getElementById('survival-time');
        const cellsConsumedEl = document.getElementById('cells-consumed');
        const coinsEarnedEl = document.getElementById('coins-earned');
        
        if (finalMassEl) finalMassEl.textContent = Math.floor(stats.finalMass || 0);
        if (survivalTimeEl) survivalTimeEl.textContent = this.formatTime(stats.survivalTime || 0);
        if (cellsConsumedEl) cellsConsumedEl.textContent = stats.cellsConsumed || 0;
        if (coinsEarnedEl) coinsEarnedEl.textContent = stats.coinsEarned || 0;
        
        // Show game over screen
        this.showPanel('gameOverScreen');
    }
    
    // Update Methods
    update(player) {
        if (!player) return;
        
        this.updateHUD(player);
        this.updatePowerupBar(player);
        this.updateLeaderboard();
    }
    
    updateHUD(player) {
        // Update mass
        const massValueEl = document.getElementById('mass-value');
        if (massValueEl) {
            massValueEl.textContent = Math.floor(player.totalMass || player.mass || 0);
        }
        
        // Update level
        const levelValueEl = document.getElementById('level-value');
        if (levelValueEl) {
            levelValueEl.textContent = player.level || 1;
        }
        
        // Update currency
        const coinsValueEl = document.getElementById('coins-value');
        if (coinsValueEl) {
            coinsValueEl.textContent = player.coins || 0;
        }
        
        const platinumValueEl = document.getElementById('platinum-value');
        if (platinumValueEl) {
            platinumValueEl.textContent = player.platinumCoins || 0;
        }
        
        // Update XP bar
        const xpFill = document.getElementById('xp-fill');
        const xpText = document.getElementById('xp-text');
        
        if (xpFill && xpText) {
            const currentXP = player.experience || 0;
            const level = player.level || 1;
            const xpNeeded = level * 100; // Simple XP calculation
            const levelXP = (level - 1) * 100;
            
            const progress = Math.max(0, Math.min(1, (currentXP - levelXP) / (xpNeeded - levelXP)));
            xpFill.style.width = `${progress * 100}%`;
            xpText.textContent = `${currentXP} / ${xpNeeded} XP`;
        }
    }
    
    updatePowerupBar(player) {
        this.powerupButtons.forEach(button => {
            const powerupId = button.powerupId;
            
            // Simple cooldown simulation - you can enhance this later
            const canUse = true; // Placeholder
            const cooldownRemaining = 0; // Placeholder
            
            // Update button state
            if (canUse && cooldownRemaining === 0) {
                button.element.classList.remove('disabled', 'cooldown');
            } else if (cooldownRemaining > 0) {
                button.element.classList.add('disabled', 'cooldown');
                if (button.cooldownElement) {
                    button.cooldownElement.textContent = Math.ceil(cooldownRemaining / 1000);
                }
            } else {
                button.element.classList.add('disabled');
                button.element.classList.remove('cooldown');
                if (button.cooldownElement) {
                    button.cooldownElement.textContent = '';
                }
            }
        });
    }
    
    updateLeaderboard() {
        const leaderboardContent = document.getElementById('leaderboard-content');
        if (!leaderboardContent) return;
        
        // Get players from game or create mock data
        let players = [];
        if (this.game && this.game.getAllPlayers) {
            players = this.game.getAllPlayers();
        } else {
            // Mock leaderboard data
            players = [
                { name: 'You', totalMass: 100, isLocalPlayer: true },
                { name: 'Bot1', totalMass: 80, isLocalPlayer: false },
                { name: 'Bot2', totalMass: 60, isLocalPlayer: false }
            ];
        }
        
        players = players
            .sort((a, b) => (b.totalMass || b.mass || 0) - (a.totalMass || a.mass || 0))
            .slice(0, 10);
        
        leaderboardContent.innerHTML = players.map((player, index) => `
            <div class="leaderboard-entry ${player.isLocalPlayer ? 'local-player' : ''}">
                <span class="rank">${index + 1}</span>
                <span class="name">${player.name}</span>
                <span class="mass">${Math.floor(player.totalMass || player.mass || 0)}</span>
            </div>
        `).join('');
    }
    
    updateShopContent() {
        const shopContent = document.getElementById('shop-content');
        if (!shopContent) return;
        
        const activeTab = document.querySelector('.shop-tab.active')?.dataset.tab || 'powerups';
        
        switch (activeTab) {
            case 'powerups':
                this.renderPowerupShop(shopContent);
                break;
            case 'bots':
                this.renderBotShop(shopContent);
                break;
            case 'premium':
                this.renderPremiumShop(shopContent);
                break;
        }
    }
    
    renderPowerupShop(container) {
        const powerups = {
            recombine: { icon: '🔄', name: 'Recombine', description: 'Merge all cells instantly', cost: 100, currency: 'coins' },
            speedBoost: { icon: '⚡', name: 'Speed Boost', description: 'Temporary speed increase', cost: 50, currency: 'coins' },
            massShield: { icon: '🛡️', name: 'Mass Shield', description: 'Damage reduction for 15 seconds', cost: 150, currency: 'coins' }
        };
        
        container.innerHTML = Object.entries(powerups).map(([id, powerup]) => `
            <div class="shop-item">
                <div class="item-icon">${powerup.icon}</div>
                <div class="item-info">
                    <h4>${powerup.name}</h4>
                    <p>${powerup.description}</p>
                    <div class="item-cost">
                        <span class="cost">${powerup.cost}</span>
                        <span class="currency">${powerup.currency === 'coins' ? '🪙' : '💎'}</span>
                    </div>
                </div>
                <button class="btn btn-primary" onclick="alert('Purchase feature coming soon!')">
                    Buy
                </button>
            </div>
        `).join('');
    }
    
    renderBotShop(container) {
        container.innerHTML = `
            <div class="shop-item">
                <div class="item-icon">🤖</div>
                <div class="item-info">
                    <h4>Defender Bot</h4>
                    <p>AI companion that protects you</p>
                    <div class="item-cost">
                        <span class="cost">500</span>
                        <span class="currency">🪙</span>
                    </div>
                </div>
                <button class="btn btn-primary" onclick="alert('Bot system coming soon!')">
                    Buy
                </button>
            </div>
        `;
    }
    
    renderPremiumShop(container) {
        container.innerHTML = `
            <div class="shop-item">
                <div class="item-icon">🎨</div>
                <div class="item-info">
                    <h4>Custom Skin</h4>
                    <p>Unique appearance for your cell</p>
                    <div class="item-cost">
                        <span class="cost">5</span>
                        <span class="currency">💎</span>
                    </div>
                </div>
                <button class="btn btn-primary" onclick="alert('Premium features coming soon!')">
                    Buy
                </button>
            </div>
        `;
    }
    
    switchShopTab(tab) {
        document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
        const targetTab = document.querySelector(`[data-tab="${tab}"]`);
        if (targetTab) {
            targetTab.classList.add('active');
        }
        this.updateShopContent();
    }
    
    // Helper Methods
    usePowerup(powerupId) {
        if (!this.game.player) return;
        
        console.log(`Using powerup: ${powerupId}`);
        
        // Simple powerup effects for now
        switch (powerupId) {
            case 'recombine':
                // Placeholder - merge cells
                console.log('Recombine activated!');
                break;
            case 'speedBoost':
                // Placeholder - increase speed
                console.log('Speed boost activated!');
                break;
            case 'massShield':
                // Placeholder - damage reduction
                console.log('Mass shield activated!');
                break;
            default:
                console.log(`Unknown powerup: ${powerupId}`);
        }
        
        // Show activation effect
        this.showPowerupActivation({ icon: '⚡', name: powerupId });
    }
    
    createElement(tag, className = '') {
        const element = document.createElement(tag);
        if (className) {
            element.className = className;
        }
        return element;
    }
    
    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    // Event handlers for external calls
    onPowerupUsed(data) {
        // Visual feedback for powerup usage
        this.showPowerupActivation(data.powerup);
    }
    
    showPowerupActivation(powerup) {
        // Create temporary visual effect
        const effect = this.createElement('div', 'powerup-activation');
        effect.textContent = `${powerup.icon || '⚡'} ${powerup.name} Activated!`;
        effect.style.position = 'fixed';
        effect.style.top = '50%';
        effect.style.left = '50%';
        effect.style.transform = 'translate(-50%, -50%)';
        effect.style.zIndex = '1000';
        effect.style.background = 'rgba(0, 0, 0, 0.8)';
        effect.style.color = 'white';
        effect.style.padding = '10px 20px';
        effect.style.borderRadius = '5px';
        effect.style.fontSize = '18px';
        effect.style.fontWeight = 'bold';
        
        document.body.appendChild(effect);
        
        setTimeout(() => {
            effect.remove();
        }, 2000);
    }
    
    // Additional methods that might be called by the game
    showHUD() {
        if (this.elements.hud) {
            this.elements.hud.classList.remove('hidden');
        }
        if (this.elements.powerupBar) {
            this.elements.powerupBar.classList.remove('hidden');
        }
        if (this.elements.leaderboard) {
            this.elements.leaderboard.classList.remove('hidden');
        }
    }
    
    hideHUD() {
        if (this.elements.hud) {
            this.elements.hud.classList.add('hidden');
        }
        if (this.elements.powerupBar) {
            this.elements.powerupBar.classList.add('hidden');
        }
        if (this.elements.leaderboard) {
            this.elements.leaderboard.classList.add('hidden');
        }
    }
    
    setLoadingMessage(message) {
        console.log('Loading:', message);
        // You can add a loading screen later if needed
    }
}
