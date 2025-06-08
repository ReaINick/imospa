// js/ui/HUD.js
import { gameEvents } from '../core/EventSystem.js';
import { Utils } from '../utils/Utils.js';

export class HUD {
    constructor(game = null) {
        this.game = game;
        this.canvas = null;
        this.ctx = null;
        this.player = null;
        this.gameStats = {
            fps: 0,
            ping: 0,
            playerCount: 0
        };
        
        this.elements = {
            massDisplay: { x: 20, y: 30, visible: true },
            levelDisplay: { x: 20, y: 60, visible: true },
            currencyDisplay: { x: 20, y: 90, visible: true },
            leaderboard: { x: 0, y: 20, visible: true }, // Will be updated in updateElementPositions
            minimap: { x: 0, y: 0, visible: true }, // Will be updated in updateElementPositions
            powerupBar: { x: 0, y: 0, visible: true }, // Will be updated in updateElementPositions
            chatBox: { x: 20, y: 0, visible: false } // Will be updated in updateElementPositions
        };
        
        this.minimap = {
            size: 120,
            scale: 0.1,
            borderColor: '#333',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            playerColor: '#ff0000',
            enemyColor: '#ffffff',
            foodColor: '#00ff00'
        };
        
        this.powerupIcons = {
            recombine: '🔄',
            speedBoost: '⚡',
            massShield: '🛡️',
            splitBoost: '💥',
            magnetism: '🧲'
        };
        
        this.chatMessages = [];
        this.maxChatMessages = 5;
        this.chatInputActive = false;
        this.notifications = [];
        
        this.setupEventListeners();
    }
    
    // Initialize with canvas after it's available
    initialize(canvas) {
        this.canvas = canvas;
        this.ctx = canvas ? canvas.getContext('2d') : null;
        this.updateElementPositions();
    }
    
    // Set the game instance if not provided in constructor
    setGame(game) {
        this.game = game;
    }
    
    setupEventListeners() {
        gameEvents.on('playerStatsUpdated', (data) => {
            this.updatePlayerStats(data);
        });
        
        gameEvents.on('gameStatsUpdated', (stats) => {
            this.gameStats = { ...this.gameStats, ...stats };
        });
        
        gameEvents.on('chatMessage', (message) => {
            this.addChatMessage(message);
        });
        
        gameEvents.on('powerup.activated', (data) => {
            this.showPowerupNotification(data);
        });
        
        gameEvents.on('player.levelUp', (data) => {
            this.showLevelUpEffect(data);
        });
    }
    
    setPlayer(player) {
        this.player = player;
    }
    
    update(deltaTime) {
        // Update any animated elements
        this.updateAnimations(deltaTime);
        
        // Update element positions for responsive design
        this.updateElementPositions();
    }
    
    render(camera, worldEntities) {
        if (!this.ctx || !this.canvas) return;
        
        this.ctx.save();
        
        // Render HUD elements
        if (this.elements.massDisplay.visible) {
            this.renderMassDisplay();
        }
        
        if (this.elements.levelDisplay.visible) {
            this.renderLevelDisplay();
        }
        
        if (this.elements.currencyDisplay.visible) {
            this.renderCurrencyDisplay();
        }
        
        if (this.elements.leaderboard.visible) {
            this.renderLeaderboardPreview();
        }
        
        if (this.elements.minimap.visible) {
            this.renderMinimap(camera, worldEntities);
        }
        
        if (this.elements.powerupBar.visible) {
            this.renderPowerupBar();
        }
        
        if (this.elements.chatBox.visible) {
            this.renderChatBox();
        }
        
        // Render debug info if enabled
        this.renderDebugInfo();
        
        // Render notifications
        this.renderNotifications();
        
        this.ctx.restore();
    }
    
    renderMassDisplay() {
        if (!this.player) return;
        
        const pos = this.elements.massDisplay;
        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        
        const massText = `Mass: ${Math.floor(this.player.totalMass || this.player.mass || 0)}`;
        this.ctx.strokeText(massText, pos.x, pos.y);
        this.ctx.fillText(massText, pos.x, pos.y);
    }
    
