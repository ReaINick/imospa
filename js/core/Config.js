
// Game Configuration Constants
export const CONFIG = {
    // Canvas settings
    CANVAS_WIDTH: 1200,
    CANVAS_HEIGHT: 800,
    
    // World settings - Fixed naming to match PhysicsEngine expectations
    WORLD_WIDTH: 4000,
    WORLD_HEIGHT: 4000,
    
    // Alternative world settings (for backward compatibility)
    WORLD: {
        WIDTH: 4000,
        HEIGHT: 4000
    },
    
    // Physics constants - Added missing properties
    PHYSICS: {
        FRICTION: 0.98,
        ABSORPTION_THRESHOLD: 1.1,
        SPLIT_MOMENTUM: 15,
        RECOMBINE_TIME: 15000,
        BOUNDARY_BOUNCE: 0.8,
        MASS_SPEED_FACTOR: 0.02,
        MIN_SPLIT_MASS: 35,
        MAX_CELLS: 16,
        VELOCITY_THRESHOLD: 0.1,
        // Added missing properties
        MAX_VELOCITY: 20,
        BASE_SPEED: 200,
        MIN_SPEED: 50,
        MAX_CELL_MASS: 10000
    },
    
    
    // Player settings
    PLAYER: {
        STARTING_MASS: 20,
        MIN_MASS: 10,
        MAX_MASS: 10000,
        SPLIT_COOLDOWN: 1000,
        NAME_MAX_LENGTH: 12
    },
    
    // Food settings
    FOOD: {
        COUNT: 800,
        MASS: 1,
        RESPAWN_RATE: 0.02,
        MIN_RADIUS: 3,
        MAX_RADIUS: 6
    },
    
    // Bot settings
    BOTS: {
        COUNT: 20,
        DECISION_INTERVAL: 500,
        SCAN_RADIUS: 200,
        AGGRESSION_LEVELS: {
            passive: 0.2,
            normal: 0.5,
            aggressive: 0.8
        }
    },
    
    // Currency and progression
    ECONOMY: {
        COINS_PER_MASS: 0.1,
        COINS_PER_KILL: 25,
        EXP_PER_MASS: 1,
        EXP_PER_KILL: 50,
        LEVEL_BASE_EXP: 100,
        LEVEL_EXP_MULTIPLIER: 1.5
    },
    
    // Shop prices
    SHOP: {
        POWERUPS: {
            recombine: 100,
            speedBoost: 50,
            massShield: 150,
            splitBoost: 75
        },
        BOTS: {
            defender: 500,
            hunter: 750,
            collector: 400
        },
        PREMIUM: {
            customSkin: 2,
            nameColor: 2,
            trailEffect: 3
        }
    },
    
    // Powerup settings
    POWERUPS: {
        RECOMBINE: {
            cooldown: 30000,
            mergeSpeed: 8.0,
            momentumRetention: 0.3,
            duration: 2000
        },
        SPEED_BOOST: {
            cooldown: 20000,
            multiplier: 1.5,
            duration: 10000
        },
        MASS_SHIELD: {
            cooldown: 45000,
            damageReduction: 0.5,
            duration: 15000
        }
    },
    
    // Visual settings
    GRAPHICS: {
        GRID_SIZE: 50,
        GRID_COLOR: '#f0f0f0',
        BACKGROUND_COLOR: '#ffffff',
        VIEWPORT_PADDING: 100,
        CAMERA_SMOOTH: 0.1,
        ZOOM_SMOOTH: 0.05
    },
    
    // Performance settings
    PERFORMANCE: {
        TARGET_FPS: 60,
        QUADTREE_MAX_OBJECTS: 10,
        QUADTREE_MAX_LEVELS: 5,
        RENDER_CULLING: true,
        PARTICLE_LIMIT: 100
    }
};

// Color palettes
export const COLORS = {
    PLAYER_COLORS: [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
        '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
        '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'
    ],
    
    UI_COLORS: {
        PRIMARY: '#3498db',
        SUCCESS: '#2ecc71',
        WARNING: '#f39c12',
        DANGER: '#e74c3c',
        DARK: '#2c3e50',
        LIGHT: '#ecf0f1'
    },
    
    POWERUP_COLORS: {
        recombine: '#9b59b6',
        speedBoost: '#e67e22',
        massShield: '#1abc9c',
        splitBoost: '#f1c40f'
    }
};

// Game states
export const GAME_STATES = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver',
    SHOP: 'shop',
    SETTINGS: 'settings'
};

// Event types
export const EVENTS = {
    PLAYER_SPLIT: 'playerSplit',
    PLAYER_ABSORB: 'playerAbsorb',
    PLAYER_DEATH: 'playerDeath',
    LEVEL_UP: 'levelUp',
    POWERUP_USED: 'powerupUsed',
    COIN_EARNED: 'coinEarned',
    ACHIEVEMENT_UNLOCKED: 'achievementUnlocked'
};
