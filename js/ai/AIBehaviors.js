// AIBehaviors.js - Different AI behavior patterns for bots
import { Utils } from '../utils/Utils.js';

export class AIBehaviors {
    static createBehavior(type) {
        switch (type) {
            case 'hunt': return new HuntBehavior();
            case 'flee': return new FleeBehavior();
            case 'wander': return new WanderBehavior();
            case 'split': return new SplitBehavior();
            case 'aggressive': return new AggressiveBehavior();
            case 'defensive': return new DefensiveBehavior();
            case 'collector': return new CollectorBehavior();
            default: return new WanderBehavior();
        }
    }
}

class BaseBehavior {
    constructor() {
        this.priority = 1;
        this.duration = 0;
        this.cooldown = 0;
    }

    execute(bot, targets, deltaTime) {
        throw new Error('Execute method must be implemented');
    }

    canExecute(bot) {
        return this.cooldown <= 0;
    }

    update(deltaTime) {
        if (this.cooldown > 0) {
            this.cooldown -= deltaTime;
        }
        this.duration += deltaTime;
    }
}

export class HuntBehavior extends BaseBehavior {
    constructor() {
        super();
        this.priority = 3;
        this.huntRange = 150;
        this.attackRange = 50;
    }

    execute(bot, targets, deltaTime) {
        const prey = this.findBestPrey(bot, targets);
        if (!prey) return { action: 'wander', target: null };

        const distance = Utils.distance(bot.x, bot.y, prey.x, prey.y);
        
        if (distance < this.attackRange && bot.totalMass > prey.totalMass * 1.2) {
            // Close enough to attack and we're bigger
            return {
                action: 'attack',
                target: prey,
                moveX: prey.x,
                moveY: prey.y,
                shouldSplit: this.shouldSplitAttack(bot, prey, distance)
            };
        } else if (distance < this.huntRange) {
            // Chase the prey
            return {
                action: 'chase',
                target: prey,
                moveX: prey.x,
                moveY: prey.y
            };
        }

        return { action: 'wander', target: null };
    }

    findBestPrey(bot, targets) {
        let bestPrey = null;
        let bestScore = -1;

        for (const target of targets) {
            if (target === bot || !this.canHunt(bot, target)) continue;

            const distance = Utils.distance(bot.x, bot.y, target.x, target.y);
            if (distance > this.huntRange) continue;

            // Score based on mass ratio and distance
            const massRatio = target.totalMass / bot.totalMass;
            const distanceScore = (this.huntRange - distance) / this.huntRange;
            const score = (1 - massRatio) * distanceScore;

            if (score > bestScore) {
                bestScore = score;
                bestPrey = target;
            }
        }

        return bestPrey;
    }

    canHunt(bot, target) {
        return bot.totalMass > target.totalMass * 0.8; // Only hunt if we're 80% their size or bigger
    }

    shouldSplitAttack(bot, prey, distance) {
        const splitAdvantage = bot.totalMass > prey.totalMass * 1.5;
        const goodDistance = distance < 80 && distance > 30;
        const canRecombine = bot.cells.length < 4;
        
        return splitAdvantage && goodDistance && canRecombine;
    }
}

export class FleeBehavior extends BaseBehavior {
    constructor() {
        super();
        this.priority = 5; // High priority
        this.fleeRange = 200;
        this.panicRange = 100;
    }

    execute(bot, targets, deltaTime) {
        const threats = this.findThreats(bot, targets);
        if (threats.length === 0) return { action: 'wander', target: null };

        const fleeDirection = this.calculateFleeDirection(bot, threats);
        const isPanic = threats.some(t => 
            Utils.distance(bot.x, bot.y, t.x, t.y) < this.panicRange
        );

        return {
            action: 'flee',
            moveX: bot.x + fleeDirection.x * 100,
            moveY: bot.y + fleeDirection.y * 100,
            urgency: isPanic ? 'panic' : 'normal',
            shouldSplit: this.shouldSplitFlee(bot, threats)
        };
    }

    findThreats(bot, targets) {
        const threats = [];
        
        for (const target of targets) {
            if (target === bot) continue;
            
            const distance = Utils.distance(bot.x, bot.y, target.x, target.y);
            if (distance > this.fleeRange) continue;
            
            // Threat if they're significantly bigger
            if (target.totalMass > bot.totalMass * 1.2) {
                threats.push({
                    entity: target,
                    distance: distance,
                    threatLevel: target.totalMass / bot.totalMass
                });
            }
        }

        return threats.sort((a, b) => b.threatLevel - a.threatLevel);
    }

