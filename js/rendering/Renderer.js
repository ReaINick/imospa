// js/rendering/Renderer.js
import { CONFIG } from '../core/Config.js';
import { Utils } from '../utils/Utils.js';

export class Renderer {
    constructor(canvas, camera) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.camera = camera;
        this.viewportBuffer = 100; // Extra render distance beyond viewport
        
        // Performance tracking
        this.frameCount = 0;
        this.lastFPSUpdate = 0;
        this.currentFPS = 0;
        
        // Rendering layers
        this.layers = {
            background: 0,
            food: 1,
            cells: 2,
            effects: 3,
            ui: 4
        };
        
        // Setup canvas properties
        this.setupCanvas();
    }
    
    setupCanvas() {
        // Enable smooth rendering
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        // Set default styles
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.font = '14px Arial';
    }
    handleResize(width, height) {
    // Update canvas dimensions if they've changed
    if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
        
        // Re-setup canvas properties after resize
        this.setupCanvas();
        
        // Inform camera of resize if it doesn't have canvas reference
        if (this.camera && typeof this.camera.resize === 'function') {
            this.camera.resize();
        }
        
        console.log('Renderer resized:', { width, height });
    }
}

// Also add this method to handle dynamic canvas reference updates
setCanvas(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.setupCanvas();
}

