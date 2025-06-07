// Bot.js - Bot entity that extends Player with AI behavior
import { Player } from './Player.js';  // Changed from default import to named import
import BotAI from '../ai/BotAI.js';
import { Utils } from '../utils/Utils.js';

class Bot extends Player {
    constructor(x, y, difficulty = 'medium', config = {}) {
        // Generate bot name
        const botName = config.name || Bot.generateBotName();
        
        super(x, y, botName);
        
        this.type = 'bot';
        this.difficulty = difficulty;
        this.ai = new BotAI(this, difficulty);
        this.isBot = true;
        
        // Bot-specific properties
        this.targetX = x;
        this.targetY = y;
        this.reactionTime = this.calculateReactionTime();
        this.skillLevel = this.calculateSkillLevel();
        this.personalityTraits = this.generatePersonality();
        
        // Performance tracking
        this.performanceStats = {
            kills: 0,
            deaths: 0,
            massGained: 0,
            timeAlive: 0,
            decisions: 0,
            successfulHunts: 0
        };
        
        // Bot appearance customization
        this.appearance = this.generateAppearance();
        
        // Movement smoothing for more natural behavior
        this.smoothedVelocity = { x: 0, y: 0 };
        this.velocitySmoothing = 0.15;
        
        // Split behavior tracking
        this.lastSplitTime = 0;
        this.splitCooldown = 2000; // 2 seconds between splits
        this.maxSplits = this.calculateMaxSplits();
        
        // Recombine behavior
        this.lastRecombineTime = 0;
        this.recombineCooldown = 1000; // 1 second cooldown
        this.autoRecombineDelay = 15000; // Auto recombine after 15 seconds
    }

    // Generate random bot name
    static generateBotName() {
        const adjectives = [
            'Swift', 'Mighty', 'Clever', 'Sneaky', 'Bold', 'Quick', 'Sharp', 
            'Fierce', 'Agile', 'Cunning', 'Brave', 'Wise', 'Silent', 'Wild',
            'Storm', 'Shadow', 'Lightning', 'Frost', 'Flame', 'Steel'
        ];
        
        const nouns = [
            'Hunter', 'Striker', 'Warrior', 'Guardian', 'Phantom', 'Viper',
            'Eagle', 'Wolf', 'Tiger', 'Dragon', 'Falcon', 'Shark', 'Panther',
            'Raven', 'Bear', 'Lion', 'Hawk', 'Spider', 'Cobra', 'Lynx'
        ];
        
        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const number = Math.floor(Math.random() * 999) + 1;
        
        return `${adjective}${noun}${number}`;
    }

    // Calculate reaction time based on difficulty
    calculateReactionTime() {
        const baseTimes = {
            easy: 800,    // 800ms reaction time
            medium: 400,  // 400ms reaction time
            hard: 200,    // 200ms reaction time
            expert: 100   // 100ms reaction time
        };
        
        const baseTime = baseTimes[this.difficulty] || 400;
        return baseTime + (Math.random() - 0.5) * baseTime * 0.3; // ±30% variation
    }

    // Calculate skill level
    calculateSkillLevel() {
        const skillLevels = {
            easy: 0.3,
            medium: 0.6,
            hard: 0.8,
            expert: 0.95
        };
        
        return skillLevels[this.difficulty] || 0.6;
    }

    // Generate personality traits
    generatePersonality() {
        return {
            aggression: Math.random() * 0.5 + (this.difficulty === 'expert' ? 0.5 : 0.2),
            caution: Math.random() * 0.8 + 0.1,
            persistence: Math.random() * 0.7 + 0.3,
            teamwork: Math.random() * 0.5,
            riskTaking: Math.random() * 0.6 + (this.difficulty === 'easy' ? 0.1 : 0.3)
        };
    }

    // Generate bot appearance
    generateAppearance() {
        const hue = Math.random() * 360;
        const saturation = 60 + Math.random() * 40;
        const lightness = 45 + Math.random() * 20;
        
        return {
            color: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
            pattern: Math.random() < 0.3 ? 'striped' : 'solid',
            glow: this.difficulty === 'expert'
        };
    }

    // Calculate maximum splits based on difficulty
    calculateMaxSplits() {
        const maxSplits = {
            easy: 2,
            medium: 4,
            hard: 6,
            expert: 8
        };
        
        return maxSplits[this.difficulty] || 4;
    }

    // Update bot behavior and AI
    update(deltaTime, nearbyEntities, gameTime) {
        // Update AI decision making
        this.ai.update(deltaTime, nearbyEntities, gameTime);
        
        // Update performance stats
        this.performanceStats.timeAlive += deltaTime;
        
        // Update movement based on AI decisions
        this.updateMovement(deltaTime);
        
        // Handle auto-recombine
        this.handleAutoRecombine(gameTime);
        
        // Update parent class
        super.update(deltaTime);
        
        // Update performance tracking
        this.updatePerformanceTracking();
    }

