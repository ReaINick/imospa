// js/ui/Leaderboard.js
import { EventSystem } from '../core/EventSystem.js';
import { CONFIG } from '../core/Config.js';

export class Leaderboard {
    constructor() {
        this.players = [];
        this.maxEntries = 10;
        this.updateInterval = 1000; // Update every second
        this.lastUpdate = 0;
        this.element = null;
        this.visible = true;
        
        // Animation properties
        this.animationOffset = 0;
        this.entryHeight = 32;
        this.fadeInDuration = 300;
        
        // Create DOM elements
        this.createElement();
        this.setupEventListeners();
    }
    
    createElement() {
        // Create main leaderboard container
        this.element = document.createElement('div');
        this.element.id = 'leaderboard';
        this.element.className = 'leaderboard';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'leaderboard-header';
        header.innerHTML = `
            <h3>🏆 Leaderboard</h3>
            <button class="leaderboard-toggle" id="leaderboard-toggle">−</button>
        `;
        
        // Create entries container
        const entriesContainer = document.createElement('div');
        entriesContainer.className = 'leaderboard-entries';
        entriesContainer.id = 'leaderboard-entries';
        
        // Assemble leaderboard
        this.element.appendChild(header);
        this.element.appendChild(entriesContainer);
        
        // Add to DOM
        document.body.appendChild(this.element);
        
        // Add CSS if not already present
        this.addCSS();
    }
    
