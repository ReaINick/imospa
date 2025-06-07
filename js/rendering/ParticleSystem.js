// js/rendering/ParticleSystem.js
import { Config } from '../core/Config.js';
import { Utils } from '../utils/Utils.js';

export class ParticleSystem {
    constructor() {
        this.particles = [];
        this.particlePool = [];
        this.maxParticles = Config.PARTICLES.MAX_PARTICLES;
        
        // Pre-allocate particle pool for performance
        this.initializeParticlePool();
    }
    
    initializeParticlePool() {
        for (let i = 0; i < this.maxParticles; i++) {
            this.particlePool.push(this.createParticle());
        }
    }
    
    createParticle() {
        return {
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            life: 1.0,
            maxLife: 1.0,
            size: 1,
            color: '#ffffff',
            type: 'default',
            active: false,
            alpha: 1.0,
            decay: 0.02,
            gravity: 0
        };
    }
    
    getParticleFromPool() {
        for (let particle of this.particlePool) {
            if (!particle.active) {
                particle.active = true;
                return particle;
            }
        }
        return null;
    }
    
    returnParticleToPool(particle) {
        particle.active = false;
        const index = this.particles.indexOf(particle);
        if (index > -1) {
            this.particles.splice(index, 1);
        }
    }
    
    createAbsorptionEffect(x, y, absorberColor, targetMass) {
        const particleCount = Math.min(20, Math.floor(targetMass / 5));
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.getParticleFromPool();
            if (!particle) break;
            
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = Utils.random(2, 6);
            
            particle.x = x + Utils.random(-10, 10);
            particle.y = y + Utils.random(-10, 10);
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed;
            particle.life = 1.0;
            particle.maxLife = Utils.random(0.8, 1.2);
            particle.size = Utils.random(2, 5);
            particle.color = absorberColor;
            particle.type = 'absorption';
            particle.alpha = 0.8;
            particle.decay = Utils.random(0.015, 0.025);
            particle.gravity = -0.1;
            
            this.particles.push(particle);
        }
    }
    
    createSplitEffect(x, y, cellColor, cellRadius) {
        const particleCount = Math.min(15, Math.floor(cellRadius / 3));
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.getParticleFromPool();
            if (!particle) break;
            
            const angle = Utils.random(0, Math.PI * 2);
            const speed = Utils.random(3, 8);
            
            particle.x = x;
            particle.y = y;
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed;
            particle.life = 1.0;
            particle.maxLife = Utils.random(0.6, 1.0);
            particle.size = Utils.random(1, 3);
            particle.color = cellColor;
            particle.type = 'split';
            particle.alpha = 0.9;
            particle.decay = Utils.random(0.02, 0.035);
            particle.gravity = 0;
            
            this.particles.push(particle);
        }
    }
    
    createDeathEffect(x, y, cellColor, cellRadius) {
        const particleCount = Math.min(30, Math.floor(cellRadius / 2));
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.getParticleFromPool();
            if (!particle) break;
            
            const angle = Utils.random(0, Math.PI * 2);
            const speed = Utils.random(1, 10);
            
            particle.x = x + Utils.random(-cellRadius/2, cellRadius/2);
            particle.y = y + Utils.random(-cellRadius/2, cellRadius/2);
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed;
            particle.life = 1.0;
            particle.maxLife = Utils.random(1.0, 2.0);
            particle.size = Utils.random(2, 6);
            particle.color = cellColor;
            particle.type = 'death';
            particle.alpha = 1.0;
            particle.decay = Utils.random(0.01, 0.02);
            particle.gravity = 0.05;
            
            this.particles.push(particle);
        }
    }
    
    createPowerupEffect(x, y, powerupType) {
        const colors = {
            speed: '#ffff00',
            shield: '#00ffff',
            recombine: '#ff00ff',
            split: '#ff8800'
        };
        
        const color = colors[powerupType] || '#ffffff';
        const particleCount = 12;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = this.getParticleFromPool();
            if (!particle) break;
            
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = Utils.random(4, 8);
            
            particle.x = x;
            particle.y = y;
            particle.vx = Math.cos(angle) * speed;
            particle.vy = Math.sin(angle) * speed;
            particle.life = 1.0;
            particle.maxLife = 1.5;
            particle.size = Utils.random(3, 6);
            particle.color = color;
            particle.type = 'powerup';
            particle.alpha = 1.0;
            particle.decay = 0.015;
            particle.gravity = -0.05;
            
            this.particles.push(particle);
        }
    }
    
    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Update position
            particle.x += particle.vx * deltaTime;
            particle.y += particle.vy * deltaTime;
            
            // Apply gravity
            particle.vy += particle.gravity * deltaTime;
            
            // Apply friction
            particle.vx *= 0.98;
            particle.vy *= 0.98;
            
            // Update life
            particle.life -= particle.decay * deltaTime;
            particle.alpha = particle.life / particle.maxLife;
            
            // Remove dead particles
            if (particle.life <= 0 || particle.alpha <= 0) {
                this.returnParticleToPool(particle);
            }
        }
    }
    
    render(ctx, camera) {
        ctx.save();
        
        for (const particle of this.particles) {
            if (!particle.active) continue;
            
            // Check if particle is in viewport
            const screenX = particle.x - camera.x;
            const screenY = particle.y - camera.y;
            
            if (screenX < -50 || screenX > camera.width + 50 ||
                screenY < -50 || screenY > camera.height + 50) {
                continue;
            }
            
            ctx.globalAlpha = particle.alpha;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(screenX, screenY, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    clear() {
        for (const particle of this.particles) {
            this.returnParticleToPool(particle);
        }
    }
    
    getParticleCount() {
        return this.particles.length;
    }
}