    renderLevelDisplay() {
        if (!this.player) return;
        
        const pos = this.elements.levelDisplay;
        this.ctx.font = 'bold 20px Arial';
        this.ctx.fillStyle = '#ffff00';
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 2;
        
        const levelText = `Level: ${this.player.level || 1}`;
        this.ctx.strokeText(levelText, pos.x, pos.y);
        this.ctx.fillText(levelText, pos.x, pos.y);
        
        // Experience bar
        const barWidth = 200;
        const barHeight = 8;
        const barX = pos.x;
        const barY = pos.y + 5;
        
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Progress
        const experience = this.player.experience || 0;
        const experienceToNext = this.player.experienceToNext || 100;
        const progress = Math.min(1, experience / experienceToNext);
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(barX, barY, barWidth * progress, barHeight);
        
        // Border
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
    
    renderCurrencyDisplay() {
        if (!this.player) return;
        
        const pos = this.elements.currencyDisplay;
        this.ctx.font = 'bold 16px Arial';
        
        // Coins
        this.ctx.fillStyle = '#ffd700';
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 1;
        
        const coinsText = `💰 ${this.player.coins || 0}`;
        this.ctx.strokeText(coinsText, pos.x, pos.y);
        this.ctx.fillText(coinsText, pos.x, pos.y);
        
        // Platinum coins
        this.ctx.fillStyle = '#c0c0c0';
        const platinumText = `💎 ${this.player.platinumCoins || 0}`;
        this.ctx.strokeText(platinumText, pos.x, pos.y + 20);
        this.ctx.fillText(platinumText, pos.x, pos.y + 20);
    }
    
    renderLeaderboardPreview() {
        const pos = this.elements.leaderboard;
        const width = 180;
        const height = 200;
        
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(pos.x, pos.y, width, height);
        
        // Border
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(pos.x, pos.y, width, height);
        
        // Title
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Leaderboard', pos.x + width / 2, pos.y + 20);
        
        // Get top players (mock data for now)
        const topPlayers = this.getTopPlayers();
        
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        
        topPlayers.forEach((player, index) => {
            const y = pos.y + 40 + index * 20;
            const rank = index + 1;
            
            // Rank color
            let rankColor = '#ffffff';
            if (rank === 1) rankColor = '#ffd700';
            else if (rank === 2) rankColor = '#c0c0c0';
            else if (rank === 3) rankColor = '#cd7f32';
            
            this.ctx.fillStyle = rankColor;
            this.ctx.fillText(`${rank}. ${player.name}`, pos.x + 10, y);
            this.ctx.fillText(Math.floor(player.mass), pos.x + width - 50, y);
        });
        
        // Reset text align
        this.ctx.textAlign = 'left';
    }
    
    renderMinimap(camera, worldEntities) {
        if (!camera || !worldEntities) return;
        
        const pos = this.elements.minimap;
        const size = this.minimap.size;
        
        // Background
        this.ctx.fillStyle = this.minimap.backgroundColor;
        this.ctx.fillRect(pos.x, pos.y, size, size);
        
        // Border
        this.ctx.strokeStyle = this.minimap.borderColor;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(pos.x, pos.y, size, size);
        
        if (!this.player) return;
        
        const scale = this.minimap.scale;
        const centerX = pos.x + size / 2;
        const centerY = pos.y + size / 2;
        
        // Render world bounds
        this.ctx.strokeStyle = '#444';
        this.ctx.lineWidth = 1;
        const worldSize = 2000; // From config
        const mapSize = worldSize * scale;
        this.ctx.strokeRect(
            centerX - mapSize / 2,
            centerY - mapSize / 2,
            mapSize,
            mapSize
        );
        
        // Render entities
        worldEntities.forEach(entity => {
            const playerX = this.player.x || 0;
            const playerY = this.player.y || 0;
            const mapX = centerX + ((entity.x || 0) - playerX) * scale;
            const mapY = centerY + ((entity.y || 0) - playerY) * scale;
            
            // Only render if within minimap bounds
            if (mapX >= pos.x && mapX <= pos.x + size && 
                mapY >= pos.y && mapY <= pos.y + size) {
                
                let color = this.minimap.enemyColor;
                let radius = 2;
                
                if (entity.type === 'food') {
                    color = this.minimap.foodColor;
                    radius = 1;
                } else if (entity === this.player || 
                          (entity.owner && entity.owner === this.player)) {
                    color = this.minimap.playerColor;
                    radius = Math.max(2, (entity.radius || 10) * scale);
                }
                
                this.ctx.fillStyle = color;
                this.ctx.beginPath();
                this.ctx.arc(mapX, mapY, radius, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
        
        // Render player position
        this.ctx.fillStyle = this.minimap.playerColor;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Render viewport indicator
        if (camera.viewport) {
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 1;
            const viewportSize = Math.min(camera.viewport.width || 800, camera.viewport.height || 600) * scale / 2;
            this.ctx.strokeRect(
                centerX - viewportSize / 2,
                centerY - viewportSize / 2,
                viewportSize,
                viewportSize
            );
        }
    }
    
    renderPowerupBar() {
        if (!this.player) return;
        
        const pos = this.elements.powerupBar;
        const powerups = this.player.availablePowerups || [];
        const iconSize = 40;
        const iconSpacing = 50;
        
        powerups.forEach((powerup, index) => {
            const x = pos.x + index * iconSpacing;
            const y = pos.y;
            
            // Background circle
            this.ctx.fillStyle = powerup.available ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)';
            this.ctx.beginPath();
            this.ctx.arc(x + iconSize / 2, y + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Icon
            this.ctx.font = '24px Arial';
            this.ctx.fillStyle = '#ffffff';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(
                this.powerupIcons[powerup.id] || '?',
                x + iconSize / 2,
                y + iconSize / 2 + 8
            );
            
            // Cooldown overlay
            if (!powerup.available && powerup.cooldownRemaining > 0) {
                const cooldownProgress = 1 - (powerup.cooldownRemaining / powerup.maxCooldown);
                
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                this.ctx.beginPath();
                this.ctx.arc(x + iconSize / 2, y + iconSize / 2, iconSize / 2, 
                           -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * cooldownProgress));
                this.ctx.lineTo(x + iconSize / 2, y + iconSize / 2);
                this.ctx.fill();
                
                // Cooldown text
                this.ctx.font = '12px Arial';
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillText(
                    Math.ceil(powerup.cooldownRemaining / 1000),
                    x + iconSize / 2,
                    y + iconSize / 2 + 4
                );
            }
            
            // Keybind
            this.ctx.font = '10px Arial';
            this.ctx.fillStyle = '#cccccc';
            this.ctx.fillText(`${index + 1}`, x + iconSize / 2, y + iconSize + 15);
        });
        
        // Reset text align
        this.ctx.textAlign = 'left';
    }
    
    renderChatBox() {
        const pos = this.elements.chatBox;
        const width = 300;
        const height = 120;
        
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(pos.x, pos.y, width, height);
        
        // Messages
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#ffffff';
        
        this.chatMessages.slice(-this.maxChatMessages).forEach((message, index) => {
            const y = pos.y + 15 + index * 15;
            this.ctx.fillText(`${message.player}: ${message.text}`, pos.x + 5, y);
        });
        
        // Input box if active
        if (this.chatInputActive) {
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(pos.x, pos.y + height - 20, width, 20);
            
            this.ctx.fillStyle = '#333333';
            this.ctx.fillRect(pos.x + 1, pos.y + height - 19, width - 2, 18);
        }
    }
    
    renderDebugInfo() {
        if (!this.gameStats.showDebug) return;
        
        const debugInfo = [
            `FPS: ${this.gameStats.fps}`,
            `Players: ${this.gameStats.playerCount}`,
            `Entities: ${this.gameStats.entityCount || 0}`,
            `Memory: ${this.getMemoryUsage()}`
        ];
        
        this.ctx.font = '12px monospace';
        this.ctx.fillStyle = '#00ff00';
        this.ctx.strokeStyle = '#000000';
        this.ctx.lineWidth = 1;
        
        debugInfo.forEach((info, index) => {
            const y = this.canvas.height - 100 + index * 15;
            this.ctx.strokeText(info, 10, y);
            this.ctx.fillText(info, 10, y);
        });
    }
    
    renderNotifications() {
        // Render temporary notifications like level ups, achievements, etc.
        if (this.notifications && this.notifications.length > 0) {
            this.notifications.forEach((notification, index) => {
                this.renderNotification(notification, index);
            });
        }
    }
    
    renderNotification(notification, index) {
        const x = this.canvas.width / 2;
        const y = 100 + index * 60;
        const alpha = Math.max(0, 1 - (Date.now() - notification.startTime) / notification.duration);
        
        this.ctx.save();
        this.ctx.globalAlpha = alpha;
        
        // Background
        this.ctx.fillStyle = notification.backgroundColor || 'rgba(0, 0, 0, 0.8)';
        this.ctx.font = notification.font || 'bold 18px Arial';
        const textWidth = this.ctx.measureText(notification.text).width;
        this.ctx.fillRect(x - textWidth / 2 - 20, y - 20, textWidth + 40, 40);
        
        // Text
        this.ctx.fillStyle = notification.color || '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(notification.text, x, y + 5);
        
        this.ctx.restore();
        
        // Reset text align
        this.ctx.textAlign = 'left';
    }
    
    // Utility methods
    updatePlayerStats(data) {
        if (this.player) {
            Object.assign(this.player, data);
        }
    }
    
    updateAnimations(deltaTime) {
        // Update notification animations
        if (this.notifications) {
            this.notifications = this.notifications.filter(notification => {
                return Date.now() - notification.startTime < notification.duration;
            });
        }
    }
    
    updateElementPositions() {
        if (!this.canvas) return;
        
        // Responsive positioning
        this.elements.leaderboard.x = this.canvas.width - 200;
        this.elements.minimap.x = this.canvas.width - 150;
        this.elements.minimap.y = this.canvas.height - 150;
        this.elements.powerupBar.x = this.canvas.width / 2 - 200;
        this.elements.powerupBar.y = this.canvas.height - 60;
        this.elements.chatBox.y = this.canvas.height - 150;
    }
    
    getTopPlayers() {
        // Mock data - in real game, get from game state
        return [
            { name: 'Player1', mass: 1250 },
            { name: 'Bot_Alpha', mass: 890 },
            { name: 'Player2', mass: 675 },
            { name: 'Bot_Beta', mass: 450 },
            { name: 'Player3', mass: 320 }
        ];
    }
    
    getMemoryUsage() {
        if (performance.memory) {
            return `${Math.round(performance.memory.usedJSHeapSize / 1024 / 1024)}MB`;
        }
        return 'N/A';
    }
    
    addChatMessage(message) {
        this.chatMessages.push({
            ...message,
            timestamp: Date.now()
        });
        
        if (this.chatMessages.length > 50) {
            this.chatMessages.shift();
        }
    }
    
    showPowerupNotification(data) {
        if (!this.notifications) this.notifications = [];
        
        this.notifications.push({
            text: `${data.powerup?.name || 'Powerup'} Activated!`,
            startTime: Date.now(),
            duration: 3000,
            color: '#00ff00',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            font: 'bold 16px Arial'
        });
    }
    
    showLevelUpEffect(data) {
        if (!this.notifications) this.notifications = [];
        
        this.notifications.push({
            text: `Level Up! Level ${data.level || 'Unknown'}`,
            startTime: Date.now(),
            duration: 4000,
            color: '#ffd700',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            font: 'bold 24px Arial'
        });
    }
    
    // Public interface methods
    toggleElement(elementName) {
        if (this.elements[elementName]) {
            this.elements[elementName].visible = !this.elements[elementName].visible;
        }
    }
    
    showChat() {
        this.elements.chatBox.visible = true;
    }
    
    hideChat() {
        this.elements.chatBox.visible = false;
    }
    
    activateChatInput() {
        this.chatInputActive = true;
        this.showChat();
    }
    
    deactivateChatInput() {
        this.chatInputActive = false;
    }
    
    show() {
        // Show HUD elements
        Object.keys(this.elements).forEach(key => {
            if (key !== 'chatBox') { // Keep chat hidden by default
                this.elements[key].visible = true;
            }
        });
    }
    
    hide() {
        // Hide all HUD elements
        Object.keys(this.elements).forEach(key => {
            this.elements[key].visible = false;
        });
    }
    
    resize(width, height) {
        if (this.canvas) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
        this.updateElementPositions();
    }
}