// And update the camera reference
setCamera(camera) {
    this.camera = camera;
}
    // Main render function
    render(gameState) {
        this.clearCanvas();
        
        // Save context state
        this.ctx.save();
        
        // Apply camera transform
        this.applyCameraTransform();
        
        // Render game world layers
        this.renderBackground(gameState);
        this.renderFood(gameState.food);
        this.renderCells(gameState.players);
        this.renderBots(gameState.bots);
        this.renderEffects(gameState.effects);
        
        // Restore context
        this.ctx.restore();
        
        // Render UI (no camera transform)
        this.renderUI(gameState);
        
        // Update FPS counter
        this.updateFPS();
    }
    
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    applyCameraTransform() {
        const cam = this.camera;
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.scale(cam.zoom, cam.zoom);
        this.ctx.translate(-cam.x, -cam.y);
    }
    
    renderBackground(gameState) {
        const gridSize = 50;
        const cam = this.camera;
        
        // Calculate visible grid area
        const startX = Math.floor((cam.x - this.canvas.width / (2 * cam.zoom)) / gridSize) * gridSize;
        const endX = Math.ceil((cam.x + this.canvas.width / (2 * cam.zoom)) / gridSize) * gridSize;
        const startY = Math.floor((cam.y - this.canvas.height / (2 * cam.zoom)) / gridSize) * gridSize;
        const endY = Math.ceil((cam.y + this.canvas.height / (2 * cam.zoom)) / gridSize) * gridSize;
        
        // Draw grid
        this.ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
        this.ctx.lineWidth = 1 / cam.zoom;
        this.ctx.beginPath();
        
        // Vertical lines
        for (let x = startX; x <= endX; x += gridSize) {
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
        }
        
        // Horizontal lines
        for (let y = startY; y <= endY; y += gridSize) {
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
        }
        
        this.ctx.stroke();
        
        // Draw map boundaries
        this.drawMapBoundaries(gameState.mapBounds);
    }
    
    drawMapBoundaries(bounds) {
        this.ctx.strokeStyle = '#ff4444';
        this.ctx.lineWidth = 5 / this.camera.zoom;
        this.ctx.strokeRect(bounds.left, bounds.top, bounds.width, bounds.height);
    }
    
    renderFood(foodArray) {
        if (!foodArray || foodArray.length === 0) return;
        
        // Only render food within viewport
        const visibleFood = this.getVisibleEntities(foodArray);
        
        for (const food of visibleFood) {
            this.drawFood(food);
        }
    }
    
    drawFood(food) {
        this.ctx.fillStyle = food.color;
        this.ctx.beginPath();
        this.ctx.arc(food.x, food.y, food.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add slight border for better visibility
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.lineWidth = 0.5 / this.camera.zoom;
        this.ctx.stroke();
    }
    
    renderCells(players) {
        if (!players || players.length === 0) return;
        
        // Collect all cells from all players
        const allCells = [];
        for (const player of players) {
            for (const cell of player.cells) {
                allCells.push({ cell, player });
            }
        }
        
        // Sort by size (smaller cells render first)
        allCells.sort((a, b) => a.cell.mass - b.cell.mass);
        
        // Render visible cells
        for (const { cell, player } of allCells) {
            if (this.isEntityVisible(cell)) {
                this.drawCell(cell, player);
            }
        }
    }
    
    drawCell(cell, player) {
        const ctx = this.ctx;
        
        // Main cell body
        ctx.fillStyle = cell.color;
        ctx.beginPath();
        ctx.arc(cell.x, cell.y, cell.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Cell border
        ctx.strokeStyle = this.darkenColor(cell.color, 0.3);
        ctx.lineWidth = Math.max(2, cell.radius * 0.05) / this.camera.zoom;
        ctx.stroke();
        
        // Player name (if cell is large enough)
        if (cell.radius > 20 && player.name) {
            this.drawCellName(cell, player.name);
        }
        
        // Mass indicator (if cell is large enough)
        if (cell.radius > 15) {
            this.drawCellMass(cell);
        }
    }
    
    drawCellName(cell, name) {
        const ctx = this.ctx;
        const fontSize = Math.max(12, cell.radius * 0.3);
        
        ctx.save();
        ctx.font = `${fontSize}px Arial`;
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        
        ctx.strokeText(name, cell.x, cell.y - fontSize * 0.3);
        ctx.fillText(name, cell.x, cell.y - fontSize * 0.3);
        ctx.restore();
    }
    
    drawCellMass(cell) {
        const ctx = this.ctx;
        const fontSize = Math.max(10, cell.radius * 0.2);
        const massText = Math.floor(cell.mass).toString();
        
        ctx.save();
        ctx.font = `${fontSize}px Arial`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillText(massText, cell.x, cell.y + fontSize * 0.3);
        ctx.restore();
    }
    
    renderBots(bots) {
        if (!bots || bots.length === 0) return;
        
        // Bots are rendered the same as players but with different styling
        for (const bot of bots) {
            for (const cell of bot.cells) {
                if (this.isEntityVisible(cell)) {
                    this.drawBotCell(cell, bot);
                }
            }
        }
    }
    
    drawBotCell(cell, bot) {
        const ctx = this.ctx;
        
        // Bot cells have a distinct appearance
        ctx.fillStyle = cell.color;
        ctx.beginPath();
        ctx.arc(cell.x, cell.y, cell.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Bot border (dotted for distinction)
        ctx.strokeStyle = this.darkenColor(cell.color, 0.4);
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = Math.max(2, cell.radius * 0.05) / this.camera.zoom;
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash
        
        // Bot name with prefix
        if (cell.radius > 20) {
            this.drawCellName(cell, `[BOT] ${bot.name}`);
        }
    }
    
    renderEffects(effects) {
        if (!effects || effects.length === 0) return;
        
        for (const effect of effects) {
            if (this.isEntityVisible(effect)) {
                this.drawEffect(effect);
            }
        }
    }
    
    drawEffect(effect) {
        const ctx = this.ctx;
        
        switch (effect.type) {
            case 'absorption':
                this.drawAbsorptionEffect(effect);
                break;
            case 'split':
                this.drawSplitEffect(effect);
                break;
            case 'powerup':
                this.drawPowerupEffect(effect);
                break;
        }
    }
    
    drawAbsorptionEffect(effect) {
        const ctx = this.ctx;
        const alpha = 1 - (effect.age / effect.lifetime);
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 3 / this.camera.zoom;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
    
    drawSplitEffect(effect) {
        const ctx = this.ctx;
        const alpha = 1 - (effect.age / effect.lifetime);
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#44aaff';
        ctx.lineWidth = 2 / this.camera.zoom;
        
        // Draw split lines
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6;
            const startX = effect.x + Math.cos(angle) * effect.radius * 0.5;
            const startY = effect.y + Math.sin(angle) * effect.radius * 0.5;
            const endX = effect.x + Math.cos(angle) * effect.radius;
            const endY = effect.y + Math.sin(angle) * effect.radius;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    drawPowerupEffect(effect) {
        const ctx = this.ctx;
        const alpha = Math.sin(effect.age * 0.01) * 0.5 + 0.5; // Pulse effect
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = effect.color || '#ff44aa';
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    
    renderUI(gameState) {
        this.renderHUD(gameState);
        this.renderMinimap(gameState);
        this.renderFPS();
    }
    
    renderHUD(gameState) {
        const ctx = this.ctx;
        const player = gameState.player;
        
        if (!player) return;
        
        // HUD background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(10, 10, 200, 80);
        
        // Player stats
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        
        ctx.fillText(`Mass: ${Math.floor(player.totalMass)}`, 20, 30);
        ctx.fillText(`Level: ${player.level}`, 20, 50);
        ctx.fillText(`Coins: ${player.coins}`, 20, 70);
    }
    
    renderMinimap(gameState) {
        const minimapSize = 150;
        const minimapX = this.canvas.width - minimapSize - 10;
        const minimapY = 10;
        
        const ctx = this.ctx;
        
        // Minimap background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);
        
        // Minimap border
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.strokeRect(minimapX, minimapY, minimapSize, minimapSize);
        
        // Draw entities on minimap
        this.drawMinimapEntities(gameState, minimapX, minimapY, minimapSize);
    }
    
    drawMinimapEntities(gameState, mapX, mapY, mapSize) {
        const ctx = this.ctx;
        const bounds = gameState.mapBounds;
        const scale = mapSize / Math.max(bounds.width, bounds.height);
        
        // Draw players
        for (const player of gameState.players) {
            for (const cell of player.cells) {
                const x = mapX + (cell.x - bounds.left) * scale;
                const y = mapY + (cell.y - bounds.top) * scale;
                
                ctx.fillStyle = cell.color;
                ctx.beginPath();
                ctx.arc(x, y, Math.max(2, cell.radius * scale * 0.1), 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        // Draw camera viewport
        const cam = this.camera;
        const viewX = mapX + (cam.x - bounds.left) * scale;
        const viewY = mapY + (cam.y - bounds.top) * scale;
        const viewW = (this.canvas.width / cam.zoom) * scale;
        const viewH = (this.canvas.height / cam.zoom) * scale;
        
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 1;
        ctx.strokeRect(viewX - viewW/2, viewY - viewH/2, viewW, viewH);
    }
    
    renderFPS() {
        const ctx = this.ctx;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(this.canvas.width - 80, this.canvas.height - 30, 70, 20);
        
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`FPS: ${this.currentFPS}`, this.canvas.width - 10, this.canvas.height - 15);
    }
    
    // Utility functions
    isEntityVisible(entity) {
        const cam = this.camera;
        const buffer = this.viewportBuffer;
        
        const screenLeft = cam.x - (this.canvas.width / (2 * cam.zoom)) - buffer;
        const screenRight = cam.x + (this.canvas.width / (2 * cam.zoom)) + buffer;
        const screenTop = cam.y - (this.canvas.height / (2 * cam.zoom)) - buffer;
        const screenBottom = cam.y + (this.canvas.height / (2 * cam.zoom)) + buffer;
        
        return entity.x + entity.radius >= screenLeft &&
               entity.x - entity.radius <= screenRight &&
               entity.y + entity.radius >= screenTop &&
               entity.y - entity.radius <= screenBottom;
    }
    
    getVisibleEntities(entities) {
        return entities.filter(entity => this.isEntityVisible(entity));
    }
    
    darkenColor(color, factor) {
        // Simple color darkening
        const rgb = this.hexToRgb(color);
        if (!rgb) return color;
        
        const r = Math.floor(rgb.r * (1 - factor));
        const g = Math.floor(rgb.g * (1 - factor));
        const b = Math.floor(rgb.b * (1 - factor));
        
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    updateFPS() {
        this.frameCount++;
        const now = performance.now();
        
        if (now - this.lastFPSUpdate > 1000) {
            this.currentFPS = Math.round((this.frameCount * 1000) / (now - this.lastFPSUpdate));
            this.frameCount = 0;
            this.lastFPSUpdate = now;
        }
    }
    
    // Screen to world coordinate conversion
    screenToWorld(screenX, screenY) {
        const cam = this.camera;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        const worldX = ((screenX - centerX) / cam.zoom) + cam.x;
        const worldY = ((screenY - centerY) / cam.zoom) + cam.y;
        
        return { x: worldX, y: worldY };
    }
    
    // World to screen coordinate conversion
    worldToScreen(worldX, worldY) {
        const cam = this.camera;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        const screenX = ((worldX - cam.x) * cam.zoom) + centerX;
        const screenY = ((worldY - cam.y) * cam.zoom) + centerY;
        
        return { x: screenX, y: screenY };
    }
}
