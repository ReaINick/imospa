// js/ui/Shop.js
import { CONFIG } from '../core/Config.js';
import { gameEvents } from '../core/EventSystem.js';
import { Utils } from '../utils/Utils.js';

export class Shop {
    constructor(game) {
        this.game = game;
        this.isOpen = false;
        this.currentCategory = 'powerups';
        this.selectedItem = null;
        
        // Initialize shop items
        this.items = this.initializeShopItems();
        this.categories = ['powerups', 'cosmetics', 'premium'];
        
        this.setupEventListeners();
        this.createShopUI();
    }
    
    initializeShopItems() {
        return {
            // Powerups
            recombine: {
                id: 'recombine',
                name: 'Recombine',
                description: 'Instantly merge all your cells in the direction of your mouse',
                category: 'powerups',
                cost: 100,
                currency: 'coins',
                icon: '🔄',
                type: 'consumable',
                maxStack: 5
            },
            speedBoost: {
                id: 'speedBoost',
                name: 'Speed Boost',
                description: 'Increases movement speed by 50% for 10 seconds',
                category: 'powerups',
                cost: 50,
                currency: 'coins',
                icon: '⚡',
                type: 'consumable',
                maxStack: 10
            },
            massShield: {
                id: 'massShield',
                name: 'Mass Shield',
                description: 'Reduces mass loss when eaten by 50% for 15 seconds',
                category: 'powerups',
                cost: 150,
                currency: 'coins',
                icon: '🛡️',
                type: 'consumable',
                maxStack: 5
            },
            splitBoost: {
                id: 'splitBoost',
                name: 'Split Boost',
                description: 'Increases split distance and speed by 100% for 8 seconds',
                category: 'powerups',
                cost: 75,
                currency: 'coins',
                icon: '💥',
                type: 'consumable',
                maxStack: 8
            },
            magnetism: {
                id: 'magnetism',
                name: 'Food Magnetism',
                description: 'Attracts nearby food for 12 seconds',
                category: 'powerups',
                cost: 80,
                currency: 'coins',
                icon: '🧲',
                type: 'consumable',
                maxStack: 7
            },
            
            // Cosmetics
            rainbowSkin: {
                id: 'rainbowSkin',
                name: 'Rainbow Skin',
                description: 'Animated rainbow colors for your cells',
                category: 'cosmetics',
                cost: 500,
                currency: 'coins',
                icon: '🌈',
                type: 'permanent',
                unlocked: false
            },
            neonGlow: {
                id: 'neonGlow',
                name: 'Neon Glow',
                description: 'Glowing outline effect for your cells',
                category: 'cosmetics',
                cost: 300,
                currency: 'coins',
                icon: '✨',
                type: 'permanent',
                unlocked: false
            },
            nameColor: {
                id: 'nameColor',
                name: 'Custom Name Color',
                description: 'Choose a custom color for your name',
                category: 'cosmetics',
                cost: 200,
                currency: 'coins',
                icon: '🎨',
                type: 'permanent',
                unlocked: false
            },
            
            // Premium Items
            doubleXP: {
                id: 'doubleXP',
                name: 'Double XP',
                description: 'Earn 2x experience for 1 hour',
                category: 'premium',
                cost: 2,
                currency: 'platinum',
                icon: '⭐',
                type: 'consumable',
                maxStack: 3
            },
            extraLife: {
                id: 'extraLife',
                name: 'Extra Life',
                description: 'Respawn once with 50% of your mass',
                category: 'premium',
                cost: 3,
                currency: 'platinum',
                icon: '❤️',
                type: 'consumable',
                maxStack: 1
            },
            platinumTrail: {
                id: 'platinumTrail',
                name: 'Platinum Trail',
                description: 'Exclusive platinum particle trail',
                category: 'premium',
                cost: 5,
                currency: 'platinum',
                icon: '💎',
                type: 'permanent',
                unlocked: false
            }
        };
    }
    
    setupEventListeners() {
        gameEvents.on('keydown', (data) => {
            if (data.key === 'Tab' || data.key === 'Escape') {
                this.toggleShop();
            }
        });
        
        gameEvents.on('playerStatsUpdated', () => {
            this.updateCurrencyDisplay();
        });
    }
    
