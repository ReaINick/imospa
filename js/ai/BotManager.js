// js/ai/BotManager.js
import Bot from '../entities/Bot.js';
import { Food } from '../entities/Food.js';
import { Utils } from '../utils/Utils.js';
import { CONFIG } from '../core/Config.js';

export class BotManager {
    constructor(game) {
        this.game = game;
        this.bots = [];
        this.maxBots = CONFIG.BOTS.COUNT;
        this.spawnDelay = CONFIG.BOTS.DECISION_INTERVAL;
        this.lastSpawn = 0;
        this.worldBounds = null; // Add this to store worldBounds
        this.difficultyDistribution = {
            easy: 0.4,
            medium: 0.4,
            hard: 0.2
        };
        
        // Bot name pools
        this.botNames = [
            'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta',
            'Hunter', 'Predator', 'Stalker', 'Shadow', 'Ghost',
            'Viper', 'Falcon', 'Wolf', 'Bear', 'Tiger',
            'Neo', 'Rex', 'Max', 'Ace', 'Zero', 'Nova',
            'Cyber', 'Blade', 'Storm', 'Frost', 'Blaze'
        ];
        
        this.usedNames = new Set();
        this.botUpdateInterval = 16;
        this.lastBotUpdate = 0;
    }
    
    initialize(worldBounds) {
        // Store the worldBounds for later use
        this.worldBounds = worldBounds || {
            left: 0,
            top: 0,
            right: CONFIG.WORLD_WIDTH,
            bottom: CONFIG.WORLD_HEIGHT
        };
        
        // Spawn initial bots
        this.spawnInitialBots();
    }
    
    update(deltaTime, currentTime) {
        // Update bot AI less frequently for performance
        if (currentTime - this.lastBotUpdate >= this.botUpdateInterval) {
            this.updateBots(deltaTime);
            this.lastBotUpdate = currentTime;
        }
        
        // Spawn new bots if needed
        this.maintainBotPopulation(currentTime);
        
        // Clean up dead bots
        this.cleanupDeadBots();
    }
    
    spawnInitialBots() {
        const initialBotCount = Math.floor(this.maxBots * 0.7);
        
        for (let i = 0; i < initialBotCount; i++) {
            this.spawnBot();
        }
    }
    
    maintainBotPopulation(currentTime) {
        if (this.bots.length < this.maxBots && 
            currentTime - this.lastSpawn >= this.spawnDelay) {
            
            this.spawnBot();
            this.lastSpawn = currentTime;
        }
    }
    
    spawnBot(difficulty = null) {
        // Determine bot difficulty
        if (!difficulty) {
            difficulty = this.selectRandomDifficulty();
        }
        
        // Find safe spawn position
        const spawnPos = this.findSafeSpawnPosition();
        if (!spawnPos) return null;
        
        // Generate unique name
        const name = this.generateBotName();
        
        // Create bot
        const bot = new Bot(spawnPos.x, spawnPos.y, difficulty, { name: name });
        bot.id = Utils.generateId();
        
        // Set bot properties based on difficulty
        this.configureBotByDifficulty(bot, difficulty);
        
        // Add to bot list
        this.bots.push(bot);
        
        return bot;
    }
    
    selectRandomDifficulty() {
        const rand = Math.random();
        let cumulative = 0;
        
        for (const [difficulty, probability] of Object.entries(this.difficultyDistribution)) {
            cumulative += probability;
            if (rand <= cumulative) {
                return difficulty;
            }
        }
        
        return 'medium';
    }
    
    findSafeSpawnPosition() {
        const maxAttempts = 50;
        const minDistanceFromPlayers = 150;
        
        // Use stored worldBounds instead of this.game.worldBounds
        const worldBounds = this.worldBounds || {
            left: 0,
            top: 0,
            right: CONFIG.WORLD_WIDTH,
            bottom: CONFIG.WORLD_HEIGHT
        };
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const x = Utils.random(
                worldBounds.left + 100, 
                worldBounds.right - 100
            );
            const y = Utils.random(
                worldBounds.top + 100, 
                worldBounds.bottom - 100
            );
            
            // Check distance from all players
            let tooClose = false;
            const players = this.game.getAllPlayers ? this.game.getAllPlayers() : [];
            
            for (const player of players) {
                const distance = Utils.distance(x, y, player.x, player.y);
                if (distance < minDistanceFromPlayers) {
                    tooClose = true;
                    break;
                }
            }
            
            if (!tooClose) {
                return { x, y };
            }
        }
        
