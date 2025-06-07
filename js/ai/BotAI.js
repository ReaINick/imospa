// BotAI.js - AI behavior system for bots
class BotAI {
    constructor(bot, difficulty = 'medium') {
        this.bot = bot;
        this.difficulty = difficulty;
        this.scanRadius = this.calculateScanRadius();
        this.decisionCooldown = this.calculateDecisionCooldown();
        this.lastDecisionTime = 0;
        this.currentBehavior = 'wander';
        this.target = null;
        this.avoidanceTargets = [];
        this.lastPosition = { x: bot.x, y: bot.y };
        this.stuckCounter = 0;
        this.stuckThreshold = 100; // frames
        this.aggressionLevel = this.calculateAggression();
        this.memoryDuration = 3000; // 3 seconds
        this.threatMemory = new Map();
        this.opportunityMemory = new Map();
    }

    // Calculate scan radius based on difficulty
    calculateScanRadius() {
        const baseRadius = 150;
        const multipliers = {
            easy: 0.7,
            medium: 1.0,
            hard: 1.5,
            expert: 2.0
        };
        return baseRadius * (multipliers[this.difficulty] || 1.0);
    }

    // Calculate decision cooldown based on difficulty
    calculateDecisionCooldown() {
        const baseCooldown = 500; // ms
        const multipliers = {
            easy: 2.0,
            medium: 1.0,
            hard: 0.5,
            expert: 0.25
        };
        return baseCooldown * (multipliers[this.difficulty] || 1.0);
    }

    // Calculate aggression level
    calculateAggression() {
        const baseAggression = 0.5;
        const multipliers = {
            easy: 0.3,
            medium: 0.5,
            hard: 0.7,
            expert: 0.9
        };
        return baseAggression * (multipliers[this.difficulty] || 0.5);
    }

    // Main AI update function
    update(deltaTime, nearbyEntities, gameTime) {
        // Update memories
        this.updateMemories(gameTime);
        
        // Check if stuck and handle it
        this.checkIfStuck();
        
        // Make decision if cooldown has passed
        if (gameTime - this.lastDecisionTime >= this.decisionCooldown) {
            this.makeDecision(nearbyEntities, gameTime);
            this.lastDecisionTime = gameTime;
        }
        
        // Execute current behavior
        this.executeBehavior(deltaTime, nearbyEntities);
        
        // Update last position for stuck detection
        this.lastPosition = { x: this.bot.x, y: this.bot.y };
    }

    // Main decision-making logic
    makeDecision(nearbyEntities, gameTime) {
        const threats = this.findThreats(nearbyEntities);
        const prey = this.findPrey(nearbyEntities);
        const food = this.findFood(nearbyEntities);
        
        // Store important entities in memory
        this.updateThreatMemory(threats, gameTime);
        this.updateOpportunityMemory(prey, food, gameTime);
        
        // Decision priority system
        if (threats.length > 0) {
            this.currentBehavior = 'flee';
            this.target = this.selectFleeTarget(threats);
        } else if (this.shouldSplit(prey)) {
            this.currentBehavior = 'split_attack';
            this.target = this.selectBestPrey(prey);
        } else if (prey.length > 0 && Math.random() < this.aggressionLevel) {
            this.currentBehavior = 'hunt';
            this.target = this.selectBestPrey(prey);
        } else if (food.length > 0) {
            this.currentBehavior = 'collect';
            this.target = this.selectBestFood(food);
        } else {
            this.currentBehavior = 'wander';
            this.target = this.generateWanderTarget();
        }
    }

    // Find threatening entities
    findThreats(entities) {
        return entities.filter(entity => {
            if (entity === this.bot || entity.type !== 'cell') return false;
            
            const distance = this.calculateDistance(entity);
            if (distance > this.scanRadius) return false;
            
            return this.canEntityAbsorb(entity, this.bot);
        });
    }

    // Find prey entities
    findPrey(entities) {
        return entities.filter(entity => {
            if (entity === this.bot || entity.type !== 'cell') return false;
            
            const distance = this.calculateDistance(entity);
            if (distance > this.scanRadius) return false;
            
            return this.canEntityAbsorb(this.bot, entity);
        });
    }

    // Find food entities
    findFood(entities) {
        return entities.filter(entity => {
            if (entity.type !== 'food') return false;
            
            const distance = this.calculateDistance(entity);
            return distance <= this.scanRadius;
        });
    }

