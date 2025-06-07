// Constants.js - Game configuration constants and settings

export const PHYSICS_CONFIG = {
    ABSORPTION_THRESHOLD: 1.1, // 110% mass needed to absorb
    SPLIT_MOMENTUM: 15, // Initial velocity of split cells
    RECOMBINE_TIME: 15000, // 15 seconds before cells can merge
    FRICTION: 0.98, // Velocity decay per frame
    BOUNDARY_BOUNCE: 0.8, // Velocity retention on boundary hit
    MASS_SPEED_FACTOR: 0.02, // How much mass affects speed
    MIN_SPLIT_MASS: 35, // Minimum mass required to split
    MAX_CELLS: 16, // Maximum cells per player
    GRAVITY: 0,
    VELOCITY_THRESHOLD: 0.1
};

export const GAME_CONFIG = {
    WORLD_WIDTH: 6000,
    WORLD_HEIGHT: 6000,
    VIEWPORT_BUFFER: 200,
    TARGET_FPS: 60,
    PHYSICS_DELTA: 16.67, // 60 FPS in milliseconds
    
    // Food settings
    FOOD_COUNT: 2000,
    FOOD_MASS: 1,
    FOOD_RESPAWN_DELAY: 1000,
    
    // Player settings
    STARTING_MASS: 20,
    STARTING_RADIUS: Math.sqrt(20 / Math.PI),
    MAX_SPEED: 10,
    MIN_SPEED: 2,
    
    // Bot settings
    BOT_COUNT: 20,
    BOT_SCAN_RADIUS: 200,
    BOT_DECISION_COOLDOWN: 500,
    
    // Camera settings
    CAMERA_SMOOTHING: 0.1,
    ZOOM_FACTOR: 0.5,
    MIN_ZOOM: 0.3,
    MAX_ZOOM: 2.0
};

export const UI_CONFIG = {
    HUD_UPDATE_INTERVAL: 100,
    LEADERBOARD_SIZE: 10,
    LEADERBOARD_UPDATE_INTERVAL: 1000,
    
    // Colors
    BACKGROUND_COLOR: '#111111',
    GRID_COLOR: '#333333',
    TEXT_COLOR: '#ffffff',
    
    // Shop settings
    SHOP_ANIMATION_DURATION: 300
};

export const POWERUP_CONFIG = {
    RECOMBINE: {
        cost: 100,
        cooldown: 30000,
        duration: 2000,
        mergeSpeed: 8.0,
        momentumRetention: 0.3
    },
    SPEED_BOOST: {
        cost: 50,
        cooldown: 20000,
        duration: 10000,
        speedMultiplier: 1.5
    },
    MASS_SHIELD: {
        cost: 150,
        cooldown: 45000,
        duration: 15000,
        damageReduction: 0.5
    },
    SPLIT_BOOST: {
        cost: 75,
        cooldown: 25000,
        duration: 8000,
        splitForceMultiplier: 1.8
    }
};

export const CURRENCY_CONFIG = {
    COINS_PER_MASS: 0.1, // 1 coin per 10 mass absorbed
    COINS_PER_PLAYER_BASE: 10,
    COINS_PER_PLAYER_MASS_BONUS: 1,
    COINS_PER_LEVEL: 25,
    
    PLATINUM_DAILY_BONUS: 1,
    PLATINUM_ACHIEVEMENT_REWARD: 2
};

export const PROGRESSION_CONFIG = {
    XP_PER_MASS: 1,
    XP_PER_PLAYER_KILL: 50,
    XP_PER_LEVEL_BASE: 100,
    XP_LEVEL_MULTIPLIER: 1.5,
    
    PRESTIGE_LEVEL_REQUIREMENT: 50,
    PRESTIGE_XP_BONUS: 0.1, // 10% XP bonus per prestige level
    PRESTIGE_COIN_BONUS: 0.05 // 5% coin bonus per prestige level
};

export const BOT_CONFIG = {
    DIFFICULTIES: {
        easy: {
            reactionTime: 1000,
            accuracy: 0.6,
            aggressionLevel: 0.3,
            splitChance: 0.1
        },
        medium: {
            reactionTime: 700,
            accuracy: 0.8,
            aggressionLevel: 0.5,
            splitChance: 0.2
        },
        hard: {
            reactionTime: 400,
            accuracy: 0.9,
            aggressionLevel: 0.7,
            splitChance: 0.3
        },
        expert: {
            reactionTime: 200,
            accuracy: 0.95,
            aggressionLevel: 0.9,
            splitChance: 0.4
        }
    }
};