        return null;
    }
    
    generateBotName() {
        let name;
        let attempts = 0;
        
        do {
            if (attempts > 100) {
                const baseName = this.botNames[Math.floor(Math.random() * this.botNames.length)];
                name = `${baseName}_${Utils.randomInt(1000, 9999)}`;
                break;
            }
            
            name = this.botNames[Math.floor(Math.random() * this.botNames.length)];
            attempts++;
        } while (this.usedNames.has(name));
        
        this.usedNames.add(name);
        return name;
    }
    
    configureBotByDifficulty(bot, difficulty) {
        switch (difficulty) {
            case 'easy':
                bot.reactionTime = 800;
                bot.ai.aggressionLevel = 0.3;
                bot.ai.splitChance = 0.1;
                bot.ai.huntRadius = 80;
                bot.ai.fleeRadius = 120;
                bot.maxSpeed = 0.8;
                break;
                
            case 'medium':
                bot.reactionTime = 500;
                bot.ai.aggressionLevel = 0.6;
                bot.ai.splitChance = 0.25;
                bot.ai.huntRadius = 100;
                bot.ai.fleeRadius = 140;
                bot.maxSpeed = 1.0;
                break;
                
            case 'hard':
                bot.reactionTime = 200;
                bot.ai.aggressionLevel = 0.8;
                bot.ai.splitChance = 0.4;
                bot.ai.huntRadius = 140;
                bot.ai.fleeRadius = 160;
                bot.maxSpeed = 1.2;
                break;
                
            case 'expert':
                bot.reactionTime = 100;
                bot.ai.aggressionLevel = 0.95;
                bot.ai.splitChance = 0.5;
                bot.ai.huntRadius = 160;
                bot.ai.fleeRadius = 180;
                bot.maxSpeed = 1.4;
                break;
        }
    }
    
    updateBots(deltaTime) {
        const gameTime = Date.now();
        
        for (const bot of this.bots) {
            if (!bot.isAlive) continue;
            
            // Get nearby entities for bot AI
            const nearbyEntities = this.getNearbyEntities(bot);
            
            // Update bot AI
            bot.update(deltaTime, nearbyEntities, gameTime);
        }
    }
    
    getNearbyEntities(bot) {
        const searchRadius = Math.max(
            bot.ai?.huntRadius || 100, 
            bot.ai?.fleeRadius || 140
        ) + 50;
        
        const nearbyEntities = {
            players: [],
            bots: [],
            food: []
        };
        
        // Find nearby players
        const allPlayers = this.game.getAllPlayers ? this.game.getAllPlayers() : [];
        for (const player of allPlayers) {
            if (player === bot) continue;
            
            const distance = Utils.distance(bot.x, bot.y, player.x, player.y);
            if (distance <= searchRadius) {
                nearbyEntities.players.push({
                    entity: player,
                    distance: distance,
                    threat: player.totalMass > bot.totalMass * 1.1,
                    prey: bot.totalMass > player.totalMass * 1.1
                });
            }
        }
        
        // Find nearby bots
        for (const otherBot of this.bots) {
            if (otherBot === bot || !otherBot.isAlive) continue;
            
            const distance = Utils.distance(bot.x, bot.y, otherBot.x, otherBot.y);
            if (distance <= searchRadius) {
                nearbyEntities.bots.push({
                    entity: otherBot,
                    distance: distance,
                    threat: otherBot.totalMass > bot.totalMass * 1.1,
                    prey: bot.totalMass > otherBot.totalMass * 1.1
                });
            }
        }
        
        // Find nearby food (with safety check for quadTree)
        if (this.game.quadTree && typeof this.game.quadTree.queryRange === 'function') {
            const nearbyFood = this.game.quadTree.queryRange(
                bot.x - searchRadius,
                bot.y - searchRadius,
                bot.x + searchRadius,
                bot.y + searchRadius
            );
            
            for (const item of nearbyFood) {
                if (item instanceof Food) {
                    nearbyEntities.food.push({
                        entity: item,
                        distance: Utils.distance(bot.x, bot.y, item.x, item.y)
                    });
                }
            }
        }
        
        return nearbyEntities;
    }
    
    cleanupDeadBots() {
        const aliveBots = [];
        
        for (const bot of this.bots) {
            if (bot.isAlive && bot.cells.length > 0) {
                aliveBots.push(bot);
            } else {
                this.usedNames.delete(bot.name);
            }
        }
        
        this.bots = aliveBots;
    }
    
    removeBot(bot) {
        const index = this.bots.indexOf(bot);
        if (index !== -1) {
            this.bots.splice(index, 1);
            this.usedNames.delete(bot.name);
        }
    }
    
    getAllBots() {
        return this.bots.filter(bot => bot.isAlive);
    }
    
    getBotCount() {
        return this.bots.length;
    }
    
    setDifficultyDistribution(easy, medium, hard, expert = 0) {
        const total = easy + medium + hard + expert;
        this.difficultyDistribution = {
            easy: easy / total,
            medium: medium / total,
            hard: hard / total,
            expert: expert / total
        };
    }
    
    spawnCompanionBot(player, botType) {
        const spawnPos = this.findSafeSpawnPosition();
        if (!spawnPos) return null;
        
        const bot = new Bot(spawnPos.x, spawnPos.y, 'medium', { 
            name: `${player.name}'s ${botType}` 
        });
        bot.isCompanion = true;
        bot.owner = player;
        bot.companionType = botType;
        
        this.configureCompanionBot(bot, botType);
        
        this.bots.push(bot);
        return bot;
    }
    
    configureCompanionBot(bot, botType) {
        switch (botType) {
            case 'Defender':
                bot.ai.aggressionLevel = 0.9;
                bot.ai.protectRadius = 200;
                bot.ai.behaviorType = 'defender';
                break;
                
            case 'Hunter':
                bot.ai.aggressionLevel = 1.0;
                bot.ai.huntRadius = 200;
                bot.ai.behaviorType = 'hunter';
                break;
                
            case 'Collector':
                bot.ai.aggressionLevel = 0.2;
                bot.ai.collectRadius = 150;
                bot.ai.behaviorType = 'collector';
                break;
        }
    }
    
    getPerformanceStats() {
        return {
            totalBots: this.bots.length,
            aliveBots: this.getAllBots().length,
            averageMass: this.bots.reduce((sum, bot) => sum + bot.totalMass, 0) / this.bots.length,
            difficultyBreakdown: this.getDifficultyBreakdown()
        };
    }
    
    getDifficultyBreakdown() {
        const breakdown = { easy: 0, medium: 0, hard: 0, expert: 0 };
        
        for (const bot of this.bots) {
            breakdown[bot.difficulty]++;
        }
        
        return breakdown;
    }
}