    // Check if one entity can absorb another
    canEntityAbsorb(absorber, target) {
        const totalMass = absorber.cells ? 
            absorber.cells.reduce((sum, cell) => sum + cell.mass, 0) : 
            absorber.mass;
        const targetMass = target.cells ? 
            target.cells.reduce((sum, cell) => sum + cell.mass, 0) : 
            target.mass;
        
        return totalMass > targetMass * 1.1; // 10% mass advantage needed
    }

    // Check if bot should attempt splitting
    shouldSplit(prey) {
        if (this.bot.cells.length >= 4) return false; // Too many cells already
        if (this.bot.totalMass < 70) return false; // Not enough mass to split effectively
        
        const largePrey = prey.filter(p => p.mass > this.bot.totalMass * 0.3);
        return largePrey.length > 0 && Math.random() < 0.3;
    }

    // Select best flee target (run away from)
    selectFleeTarget(threats) {
        return threats.reduce((closest, threat) => {
            const distance = this.calculateDistance(threat);
            const closestDistance = this.calculateDistance(closest);
            return distance < closestDistance ? threat : closest;
        });
    }

    // Select best prey target
    selectBestPrey(prey) {
        return prey.reduce((best, target) => {
            const targetScore = this.scorePrey(target);
            const bestScore = this.scorePrey(best);
            return targetScore > bestScore ? target : best;
        });
    }

    // Score prey based on mass and distance
    scorePrey(prey) {
        const distance = this.calculateDistance(prey);
        const massRatio = prey.mass / this.bot.totalMass;
        const distanceScore = Math.max(0, 1 - distance / this.scanRadius);
        const massScore = Math.min(1, massRatio * 2); // Prefer bigger prey up to a point
        
        return (distanceScore * 0.6 + massScore * 0.4) * 100;
    }

    // Select best food target
    selectBestFood(food) {
        return food.reduce((closest, foodItem) => {
            const distance = this.calculateDistance(foodItem);
            const closestDistance = this.calculateDistance(closest);
            return distance < closestDistance ? foodItem : closest;
        });
    }

    // Generate random wander target
    generateWanderTarget() {
        const angle = Math.random() * Math.PI * 2;
        const distance = 100 + Math.random() * 200;
        
        return {
            x: this.bot.x + Math.cos(angle) * distance,
            y: this.bot.y + Math.sin(angle) * distance,
            type: 'wander_point'
        };
    }

    // Execute current behavior
    executeBehavior(deltaTime, nearbyEntities) {
        switch (this.currentBehavior) {
            case 'flee':
                this.executeFlee();
                break;
            case 'hunt':
                this.executeHunt();
                break;
            case 'split_attack':
                this.executeSplitAttack();
                break;
            case 'collect':
                this.executeCollect();
                break;
            case 'wander':
                this.executeWander();
                break;
        }
    }

    // Flee behavior - run away from threats
    executeFlee() {
        if (!this.target) return;
        
        const fleeDirection = {
            x: this.bot.x - this.target.x,
            y: this.bot.y - this.target.y
        };
        
        const length = Math.sqrt(fleeDirection.x ** 2 + fleeDirection.y ** 2);
        if (length > 0) {
            fleeDirection.x /= length;
            fleeDirection.y /= length;
        }
        
        const fleeTarget = {
            x: this.bot.x + fleeDirection.x * 200,
            y: this.bot.y + fleeDirection.y * 200
        };
        
        this.moveTowards(fleeTarget);
    }

    // Hunt behavior - chase prey
    executeHunt() {
        if (!this.target || this.calculateDistance(this.target) > this.scanRadius * 1.5) {
            this.currentBehavior = 'wander';
            return;
        }
        
        this.moveTowards(this.target);
    }

    // Split attack behavior
    executeSplitAttack() {
        if (!this.target) return;
        
        const distance = this.calculateDistance(this.target);
        
        if (distance < 100 && this.bot.cells.length < 4) {
            // Attempt to split towards target
            this.bot.split(this.target.x, this.target.y);
        } else {
            this.moveTowards(this.target);
        }
    }

    // Collect behavior - gather food
    executeCollect() {
        if (!this.target) return;
        
        this.moveTowards(this.target);
    }

    // Wander behavior - random movement
    executeWander() {
        if (!this.target || this.calculateDistance(this.target) < 50) {
            this.target = this.generateWanderTarget();
        }
        
        this.moveTowards(this.target);
    }

