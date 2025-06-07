// js/ui/HUD.js
import { EventSystem } from '../core/EventSystem.js';
import { Utils } from '../utils/Utils.js';

export class HUD {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
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
            leaderboard: { x: canvas.width - 200, y: 20, visible: true },
            minimap: { x: canvas.width - 150, y: canvas.height - 150, visible: true },
            powerupBar: { x: canvas.width / 2 - 200, y: canvas.height - 60, visible: true },
            chatBox: { x: 20, y: canvas.height - 150, visible: false }
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
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        EventSystem.on('playerStatsUpdated', (data) => {
            this.updatePlayerStats(data);
        });
        
        EventSystem.on('gameStatsUpdated', (stats) => {
            this.gameStats = { ...this.gameStats, ...stats };
        });
        
        EventSystem.on('chatMessage', (message) => {
            this.addChatMessage(message);
        });
        
        EventSystem.on('powerupUsed', (data) => {
            this.showPowerupNotification(data);
        });
        
        EventSystem.on('levelUp', (data) => {
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
        
        const massText = `Mass: ${Math.floor(this.player.totalMass)}`;
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
        
        const levelText = `Level: ${this.player.level}`;
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
        const progress = this.player.experience / this.player.experienceToNext;
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
        
        const coinsText = `💰 ${this.player.coins}`;
        this.ctx.strokeText(coinsText, pos.x, pos.y);
        this.ctx.fillText(coinsText, pos.x, pos.y);
        
        // Platinum coins
        this.ctx.fillStyle = '#c0c0c0';
        const platinumText = `💎 ${this.player.platinumCoins}`;
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
    }
    
    renderMinimap(camera, worldEntities) {
        const pos = this.elements.minimap;
        const size = this.minimap.size;
        
        // Background
        this.ctx.fillStyle = this.minimap.backgroundColor;
        this.ctx.fillRect(pos.x, pos.y, size, size);
        
        // Border
        this.ctx.strokeStyle = this.minimap.borderColor;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(pos.x, pos.y, size, size);
        
        if (!this.player || !worldEntities) return;
        
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
            const mapX = centerX + (entity.x - this.player.x) * scale;
            const mapY = centerY + (entity.y - this.player.y) * scale;
            
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
                    radius = Math.max(2, entity.radius * scale);
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
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        const viewportSize = Math.min(camera.viewport.width, camera.viewport.height) * scale / 2;
        this.ctx.strokeRect(
            centerX - viewportSize / 2,
            centerY - viewportSize / 2,
            viewportSize,
            viewportSize
        );
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
        const textWidth = this.ctx.measureText(notification.text).width;
        this.ctx.fillRect(x - textWidth / 2 - 20, y - 20, textWidth + 40, 40);
        
        // Text
        this.ctx.font = notification.font || 'bold 18px Arial';
        this.ctx.fillStyle = notification.color || '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(notification.text, x, y + 5);
        
        this.ctx.restore();
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
            text: `${data.powerup.name} Activated!`,
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
            text: `Level Up! Level ${data.level}`,
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
    
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.updateElementPositions();
    }
}