    calculateFleeDirection(bot, threats) {
        let fleeX = 0;
        let fleeY = 0;

        for (const threat of threats) {
            const dx = bot.x - threat.entity.x;
            const dy = bot.y - threat.entity.y;
            const distance = threat.distance;
            
            if (distance > 0) {
                // Weight by inverse distance and threat level
                const weight = (threat.threatLevel / distance) * 100;
                fleeX += (dx / distance) * weight;
                fleeY += (dy / distance) * weight;
            }
        }

        // Normalize
        const magnitude = Math.sqrt(fleeX * fleeX + fleeY * fleeY);
        if (magnitude > 0) {
            return { x: fleeX / magnitude, y: fleeY / magnitude };
        }

        return { x: Math.random() - 0.5, y: Math.random() - 0.5 };
    }

    shouldSplitFlee(bot, threats) {
        // Split to escape if in extreme danger and we have multiple cells
        const extremeDanger = threats.some(t => 
            t.distance < 60 && t.threatLevel > 2
        );
        
        return extremeDanger && bot.cells.length > 1;
    }
}

export class WanderBehavior extends BaseBehavior {
    constructor() {
        super();
        this.priority = 1; // Lowest priority
        this.wanderRadius = 100;
        this.directionChangeTime = 0;
        this.currentDirection = { x: 0, y: 0 };
    }

    execute(bot, targets, deltaTime) {
        this.directionChangeTime -= deltaTime;
        
        if (this.directionChangeTime <= 0) {
            this.currentDirection = this.generateRandomDirection();
            this.directionChangeTime = Utils.randomFloat(2000, 5000); // 2-5 seconds
        }

        // Look for food while wandering
        const nearbyFood = this.findNearbyFood(bot, targets);
        if (nearbyFood) {
            return {
                action: 'collect_food',
                target: nearbyFood,
                moveX: nearbyFood.x,
                moveY: nearbyFood.y
            };
        }

        return {
            action: 'wander',
            moveX: bot.x + this.currentDirection.x * this.wanderRadius,
            moveY: bot.y + this.currentDirection.y * this.wanderRadius
        };
    }

    generateRandomDirection() {
        const angle = Math.random() * Math.PI * 2;
        return {
            x: Math.cos(angle),
            y: Math.sin(angle)
        };
    }

    findNearbyFood(bot, targets) {
        let closestFood = null;
        let closestDistance = 150; // Search radius

        for (const target of targets) {
            if (target.type !== 'food') continue;
            
            const distance = Utils.distance(bot.x, bot.y, target.x, target.y);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestFood = target;
            }
        }

        return closestFood;
    }
}

export class SplitBehavior extends BaseBehavior {
    constructor() {
        super();
        this.priority = 4;
        this.splitCooldown = 3000; // 3 seconds between splits
    }

    execute(bot, targets, deltaTime) {
        if (!this.canSplit(bot)) {
            return { action: 'wander', target: null };
        }

        const target = this.findSplitTarget(bot, targets);
        if (!target) {
            return { action: 'wander', target: null };
        }

        const distance = Utils.distance(bot.x, bot.y, target.x, target.y);
        
        if (distance < 120 && bot.totalMass > target.totalMass * 1.3) {
            this.cooldown = this.splitCooldown;
            return {
                action: 'split_attack',
                target: target,
                moveX: target.x,
                moveY: target.y,
                shouldSplit: true
            };
        }

        return { action: 'wander', target: null };
    }

    canSplit(bot) {
        return bot.cells.length < 4 && bot.totalMass > 70 && this.cooldown <= 0;
    }

    findSplitTarget(bot, targets) {
        for (const target of targets) {
            if (target === bot || target.type === 'food') continue;
            
            const distance = Utils.distance(bot.x, bot.y, target.x, target.y);
            if (distance < 150 && bot.totalMass > target.totalMass * 1.2) {
                return target;
            }
        }
        return null;
    }
}

export class AggressiveBehavior extends BaseBehavior {
    constructor() {
        super();
        this.priority = 4;
        this.aggressionRange = 250;
    }

    execute(bot, targets, deltaTime) {
        const target = this.findAggressiveTarget(bot, targets);
        if (!target) return { action: 'wander', target: null };

        const distance = Utils.distance(bot.x, bot.y, target.x, target.y);
        
        return {
            action: 'aggressive_chase',
            target: target,
            moveX: target.x,
            moveY: target.y,
            shouldSplit: distance < 100 && bot.totalMass > target.totalMass * 1.4
        };
    }

    findAggressiveTarget(bot, targets) {
        let bestTarget = null;
        let bestScore = 0;

        for (const target of targets) {
            if (target === bot || target.type === 'food') continue;
            
            const distance = Utils.distance(bot.x, bot.y, target.x, target.y);
            if (distance > this.aggressionRange) continue;
            
            // Prefer smaller targets that are closer
            const massRatio = target.totalMass / bot.totalMass;
            const distanceScore = (this.aggressionRange - distance) / this.aggressionRange;
            const score = (1 - massRatio) * distanceScore;
            
            if (score > bestScore && bot.totalMass > target.totalMass * 0.9) {
                bestScore = score;
                bestTarget = target;
            }
        }

        return bestTarget;
    }
}