    // Move towards a target
    moveTowards(target) {
        if (!target) return;
        
        const direction = {
            x: target.x - this.bot.x,
            y: target.y - this.bot.y
        };
        
        const length = Math.sqrt(direction.x ** 2 + direction.y ** 2);
        if (length > 0) {
            direction.x /= length;
            direction.y /= length;
        }
        
        // Apply movement with some randomness for more natural behavior
        const randomOffset = 0.1;
        direction.x += (Math.random() - 0.5) * randomOffset;
        direction.y += (Math.random() - 0.5) * randomOffset;
        
        // Set bot's target position for movement system
        this.bot.targetX = this.bot.x + direction.x * 1000;
        this.bot.targetY = this.bot.y + direction.y * 1000;
    }

    // Calculate distance to entity
    calculateDistance(entity) {
        if (!entity) return Infinity;
        
        const dx = entity.x - this.bot.x;
        const dy = entity.y - this.bot.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Check if bot is stuck
    checkIfStuck() {
        const distance = this.calculateDistance(this.lastPosition);
        
        if (distance < 5) {
            this.stuckCounter++;
        } else {
            this.stuckCounter = 0;
        }
        
        if (this.stuckCounter > this.stuckThreshold) {
            this.handleStuckState();
        }
    }

    // Handle when bot is stuck
    handleStuckState() {
        this.target = this.generateWanderTarget();
        this.currentBehavior = 'wander';
        this.stuckCounter = 0;
    }

    // Update threat memory
    updateThreatMemory(threats, gameTime) {
        for (const threat of threats) {
            this.threatMemory.set(threat.id, {
                entity: threat,
                timestamp: gameTime,
                dangerLevel: this.calculateDangerLevel(threat)
            });
        }
    }

    // Update opportunity memory
    updateOpportunityMemory(prey, food, gameTime) {
        for (const opportunity of [...prey, ...food]) {
            this.opportunityMemory.set(opportunity.id, {
                entity: opportunity,
                timestamp: gameTime,
                value: this.calculateOpportunityValue(opportunity)
            });
        }
    }

    // Clean old memories
    updateMemories(gameTime) {
        // Clean threat memory
        for (const [id, memory] of this.threatMemory) {
            if (gameTime - memory.timestamp > this.memoryDuration) {
                this.threatMemory.delete(id);
            }
        }
        
        // Clean opportunity memory
        for (const [id, memory] of this.opportunityMemory) {
            if (gameTime - memory.timestamp > this.memoryDuration) {
                this.opportunityMemory.delete(id);
            }
        }
    }

    // Calculate danger level of a threat
    calculateDangerLevel(threat) {
        const massRatio = threat.mass / this.bot.totalMass;
        const distance = this.calculateDistance(threat);
        const proximityFactor = Math.max(0, 1 - distance / this.scanRadius);
        
        return massRatio * proximityFactor;
    }

    // Calculate value of an opportunity
    calculateOpportunityValue(opportunity) {
        if (opportunity.type === 'food') {
            const distance = this.calculateDistance(opportunity);
            return Math.max(0, 1 - distance / this.scanRadius) * 10;
        } else {
            // Prey
            const massRatio = opportunity.mass / this.bot.totalMass;
            const distance = this.calculateDistance(opportunity);
            const proximityFactor = Math.max(0, 1 - distance / this.scanRadius);
            
            return massRatio * proximityFactor * 50;
        }
    }

    // Get current behavior state for debugging
    getBehaviorState() {
        return {
            behavior: this.currentBehavior,
            target: this.target ? {
                type: this.target.type,
                distance: this.calculateDistance(this.target)
            } : null,
            aggressionLevel: this.aggressionLevel,
            threatCount: this.threatMemory.size,
            opportunityCount: this.opportunityMemory.size,
            isStuck: this.stuckCounter > this.stuckThreshold * 0.5
        };
    }

    // Adjust AI parameters dynamically
    adjustDifficulty(newDifficulty) {
        this.difficulty = newDifficulty;
        this.scanRadius = this.calculateScanRadius();
        this.decisionCooldown = this.calculateDecisionCooldown();
        this.aggressionLevel = this.calculateAggression();
    }

    // Reset AI state
    reset() {
        this.currentBehavior = 'wander';
        this.target = null;
        this.avoidanceTargets = [];
        this.stuckCounter = 0;
        this.threatMemory.clear();
        this.opportunityMemory.clear();
        this.lastDecisionTime = 0;
    }
}

export default BotAI;