    // Update movement based on AI target
    updateMovement(deltaTime) {
        if (this.targetX === undefined || this.targetY === undefined) return;
        
        // Calculate direction to target
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 5) {
            // Normalize direction
            const dirX = dx / distance;
            const dirY = dy / distance;
            
            // Calculate desired velocity based on mass and skill
            const maxSpeed = this.calculateMaxSpeed();
            const desiredVelocity = {
                x: dirX * maxSpeed * this.skillLevel,
                y: dirY * maxSpeed * this.skillLevel
            };
            
            // Apply smoothing for more natural movement
            this.smoothedVelocity.x += (desiredVelocity.x - this.smoothedVelocity.x) * this.velocitySmoothing;
            this.smoothedVelocity.y += (desiredVelocity.y - this.smoothedVelocity.y) * this.velocitySmoothing;
            
            // Apply velocity to cells
            for (const cell of this.cells) {
                cell.velocity.x = this.smoothedVelocity.x;
                cell.velocity.y = this.smoothedVelocity.y;
            }
        }
    }

    // Calculate max speed based on total mass
    calculateMaxSpeed() {
        const baseMass = this.totalMass || 20;
        return Math.max(2, 8 - Math.log(baseMass) * 1.5);
    }

    // Enhanced split method with AI considerations
    split(targetX, targetY) {
        const currentTime = Date.now();
        
        // Check cooldown and conditions
        if (currentTime - this.lastSplitTime < this.splitCooldown) return false;
        if (this.cells.length >= this.maxSplits) return false;
        if (this.totalMass < 35) return false;
        
        // Add skill-based success rate
        if (Math.random() > this.skillLevel) return false;
        
        const success = super.split(targetX, targetY);
        
        if (success) {
            this.lastSplitTime = currentTime;
            this.performanceStats.decisions++;
            
            // Add some randomness to split direction for more natural behavior
            const randomOffset = (1 - this.skillLevel) * 50;
            const offsetX = (Math.random() - 0.5) * randomOffset;
            const offsetY = (Math.random() - 0.5) * randomOffset;
            
            this.targetX += offsetX;
            this.targetY += offsetY;
        }
        
        return success;
    }

    // Handle auto-recombine logic
    handleAutoRecombine(gameTime) {
        if (this.cells.length <= 1) return;
        
        // Check if cells should recombine based on AI logic
        const shouldRecombine = this.shouldAutoRecombine(gameTime);
        
        if (shouldRecombine) {
            this.recombine();
        }
    }

    // Determine if cells should auto-recombine
    shouldAutoRecombine(gameTime) {
        if (this.cells.length <= 1) return false;
        
        // Check if enough time has passed since last split
        const timeSinceLastSplit = gameTime - this.lastSplitTime;
        if (timeSinceLastSplit < this.autoRecombineDelay) return false;
        
        // AI-based decision factors
        const behaviorState = this.ai.getBehaviorState();
        
        // Recombine if fleeing or no immediate threats/opportunities
        if (behaviorState.behavior === 'flee') return true;
        if (behaviorState.behavior === 'wander' && Math.random() < 0.3) return true;
        
        // Recombine if too many cells for effective control
        if (this.cells.length > 4 && Math.random() < 0.5) return true;
        
        return false;
    }

    // Enhanced recombine with AI considerations
    recombine() {
        const currentTime = Date.now();
        
        if (currentTime - this.lastRecombineTime < this.recombineCooldown) return false;
        if (this.cells.length <= 1) return false;
        
        const success = super.recombine();
        
        if (success) {
            this.lastRecombineTime = currentTime;
            this.performanceStats.decisions++;
        }
        
        return success;
    }

    // Handle when this bot absorbs another entity
    onAbsorb(entity) {
        super.onAbsorb(entity);
        
        this.performanceStats.massGained += entity.mass || 1;
        
        if (entity.type === 'player' || entity.type === 'bot') {
            this.performanceStats.kills++;
            this.performanceStats.successfulHunts++;
        }
    }

    // Handle when this bot is absorbed
    onAbsorbed(absorber) {
        this.performanceStats.deaths++;
        super.onAbsorbed(absorber);
    }

    // Update performance tracking
    updatePerformanceTracking() {
        // Calculate efficiency metrics
        const killDeathRatio = this.performanceStats.deaths > 0 ? 
            this.performanceStats.kills / this.performanceStats.deaths : 
            this.performanceStats.kills;
        
        const huntSuccessRate = this.performanceStats.decisions > 0 ?
            this.performanceStats.successfulHunts / this.performanceStats.decisions :
            0;
        
        // Adjust AI parameters based on performance
        if (killDeathRatio < 0.5 && this.difficulty !== 'easy') {
            this.ai.aggressionLevel *= 0.95; // Become more cautious
        } else if (killDeathRatio > 2.0 && this.difficulty !== 'expert') {
            this.ai.aggressionLevel = Math.min(1.0, this.ai.aggressionLevel * 1.05); // Become more aggressive
        }
    }

    // Get bot status for debugging/UI
    getStatus() {
        return {
            name: this.name,
            difficulty: this.difficulty,
            behavior: this.ai.getBehaviorState(),
            performance: this.performanceStats,
            mass: this.totalMass,
            cellCount: this.cells.length,
            position: { x: this.x, y: this.y },
            target: { x: this.targetX, y: this.targetY }
        };
    }

    // Adjust bot difficulty dynamically
    setDifficulty(newDifficulty) {
        this.difficulty = newDifficulty;
        this.ai.adjustDifficulty(newDifficulty);
        this.reactionTime = this.calculateReactionTime();
        this.skillLevel = this.calculateSkillLevel();
        this.maxSplits = this.calculateMaxSplits();
    }

    // Reset bot to initial state
    reset(x, y) {
        super.reset(x, y);
        this.targetX = x;
        this.targetY = y;
        this.ai.reset();
        this.performanceStats = {
            kills: 0,
            deaths: 0,
            massGained: 0,
            timeAlive: 0,
            decisions: 0,
            successfulHunts: 0
        };
        this.smoothedVelocity = { x: 0, y: 0 };
    }

    // Serialize bot data
    serialize() {
        return {
            ...super.serialize(),
            type: 'bot',
            difficulty: this.difficulty,
            performanceStats: this.performanceStats,
            appearance: this.appearance,
            personalityTraits: this.personalityTraits
        };
    }
}

export default Bot;
