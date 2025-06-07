// js/entities/Powerup.js
import { Utils } from '../utils/Utils.js';
import { CONFIG } from '../core/Config.js';

export class Powerup {
    constructor(x, y, type, value = 1) {
        this.x = x;
        this.y = y;
        this.type = type; // 'coin', 'platinumCoin', 'tempPowerup'
        this.value = value;
        this.radius = this.calculateRadius();
        this.id = Utils.generateId();
        this.velocity = { x: 0, y: 0 };
        
        // Visual properties
        this.color = this.getTypeColor();
        this.glowIntensity = 0;
        this.animationTime = 0;
        this.pulseSpeed = 0.05;
        
        // Physics properties
        this.mass = 1;
        this.collected = false;
        this.spawnTime = Date.now();
        this.lifetime = this.getLifetime();
        
        // Special effects
        this.sparkleParticles = [];
        this.magneticPull = false;
        this.attractionRadius = 0;
    }
    
    calculateRadius() {
        switch (this.type) {
            case 'coin':
                return 8 + Math.log(this.value + 1) * 2;
            case 'platinumCoin':
                return 12 + Math.log(this.value + 1) * 2;
            case 'tempPowerup':
                return 15;
            default:
                return 8;
        }
    }
    
    getTypeColor() {
        switch (this.type) {
            case 'coin':
                return '#FFD700'; // Gold
            case 'platinumCoin':
                return '#E5E4E2'; // Platinum
            case 'tempPowerup':
                return '#FF4500'; // Orange-red
            default:
                return '#FFFFFF';
        }
    }
    
    getLifetime() {
        switch (this.type) {
            case 'coin':
                return 60000; // 60 seconds
            case 'platinumCoin':
                return 120000; // 120 seconds
            case 'tempPowerup':
                return 30000; // 30 seconds
            default:
                return 60000;
        }
    }
    
    update(deltaTime, currentTime) {
        // Update animation
        this.animationTime += deltaTime;
        this.updateVisualEffects(deltaTime);
        
        // Update physics
        this.updateMovement(deltaTime);
        
        // Check lifetime
        if (this.shouldExpire(currentTime)) {
            this.expire();
        }
        
        // Update particles
        this.updateParticles(deltaTime);
    }
    
    updateVisualEffects(deltaTime) {
        // Pulsing glow effect
        this.glowIntensity = Math.sin(this.animationTime * this.pulseSpeed) * 0.5 + 0.5;
        
        // Floating animation for premium items
        if (this.type === 'platinumCoin' || this.type === 'tempPowerup') {
            this.y += Math.sin(this.animationTime * 0.001) * 0.2;
        }
        
        // Rotation for coins
        if (this.type === 'coin' || this.type === 'platinumCoin') {
            this.rotation = (this.animationTime * 0.002) % (Math.PI * 2);
        }
    }
    
    updateMovement(deltaTime) {
        // Apply velocity
        this.x += this.velocity.x * deltaTime;
        this.y += this.velocity.y * deltaTime;
        
        // Apply friction
        this.velocity.x *= CONFIG.physics.friction;
        this.velocity.y *= CONFIG.physics.friction;
        
        // Stop very small movements
        if (Math.abs(this.velocity.x) < 0.1) this.velocity.x = 0;
        if (Math.abs(this.velocity.y) < 0.1) this.velocity.y = 0;
    }
    
    updateParticles(deltaTime) {
        // Update sparkle particles for premium items
        if (this.type === 'platinumCoin') {
            this.updateSparkleParticles(deltaTime);
            
            // Occasionally spawn new sparkles
            if (Math.random() < 0.1) {
                this.createSparkleParticle();
            }
        }
    }
    
    updateSparkleParticles(deltaTime) {
        this.sparkleParticles = this.sparkleParticles.filter(particle => {
            particle.life -= deltaTime;
            particle.x += particle.velocity.x * deltaTime;
            particle.y += particle.velocity.y * deltaTime;
            particle.alpha = particle.life / particle.maxLife;
            return particle.life > 0;
        });
    }
    
    createSparkleParticle() {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * this.radius;
        
        this.sparkleParticles.push({
            x: this.x + Math.cos(angle) * distance,
            y: this.y + Math.sin(angle) * distance,
            velocity: {
                x: (Math.random() - 0.5) * 0.5,
                y: (Math.random() - 0.5) * 0.5
            },
            life: 2000,
            maxLife: 2000,
            alpha: 1,
            size: Math.random() * 3 + 1
        });
    }
    
    shouldExpire(currentTime) {
        return currentTime - this.spawnTime > this.lifetime;
    }
    
