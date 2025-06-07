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
        this.createUIElements();
        this.setupEventListeners();
        this.setupKeyBindings();
        this.isInitialized = true;
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
        
        // Get powerups from game
        const powerups = this.game.powerupSystem.getAllPowerups();
        
        // Create powerup buttons
        Object.entries(powerups).forEach(([id, powerup], index) => {
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
            this.game.settings.mouseSensitivity = parseFloat(e.target.value);
        });
        
        document.getElementById('show-grid')?.addEventListener('change', (e) => {
            this.game.settings.showGrid = e.target.checked;
        });
        
        document.getElementById('show-mass')?.addEventListener('change', (e) => {
            this.game.settings.showMass = e.target.checked;
        });
        
        document.getElementById('sound-enabled')?.addEventListener('change', (e) => {
            this.game.settings.soundEnabled = e.target.checked;
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
    
    // UI State Management
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
        this.elements.hud.classList.add('hidden');
        this.elements.powerupBar.classList.add('hidden');
        this.elements.leaderboard.classList.add('hidden');
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
        this.elements.hud.classList.remove('hidden');
        this.elements.powerupBar.classList.remove('hidden');
        this.elements.leaderboard.classList.remove('hidden');
        
        // Start the game
        this.game.startGame(playerName);
    }
    
    restartGame() {
        this.hidePanel('gameOverScreen');
        this.startGame();
    }
    
    showGameOver(stats) {
        // Update game over stats
        document.getElementById('final-mass').textContent = Math.floor(stats.finalMass);
        document.getElementById('survival-time').textContent = this.formatTime(stats.survivalTime);
        document.getElementById('cells-consumed').textContent = stats.cellsConsumed;
        document.getElementById('coins-earned').textContent = stats.coinsEarned;
        
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
        document.getElementById('mass-value').textContent = Math.floor(player.totalMass);
        
        // Update level
        document.getElementById('level-value').textContent = player.level;
        
        // Update currency
        document.getElementById('coins-value').textContent = player.coins;
        document.getElementById('platinum-value').textContent = player.platinumCoins;
        
        // Update XP bar
        const xpFill = document.getElementById('xp-fill');
        const xpText = document.getElementById('xp-text');
        
        const xpNeeded = this.game.progressionSystem.getXPNeededForLevel(player.level + 1);
        const currentXP = player.experience;
        const levelXP = this.game.progressionSystem.getXPNeededForLevel(player.level);
        
        const progress = (currentXP - levelXP) / (xpNeeded - levelXP);
        xpFill.style.width = `${Math.max(0, Math.min(100, progress * 100))}%`;
        xpText.textContent = `${currentXP} / ${xpNeeded} XP`;
    }
    
    updatePowerupBar(player) {
        this.powerupButtons.forEach(button => {
            const powerupId = button.powerupId;
            const canUse = this.game.powerupSystem.canUsePowerup(player, powerupId);
            const cooldownRemaining = this.game.powerupSystem.getCooldownRemaining(powerupId);
            
            // Update button state
            if (canUse && cooldownRemaining === 0) {
                button.element.classList.remove('disabled', 'cooldown');
            } else if (cooldownRemaining > 0) {
                button.element.classList.add('disabled', 'cooldown');
                button.cooldownElement.textContent = Math.ceil(cooldownRemaining / 1000);
            } else {
                button.element.classList.add('disabled');
                button.element.classList.remove('cooldown');
                button.cooldownElement.textContent = '';
            }
        });
    }
    
    updateLeaderboard() {
        const leaderboardContent = document.getElementById('leaderboard-content');
        if (!leaderboardContent) return;
        
        const players = this.game.getAllPlayers()
            .sort((a, b) => b.totalMass - a.totalMass)
            .slice(0, 10);
        
        leaderboardContent.innerHTML = players.map((player, index) => `
            <div class="leaderboard-entry ${player.isLocalPlayer ? 'local-player' : ''}">
                <span class="rank">${index + 1}</span>
                <span class="name">${player.name}</span>
                <span class="mass">${Math.floor(player.totalMass)}</span>
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
        const powerups = this.game.powerupSystem.getAllPowerups();
        
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
                <button class="btn btn-primary" onclick="window.game.ui.purchaseItem('${id}', 'powerup')">
                    Buy
                </button>
            </div>
        `).join('');
    }
    
    switchShopTab(tab) {
        document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        this.updateShopContent();
    }
    
    // Helper Methods
    usePowerup(powerupId) {
        if (!this.game.player) return;
        
        const mousePos = this.game.input.getMousePosition();
        this.game.powerupSystem.usePowerup(
            this.game.player, 
            powerupId, 
            mousePos.x, 
            mousePos.y
        );
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
        effect.textContent = `${powerup.icon} ${powerup.name} Activated!`;
        effect.style.position = 'fixed';
        effect.style.top = '50%';
        effect.style.left = '50%';
        effect.style.transform = 'translate(-50%, -50%)';
        effect.style.zIndex = '1000';
        
        document.body.appendChild(effect);
        
        setTimeout(() => {
            effect.remove();
        }, 2000);
    }
}