export class DefensiveBehavior extends BaseBehavior {
    constructor() {
        super();
        this.priority = 3;
        this.safeDistance = 180;
    }

    execute(bot, targets, deltaTime) {
        const threats = this.findNearbyThreats(bot, targets);
        
        if (threats.length > 0) {
            // Maintain safe distance
            const avoidDirection = this.calculateAvoidanceDirection(bot, threats);
            return {
                action: 'maintain_distance',
                moveX: bot.x + avoidDirection.x * this.safeDistance,
                moveY: bot.y + avoidDirection.y * this.safeDistance
            };
        }

        // Look for safe food opportunities
        const safeFood = this.findSafeFood(bot, targets);
        if (safeFood) {
            return {
                action: 'safe_collect',
                target: safeFood,
                moveX: safeFood.x,
                moveY: safeFood.y
            };
        }

        return { action: 'wander', target: null };
    }

    findNearbyThreats(bot, targets) {
        return targets.filter(target => {
            if (target === bot || target.type === 'food') return false;
            const distance = Utils.distance(bot.x, bot.y, target.x, target.y);
            return distance < this.safeDistance && target.totalMass > bot.totalMass * 1.1;
        });
    }

    calculateAvoidanceDirection(bot, threats) {
        let avoidX = 0;
        let avoidY = 0;

        for (const threat of threats) {
            const dx = bot.x - threat.x;
            const dy = bot.y - threat.y;
            const distance = Utils.distance(bot.x, bot.y, threat.x, threat.y);
            
            if (distance > 0) {
                const weight = 1 / distance;
                avoidX += (dx / distance) * weight;
                avoidY += (dy / distance) * weight;
            }
        }

        const magnitude = Math.sqrt(avoidX * avoidX + avoidY * avoidY);
        if (magnitude > 0) {
            return { x: avoidX / magnitude, y: avoidY / magnitude };
        }

        return { x: 0, y: 0 };
    }

    findSafeFood(bot, targets) {
        const food = targets.filter(t => t.type === 'food');
        const threats = this.findNearbyThreats(bot, targets);

        for (const f of food) {
            const distanceToFood = Utils.distance(bot.x, bot.y, f.x, f.y);
            if (distanceToFood > 100) continue;

            // Check if any threats are too close to this food
            const isSafe = threats.every(threat => {
                const threatToFood = Utils.distance(threat.x, threat.y, f.x, f.y);
                return threatToFood > 120;
            });

            if (isSafe) return f;
        }

        return null;
    }
}

export class CollectorBehavior extends BaseBehavior {
    constructor() {
        super();
        this.priority = 2;
        this.collectionRadius = 200;
    }

    execute(bot, targets, deltaTime) {
        const food = this.findOptimalFood(bot, targets);
        if (!food) return { action: 'wander', target: null };

        // Check for threats near the food
        const threats = this.findThreatsNearTarget(bot, targets, food);
        
        if (threats.length > 0) {
            // Find alternative food or wait
            const alternativeFood = this.findAlternativeFood(bot, targets, threats);
            if (alternativeFood) {
                return {
                    action: 'collect_safe',
                    target: alternativeFood,
                    moveX: alternativeFood.x,
                    moveY: alternativeFood.y
                };
            }
            return { action: 'wander', target: null };
        }

        return {
            action: 'collect_food',
            target: food,
            moveX: food.x,
            moveY: food.y
        };
    }

    findOptimalFood(bot, targets) {
        const food = targets.filter(t => t.type === 'food');
        let bestFood = null;
        let bestScore = 0;

        for (const f of food) {
            const distance = Utils.distance(bot.x, bot.y, f.x, f.y);
            if (distance > this.collectionRadius) continue;

            // Score based on food value and distance
            const distanceScore = (this.collectionRadius - distance) / this.collectionRadius;
            const valueScore = f.mass || 1;
            const score = distanceScore * valueScore;

            if (score > bestScore) {
                bestScore = score;
                bestFood = f;
            }
        }

        return bestFood;
    }

    findThreatsNearTarget(bot, targets, target) {
        return targets.filter(t => {
            if (t === bot || t.type === 'food') return false;
            const distanceToTarget = Utils.distance(t.x, t.y, target.x, target.y);
            return distanceToTarget < 100 && t.totalMass > bot.totalMass * 1.1;
        });
    }

    findAlternativeFood(bot, targets, threats) {
        const food = targets.filter(t => t.type === 'food');
        
        for (const f of food) {
            const distance = Utils.distance(bot.x, bot.y, f.x, f.y);
            if (distance > this.collectionRadius) continue;

            const isSafe = threats.every(threat => {
                const threatDistance = Utils.distance(threat.x, threat.y, f.x, f.y);
                return threatDistance > 120;
            });

            if (isSafe) return f;
        }

        return null;
    }
}