    expire() {
        this.collected = true;
        this.createExpireEffect();
    }
    
    createExpireEffect() {
        // Create fade-out particles
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            this.sparkleParticles.push({
                x: this.x,
                y: this.y,
                velocity: {
                    x: Math.cos(angle) * 2,
                    y: Math.sin(angle) * 2
                },
                life: 1000,
                maxLife: 1000,
                alpha: 1,
                size: 2
            });
        }
    }
    
    canBeCollectedBy(cell) {
        if (this.collected) return false;
        
        // Check if cell is large enough relative to powerup
        const minMassRatio = this.getMinMassRatio();
        return cell.mass >= minMassRatio;
    }
    
    getMinMassRatio() {
        switch (this.type) {
            case 'coin':
                return 5; // Any cell with mass >= 5 can collect
            case 'platinumCoin':
                return 10; // Slightly harder to collect
            case 'tempPowerup':
                return 15; // Requires decent size
            default:
                return 5;
        }
    }
    
    collect(player) {
        if (this.collected || !this.canBeCollectedBy(player.cells[0])) {
            return false;
        }
        
        this.collected = true;
        this.applyEffect(player);
        this.createCollectionEffect();
        
        return true;
    }
    
    applyEffect(player) {
        switch (this.type) {
            case 'coin':
                player.coins += this.value;
                break;
            case 'platinumCoin':
                player.platinumCoins += this.value;
                break;
            case 'tempPowerup':
                this.applyTempPowerup(player);
                break;
        }
    }
    
    applyTempPowerup(player) {
        // Apply temporary effect based on powerup subtype
        const effects = [
            'speedBoost',
            'massShield',
            'magnetism'
        ];
        
        const randomEffect = effects[Math.floor(Math.random() * effects.length)];
        
        // This would integrate with PowerupSystem
        if (player.game && player.game.powerupSystem) {
            player.game.powerupSystem.usePowerup(player, randomEffect);
        }
    }
    
    createCollectionEffect() {
        // Create collection particle burst
        const particleCount = this.type === 'platinumCoin' ? 12 : 8;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 3 + Math.random() * 2;
            
            this.sparkleParticles.push({
                x: this.x,
                y: this.y,
                velocity: {
                    x: Math.cos(angle) * speed,
                    y: Math.sin(angle) * speed
                },
                life: 800,
                maxLife: 800,
                alpha: 1,
                size: 3
            });
        }
    }
    
    // Magnetic attraction for magnetism powerup
    applyMagneticForce(sourceX, sourceY, force) {
        if (this.collected) return;
        
        const dx = sourceX - this.x;
        const dy = sourceY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const forceAmount = force / (distance * distance + 1);
            this.velocity.x += (dx / distance) * forceAmount;
            this.velocity.y += (dy / distance) * forceAmount;
        }
    }
    
    // Check collision with cell
    collidesWith(cell) {
        if (this.collected) return false;
        
        const dx = this.x - cell.x;
        const dy = this.y - cell.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < (this.radius + cell.radius);
    }
    
    // Get render data for renderer
    getRenderData() {
        return {
            x: this.x,
            y: this.y,
            radius: this.radius,
            color: this.color,
            glowIntensity: this.glowIntensity,
            rotation: this.rotation || 0,
            type: this.type,
            value: this.value,
            sparkleParticles: this.sparkleParticles,
            collected: this.collected
        };
    }
    
    // Static factory methods
    static createCoin(x, y, value = 1) {
        return new Powerup(x, y, 'coin', value);
    }
    
    static createPlatinumCoin(x, y, value = 1) {
        return new Powerup(x, y, 'platinumCoin', value);
    }
    
    static createTempPowerup(x, y) {
        return new Powerup(x, y, 'tempPowerup');
    }
    
    // Spawn coins from player death
    static spawnCoinsFromPlayer(player, spawnCount = 5) {
        const coins = [];
        const baseValue = Math.floor(player.totalMass / 20);
        
        for (let i = 0; i < spawnCount; i++) {
            const angle = (i / spawnCount) * Math.PI * 2;
            const distance = player.cells[0].radius + 20;
            const x = player.x + Math.cos(angle) * distance;
            const y = player.y + Math.sin(angle) * distance;
            
            const coin = Powerup.createCoin(x, y, Math.max(1, baseValue));
            
            // Add some initial velocity
            coin.velocity.x = Math.cos(angle) * 2;
            coin.velocity.y = Math.sin(angle) * 2;
            
            coins.push(coin);
        }
        
        return coins;
    }
}