    addCSS() {
        if (document.getElementById('leaderboard-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'leaderboard-styles';
        style.textContent = `
            .leaderboard {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 250px;
                background: rgba(0, 0, 0, 0.8);
                border: 2px solid #333;
                border-radius: 10px;
                color: white;
                font-family: Arial, sans-serif;
                z-index: 100;
                backdrop-filter: blur(5px);
                transition: all 0.3s ease;
            }
            
            .leaderboard-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 15px;
                border-bottom: 1px solid #555;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 8px 8px 0 0;
            }
            
            .leaderboard-header h3 {
                margin: 0;
                font-size: 16px;
                color: #FFD700;
            }
            
            .leaderboard-toggle {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 0;
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .leaderboard-toggle:hover {
                color: #FFD700;
            }
            
            .leaderboard-entries {
                max-height: 320px;
                overflow: hidden;
                transition: max-height 0.3s ease;
            }
            
            .leaderboard-entries.collapsed {
                max-height: 0;
            }
            
            .leaderboard-entry {
                display: flex;
                align-items: center;
                padding: 8px 15px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                transition: all 0.2s ease;
                position: relative;
                overflow: hidden;
            }
            
            .leaderboard-entry:last-child {
                border-bottom: none;
            }
            
            .leaderboard-entry:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            
            .leaderboard-entry.highlight {
                background: rgba(255, 215, 0, 0.2);
                border-left: 3px solid #FFD700;
            }
            
            .leaderboard-rank {
                width: 25px;
                font-weight: bold;
                color: #FFD700;
                text-align: center;
            }
            
            .leaderboard-rank.first {
                color: #FFD700;
            }
            
            .leaderboard-rank.second {
                color: #C0C0C0;
            }
            
            .leaderboard-rank.third {
                color: #CD7F32;
            }
            
            .leaderboard-name {
                flex: 1;
                margin-left: 10px;
                font-weight: 500;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .leaderboard-mass {
                font-weight: bold;
                color: #4CAF50;
                min-width: 50px;
                text-align: right;
            }
            
            .leaderboard-level {
                margin-left: 8px;
                padding: 2px 6px;
                background: rgba(76, 175, 80, 0.8);
                border-radius: 10px;
                font-size: 10px;
                font-weight: bold;
                min-width: 20px;
                text-align: center;
            }
            
            .leaderboard-crown {
                margin-left: 5px;
                font-size: 12px;
            }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            .leaderboard-entry.new {
                animation: slideIn 0.3s ease;
            }
            
            @media (max-width: 768px) {
                .leaderboard {
                    width: 200px;
                    top: 10px;
                    right: 10px;
                }
                
                .leaderboard-name {
                    font-size: 12px;
                }
                
                .leaderboard-mass {
                    font-size: 12px;
                }
            }
        `;
        
        document.head.appendChild(style);
    }
    
    setupEventListeners() {
        // Toggle leaderboard visibility
        document.addEventListener('click', (e) => {
            if (e.target.id === 'leaderboard-toggle') {
                this.toggleVisibility();
            }
        });
        
        // Listen for game events
        EventSystem.on('playerUpdate', (data) => {
            this.updatePlayerData(data.player);
        });
        
        EventSystem.on('playerDeath', (data) => {
            this.removePlayer(data.player);
        });
        
        EventSystem.on('gameStateUpdate', (data) => {
            if (data.players) {
                this.updateAllPlayers(data.players);
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                this.toggleVisibility();
            }
        });
    }
    
    updatePlayerData(player) {
        const existingIndex = this.players.findIndex(p => p.id === player.id);
        
        const playerData = {
            id: player.id,
            name: player.name,
            mass: Math.floor(player.totalMass),
            level: player.level || 1,
            isBot: player.isBot || false,
            cells: player.cells ? player.cells.length : 1,
            lastSeen: Date.now()
        };
        
        if (existingIndex !== -1) {
            const oldMass = this.players[existingIndex].mass;
            this.players[existingIndex] = playerData;
            
            // Check for mass change animation
            if (playerData.mass !== oldMass) {
                this.animateMassChange(player.id, oldMass, playerData.mass);
            }
        } else {
            this.players.push(playerData);
        }
        
        this.sortPlayers();
    }
    
    updateAllPlayers(players) {
        this.players = players.map(player => ({
            id: player.id,
            name: player.name,
            mass: Math.floor(player.totalMass),
            level: player.level || 1,
            isBot: player.isBot || false,
            cells: player.cells ? player.cells.length : 1,
            lastSeen: Date.now()
        }));
        
        this.sortPlayers();
    }
    
    removePlayer(player) {
        this.players = this.players.filter(p => p.id !== player.id);
        this.sortPlayers();
    }
    
    sortPlayers() {
        this.players.sort((a, b) => {
            // Sort by mass (descending)
            if (b.mass !== a.mass) {
                return b.mass - a.mass;
            }
            // If mass is equal, sort by level (descending)
            return (b.level || 1) - (a.level || 1);
        });
        
        // Limit to max entries
        this.players = this.players.slice(0, this.maxEntries);
    }
    
    update(deltaTime, currentTime, currentPlayer = null) {
        if (currentTime - this.lastUpdate < this.updateInterval) {
            return;
        }
        
        this.lastUpdate = currentTime;
        
        // Remove stale players (haven't been seen in 10 seconds)
        this.players = this.players.filter(player => {
            return currentTime - player.lastSeen < 10000;
        });
        
        this.render(currentPlayer);
    }
    
    render(currentPlayer = null) {
        const entriesContainer = document.getElementById('leaderboard-entries');
        if (!entriesContainer) return;
        
        entriesContainer.innerHTML = '';
        
        this.players.forEach((player, index) => {
            const entry = this.createPlayerEntry(player, index + 1, currentPlayer);
            entriesContainer.appendChild(entry);
        });
    }
    
    createPlayerEntry(player, rank, currentPlayer) {
        const entry = document.createElement('div');
        entry.className = 'leaderboard-entry';
        
        // Highlight current player
        if (currentPlayer && player.id === currentPlayer.id) {
            entry.classList.add('highlight');
        }
        
        // Create rank element
        const rankElement = document.createElement('div');
        rankElement.className = 'leaderboard-rank';
        if (rank === 1) rankElement.classList.add('first');
        else if (rank === 2) rankElement.classList.add('second');
        else if (rank === 3) rankElement.classList.add('third');
        
        rankElement.textContent = rank;
        
        // Create name element
        const nameElement = document.createElement('div');
        nameElement.className = 'leaderboard-name';
        nameElement.textContent = player.name;
        
        // Add bot indicator
        if (player.isBot) {
            nameElement.textContent += ' 🤖';
        }
        
        // Create mass element
        const massElement = document.createElement('div');
        massElement.className = 'leaderboard-mass';
        massElement.textContent = this.formatMass(player.mass);
        
        // Create level element
        const levelElement = document.createElement('div');
        levelElement.className = 'leaderboard-level';
        levelElement.textContent = `L${player.level}`;
        
        // Add crown for first place
        if (rank === 1) {
            const crown = document.createElement('span');
            crown.className = 'leaderboard-crown';
            crown.textContent = '👑';
            nameElement.appendChild(crown);
        }
        
        // Assemble entry
        entry.appendChild(rankElement);
        entry.appendChild(nameElement);
        entry.appendChild(massElement);
        entry.appendChild(levelElement);
        
        return entry;
    }
    
    formatMass(mass) {
        if (mass >= 1000000) {
            return (mass / 1000000).toFixed(1) + 'M';
        } else if (mass >= 1000) {
            return (mass / 1000).toFixed(1) + 'K';
        } else {
            return mass.toString();
        }
    }
    
    animateMassChange(playerId, oldMass, newMass) {
        const entry = document.querySelector(`[data-player-id="${playerId}"]`);
        if (!entry) return;
        
        const massElement = entry.querySelector('.leaderboard-mass');
        if (!massElement) return;
        
        // Add animation class
        massElement.classList.add('mass-change');
        
        // Remove class after animation
        setTimeout(() => {
            massElement.classList.remove('mass-change');
        }, 500);
    }
    
    toggleVisibility() {
        const entriesContainer = document.getElementById('leaderboard-entries');
        const toggleButton = document.getElementById('leaderboard-toggle');
        
        if (!entriesContainer || !toggleButton) return;
        
        if (entriesContainer.classList.contains('collapsed')) {
            entriesContainer.classList.remove('collapsed');
            toggleButton.textContent = '−';
            this.visible = true;
        } else {
            entriesContainer.classList.add('collapsed');
            toggleButton.textContent = '+';
            this.visible = false;
        }
    }
    
    show() {
        this.element.style.display = 'block';
        this.visible = true;
    }
    
    hide() {
        this.element.style.display = 'none';
        this.visible = false;
    }
    
    getCurrentPlayerRank(playerId) {
        const index = this.players.findIndex(p => p.id === playerId);
        return index !== -1 ? index + 1 : null;
    }
    
    getTopPlayers(count = 3) {
        return this.players.slice(0, count);
    }
    
    // Get player statistics for the current game
    getGameStats() {
        const totalPlayers = this.players.length;
        const totalMass = this.players.reduce((sum, player) => sum + player.mass, 0);
        const averageMass = totalPlayers > 0 ? totalMass / totalPlayers : 0;
        const humanPlayers = this.players.filter(p => !p.isBot).length;
        const botPlayers = this.players.filter(p => p.isBot).length;
        
        return {
            totalPlayers,
            totalMass,
            averageMass: Math.floor(averageMass),
            humanPlayers,
            botPlayers,
            topPlayer: this.players[0] || null
        };
    }
    
    // Export leaderboard data for save system
    exportData() {
        return {
            players: this.players,
            visible: this.visible,
            lastUpdate: this.lastUpdate
        };
    }
    
    // Import leaderboard data from save system
    importData(data) {
        if (data.players) {
            this.players = data.players;
        }
        if (typeof data.visible === 'boolean') {
            this.visible = data.visible;
            if (!this.visible) {
                this.toggleVisibility();
            }
        }
        if (data.lastUpdate) {
            this.lastUpdate = data.lastUpdate;
        }
    }
    
    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        
        // Remove event listeners
        EventSystem.off('playerUpdate');
        EventSystem.off('playerDeath');
        EventSystem.off('gameStateUpdate');
    }
}