export const ACHIEVEMENT_CONFIG = {
    FIRST_KILL: {
        id: 'first_kill',
        name: 'First Blood',
        description: 'Absorb your first player',
        reward: { coins: 50, platinumCoins: 1 }
    },
    MASS_MILESTONE_100: {
        id: 'mass_100',
        name: 'Growing Strong',
        description: 'Reach 100 mass',
        reward: { coins: 100, platinumCoins: 1 }
    },
    MASS_MILESTONE_500: {
        id: 'mass_500',
        name: 'Big Fish',
        description: 'Reach 500 mass',
        reward: { coins: 250, platinumCoins: 2 }
    },
    MASS_MILESTONE_1000: {
        id: 'mass_1000',
        name: 'Massive',
        description: 'Reach 1000 mass',
        reward: { coins: 500, platinumCoins: 3 }
    },
    LEVEL_10: {
        id: 'level_10',
        name: 'Experienced',
        description: 'Reach level 10',
        reward: { coins: 200, platinumCoins: 2 }
    },
    SPLIT_MASTER: {
        id: 'split_master',
        name: 'Split Personality',
        description: 'Successfully split 100 times',
        reward: { coins: 300, platinumCoins: 2 }
    },
    SURVIVAL_5MIN: {
        id: 'survival_5min',
        name: 'Survivor',
        description: 'Survive for 5 minutes',
        reward: { coins: 150, platinumCoins: 1 }
    },
    FIRST_PRESTIGE: {
        id: 'first_prestige',
        name: 'Prestige Pioneer',
        description: 'Complete your first prestige',
        reward: { coins: 1000, platinumCoins: 5 }
    }
};

export const COLORS = {
    // Player colors
    PLAYER_COLORS: [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
        '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
    ],
    
    // UI colors
    PRIMARY: '#4ECDC4',
    SECONDARY: '#45B7D1',
    SUCCESS: '#96CEB4',
    WARNING: '#FFEAA7',
    DANGER: '#FF6B6B',
    DARK: '#2C3E50',
    LIGHT: '#ECF0F1',
    
    // Food colors
    FOOD_COLORS: [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#F39C12', '#E74C3C', '#9B59B6', '#3498DB'
    ]
};

export const PARTICLE_CONFIG = {
    ABSORPTION_PARTICLES: {
        count: 8,
        lifetime: 1000,
        speed: 3,
        fadeSpeed: 0.02
    },
    SPLIT_PARTICLES: {
        count: 12,
        lifetime: 800,
        speed: 5,
        fadeSpeed: 0.025
    },
    DEATH_PARTICLES: {
        count: 20,
        lifetime: 2000,
        speed: 4,
        fadeSpeed: 0.015
    }
};

export const AUDIO_CONFIG = {
    MASTER_VOLUME: 0.7,
    SFX_VOLUME: 0.8,
    MUSIC_VOLUME: 0.5,
    
    SOUNDS: {
        ABSORB: 'absorb.mp3',
        SPLIT: 'split.mp3',
        DEATH: 'death.mp3',
        LEVELUP: 'levelup.mp3',
        POWERUP: 'powerup.mp3',
        PURCHASE: 'purchase.mp3'
    }
};

// Event types for the event system
export const EVENT_TYPES = {
    PLAYER_ABSORB: 'player_absorb',
    PLAYER_SPLIT: 'player_split',
    PLAYER_DEATH: 'player_death',
    PLAYER_LEVEL_UP: 'player_level_up',
    POWERUP_USED: 'powerup_used',
    ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
    CURRENCY_EARNED: 'currency_earned',
    SHOP_PURCHASE: 'shop_purchase',
    GAME_START: 'game_start',
    GAME_END: 'game_end',
    PRESTIGE_COMPLETE: 'prestige_complete'
};

// Input key codes
export const INPUT_KEYS = {
    SPACE: 32,
    W: 87,
    E: 69,
    R: 82,
    T: 84,
    ESCAPE: 27,
    ENTER: 13,
    TAB: 9
};

export default {
    PHYSICS_CONFIG,
    GAME_CONFIG,
    UI_CONFIG,
    POWERUP_CONFIG,
    CURRENCY_CONFIG,
    PROGRESSION_CONFIG,
    BOT_CONFIG,
    ACHIEVEMENT_CONFIG,
    COLORS,
    PARTICLE_CONFIG,
    AUDIO_CONFIG,
    EVENT_TYPES,
    INPUT_KEYS
};