    createShopUI() {
        const shopContainer = document.createElement('div');
        shopContainer.id = 'shop-container';
        shopContainer.className = 'shop-container hidden';
        shopContainer.innerHTML = `
            <div class="shop-window">
                <div class="shop-header">
                    <h2>Shop</h2>
                    <button class="close-btn" onclick="window.game.ui.shop.toggleShop()">×</button>
                </div>
                
                <div class="shop-currency">
                    <div class="currency-display">
                        <span class="coins-display">
                            <span class="coin-icon">🪙</span>
                            <span id="shop-coins">0</span>
                        </span>
                        <span class="platinum-display">
                            <span class="platinum-icon">💎</span>
                            <span id="shop-platinum">0</span>
                        </span>
                    </div>
                </div>
                
                <div class="shop-categories">
                    <button class="category-btn active" data-category="powerups">Powerups</button>
                    <button class="category-btn" data-category="cosmetics">Cosmetics</button>
                    <button class="category-btn" data-category="premium">Premium</button>
                </div>
                
                <div class="shop-content">
                    <div class="shop-items" id="shop-items"></div>
                    
                    <div class="shop-details" id="shop-details">
                        <div class="no-selection">
                            <p>Select an item to view details</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(shopContainer);
        this.shopContainer = shopContainer;
        
        // Add category button listeners
        const categoryButtons = shopContainer.querySelectorAll('.category-btn');
        categoryButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchCategory(btn.dataset.category);
            });
        });
        
        this.updateShopDisplay();
    }
    
    toggleShop() {
        this.isOpen = !this.isOpen;
        
        if (this.isOpen) {
            this.shopContainer.classList.remove('hidden');
            this.updateCurrencyDisplay();
            this.updateShopDisplay();
        } else {
            this.shopContainer.classList.add('hidden');
        }
        
        gameEvents.emit('shopToggled', { isOpen: this.isOpen });
    }
    
    switchCategory(category) {
        if (this.categories.includes(category)) {
            this.currentCategory = category;
            
            // Update category buttons
            const categoryButtons = this.shopContainer.querySelectorAll('.category-btn');
            categoryButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.category === category);
            });
            
            this.updateShopDisplay();
        }
    }
    
    updateShopDisplay() {
        const itemsContainer = this.shopContainer.querySelector('#shop-items');
        const categoryItems = this.getItemsByCategory(this.currentCategory);
        
        itemsContainer.innerHTML = '';
        
        categoryItems.forEach(item => {
            const itemElement = this.createItemElement(item);
            itemsContainer.appendChild(itemElement);
        });
    }
    
    getItemsByCategory(category) {
        return Object.values(this.items).filter(item => item.category === category);
    }
    
    createItemElement(item) {
        const player = this.game.player;
        const canAfford = this.canPlayerAfford(player, item);
        const owned = this.getPlayerItemCount(player, item.id);
        
        const itemDiv = document.createElement('div');
        itemDiv.className = `shop-item ${canAfford ? '' : 'disabled'}`;
        itemDiv.dataset.itemId = item.id;
        
        const currencyIcon = item.currency === 'platinum' ? '💎' : '🪙';
        const stackInfo = item.type === 'consumable' ? `(${owned}/${item.maxStack})` : '';
        
        itemDiv.innerHTML = `
            <div class="item-icon">${item.icon}</div>
            <div class="item-info">
                <div class="item-name">${item.name} ${stackInfo}</div>
                <div class="item-price">
                    ${currencyIcon} ${item.cost}
                </div>
            </div>
        `;
        
        itemDiv.addEventListener('click', () => {
            this.selectItem(item);
        });
        
        return itemDiv;
    }
    
    selectItem(item) {
        this.selectedItem = item;
        this.updateItemDetails(item);
        
        // Update visual selection
        const itemElements = this.shopContainer.querySelectorAll('.shop-item');
        itemElements.forEach(el => {
            el.classList.toggle('selected', el.dataset.itemId === item.id);
        });
    }
    
    updateItemDetails(item) {
        const detailsContainer = this.shopContainer.querySelector('#shop-details');
        const player = this.game.player;
        const canAfford = this.canPlayerAfford(player, item);
        const owned = this.getPlayerItemCount(player, item.id);
        const canPurchase = this.canPurchaseItem(player, item);
        
        const currencyIcon = item.currency === 'platinum' ? '💎' : '🪙';
        
        detailsContainer.innerHTML = `
            <div class="item-details">
                <div class="item-header">
                    <span class="item-icon-large">${item.icon}</span>
                    <h3>${item.name}</h3>
                </div>
                
                <div class="item-description">
                    <p>${item.description}</p>
                </div>
                
                <div class="item-stats">
                    <div class="stat-row">
                        <span>Type:</span>
                        <span>${item.type}</span>
                    </div>
                    <div class="stat-row">
                        <span>Price:</span>
                        <span>${currencyIcon} ${item.cost}</span>
                    </div>
                    ${item.type === 'consumable' ? `
                        <div class="stat-row">
                            <span>Owned:</span>
                            <span>${owned}/${item.maxStack}</span>
                        </div>
                    ` : ''}
                    ${item.type === 'permanent' && item.unlocked ? `
                        <div class="stat-row">
                            <span>Status:</span>
                            <span class="owned-text">Owned</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="purchase-section">
                    <button class="purchase-btn ${canPurchase ? '' : 'disabled'}" 
                            onclick="window.game.ui.shop.purchaseItem('${item.id}')"
                            ${canPurchase ? '' : 'disabled'}>
                        ${this.getPurchaseButtonText(item, canAfford, owned)}
                    </button>
                </div>
            </div>
        `;
    }
    
    getPurchaseButtonText(item, canAfford, owned) {
        if (item.type === 'permanent' && item.unlocked) {
            return 'Owned';
        }
        if (item.type === 'consumable' && owned >= item.maxStack) {
            return 'Max Stack';
        }
        if (!canAfford) {
            return 'Insufficient Funds';
        }
        return 'Purchase';
    }
    
    canPlayerAfford(player, item) {
        if (item.currency === 'coins') {
            return player.coins >= item.cost;
        } else if (item.currency === 'platinum') {
            return player.platinumCoins >= item.cost;
        }
        return false;
    }
    
    canPurchaseItem(player, item) {
        if (!this.canPlayerAfford(player, item)) return false;
        
        if (item.type === 'permanent' && item.unlocked) {
            return false; // Already owned
        }
        
        if (item.type === 'consumable') {
            const owned = this.getPlayerItemCount(player, item.id);
            return owned < item.maxStack;
        }
        
        return true;
    }
    
    getPlayerItemCount(player, itemId) {
        return player.inventory.get(itemId) || 0;
    }
    
    purchaseItem(itemId) {
        const item = this.items[itemId];
        const player = this.game.player;
        
        if (!item || !this.canPurchaseItem(player, item)) {
            return false;
        }
        
        // Deduct currency
        if (item.currency === 'coins') {
            player.coins -= item.cost;
        } else if (item.currency === 'platinum') {
            player.platinumCoins -= item.cost;
        }
        
        // Grant item
        this.grantItem(player, item);
        
        // Update displays
        this.updateCurrencyDisplay();
        this.updateShopDisplay();
        if (this.selectedItem && this.selectedItem.id === itemId) {
            this.updateItemDetails(item);
        }
        
        // Emit purchase event
        gameEvents.emit('itemPurchased', {
            player: player,
            item: item
        });
        
        // Save progress
        this.game.saveSystem.save();
        
        return true;
    }
    
    grantItem(player, item) {
        if (item.type === 'permanent') {
            item.unlocked = true;
            player.unlockedItems.add(item.id);
        } else if (item.type === 'consumable') {
            const currentCount = player.inventory.get(item.id) || 0;
            player.inventory.set(item.id, Math.min(currentCount + 1, item.maxStack));
        }
    }
    
    updateCurrencyDisplay() {
        const player = this.game.player;
        const coinsDisplay = this.shopContainer.querySelector('#shop-coins');
        const platinumDisplay = this.shopContainer.querySelector('#shop-platinum');
        
        if (coinsDisplay) coinsDisplay.textContent = player.coins;
        if (platinumDisplay) platinumDisplay.textContent = player.platinumCoins;
    }
    
    // Public methods for other systems
    getShopItem(itemId) {
        return this.items[itemId];
    }
    
    getAllItems() {
        return this.items;
    }
    
    getItemsByType(type) {
        return Object.values(this.items).filter(item => item.type === type);
    }
    
    hasPlayerUnlocked(player, itemId) {
        const item = this.items[itemId];
        if (!item) return false;
        
        if (item.type === 'permanent') {
            return item.unlocked || player.unlockedItems.has(itemId);
        }
        
        return true; // Consumables are always "unlocked"
    }
    
    useConsumableItem(player, itemId) {
        const item = this.items[itemId];
        if (!item || item.type !== 'consumable') return false;
        
        const currentCount = player.inventory.get(itemId) || 0;
        if (currentCount <= 0) return false;
        
        // Consume the item
        player.inventory.set(itemId, currentCount - 1);
        
        // Apply the item effect (handled by other systems)
        gameEvents.emit('consumableItemUsed', {
            player: player,
            item: item
        });
        
        return true;
    }
}
