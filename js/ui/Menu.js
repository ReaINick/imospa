// js/ui/Menu.js
class Menu {
    constructor(eventSystem) {
        this.eventSystem = eventSystem;
        this.isVisible = true;
        this.currentMenu = 'main';
        this.selectedAccount = null;
        this.menuHistory = [];
        
        this.menus = {
            main: this.createMainMenu(),
            play: this.createPlayMenu(),
            settings: this.createSettingsMenu(),
            accounts: this.createAccountsMenu(),
            achievements: this.createAchievementsMenu(),
            statistics: this.createStatisticsMenu()
        };
        
        this.setupEventListeners();
        this.createMenuElements();
    }
    
    createMainMenu() {
        return {
            title: 'Agar.io Clone',
            buttons: [
                { id: 'play', text: 'Play', action: () => this.showMenu('play') },
                { id: 'accounts', text: 'Accounts', action: () => this.showMenu('accounts') },
                { id: 'achievements', text: 'Achievements', action: () => this.showMenu('achievements') },
                { id: 'settings', text: 'Settings', action: () => this.showMenu('settings') },
                { id: 'statistics', text: 'Statistics', action: () => this.showMenu('statistics') }
            ]
        };
    }
    
    createPlayMenu() {
        return {
            title: 'Play Game',
            buttons: [
                { id: 'quickplay', text: 'Quick Play', action: () => this.startGame('quick') },
                { id: 'custom', text: 'Custom Game', action: () => this.startGame('custom') },
                { id: 'tutorial', text: 'Tutorial', action: () => this.startGame('tutorial') },
                { id: 'back', text: 'Back', action: () => this.goBack() }
            ],
            inputs: [
                { id: 'playerName', type: 'text', placeholder: 'Enter your name...', maxLength: 16 }
            ]
        };
    }
    
    createSettingsMenu() {
        return {
            title: 'Settings',
            buttons: [
                { id: 'graphics', text: 'Graphics', action: () => this.showGraphicsSettings() },
                { id: 'audio', text: 'Audio', action: () => this.showAudioSettings() },
                { id: 'controls', text: 'Controls', action: () => this.showControlSettings() },
                { id: 'reset', text: 'Reset Progress', action: () => this.confirmReset() },
                { id: 'back', text: 'Back', action: () => this.goBack() }
            ],
            sliders: [
                { id: 'volume', label: 'Master Volume', min: 0, max: 100, value: 50 },
                { id: 'sfxVolume', label: 'SFX Volume', min: 0, max: 100, value: 75 }
            ],
            checkboxes: [
                { id: 'showFPS', label: 'Show FPS', checked: false },
                { id: 'particleEffects', label: 'Particle Effects', checked: true },
                { id: 'smoothCamera', label: 'Smooth Camera', checked: true }
            ]
        };
    }
    
    createAccountsMenu() {
        return {
            title: 'Account Management',
            buttons: [
                { id: 'createAccount', text: 'Create Account', action: () => this.showCreateAccount() },
                { id: 'loadAccount', text: 'Load Account', action: () => this.showLoadAccount() },
                { id: 'deleteAccount', text: 'Delete Account', action: () => this.showDeleteAccount() },
                { id: 'back', text: 'Back', action: () => this.goBack() }
            ]
        };
    }
    
    createAchievementsMenu() {
        return {
            title: 'Achievements',
            buttons: [
                { id: 'back', text: 'Back', action: () => this.goBack() }
            ]
        };
    }
    
    createStatisticsMenu() {
        return {
            title: 'Statistics',
            buttons: [
                { id: 'back', text: 'Back', action: () => this.goBack() }
            ]
        };
    }
    
    createMenuElements() {
        this.menuElement = document.createElement('div');
        this.menuElement.id = 'gameMenu';
        this.menuElement.className = 'menu-container';
        
        this.overlayElement = document.createElement('div');
        this.overlayElement.className = 'menu-overlay';
        
        document.body.appendChild(this.overlayElement);
        document.body.appendChild(this.menuElement);
        
        this.render();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                if (this.currentMenu !== 'main') {
                    this.goBack();
                } else {
                    this.hide();
                    this.eventSystem.emit('menu:hidden');
                }
            }
        });
        
        this.eventSystem.on('game:ended', () => {
            this.show();
        });
        
        this.eventSystem.on('account:created', (account) => {
            this.selectedAccount = account;
            this.showMenu('main');
        });
    }
    
    render() {
        const menu = this.menus[this.currentMenu];
        if (!menu) return;
        
        this.menuElement.innerHTML = '';
        
        // Title
        const titleElement = document.createElement('h1');
        titleElement.className = 'menu-title';
        titleElement.textContent = menu.title;
        this.menuElement.appendChild(titleElement);
        
        // Current account info
        if (this.selectedAccount && this.currentMenu === 'main') {
            const accountInfo = document.createElement('div');
            accountInfo.className = 'account-info';
            accountInfo.innerHTML = `
                <div class="account-name">${this.selectedAccount.name}</div>
                <div class="account-level">Level ${this.selectedAccount.level}</div>
                <div class="account-coins">
                    <span class="coins">${this.selectedAccount.coins}</span>
                    <span class="platinum-coins">${this.selectedAccount.platinumCoins} PC</span>
                </div>
            `;
            this.menuElement.appendChild(accountInfo);
        }
        
        // Input fields
        if (menu.inputs) {
            const inputContainer = document.createElement('div');
            inputContainer.className = 'menu-inputs';
            
            menu.inputs.forEach(input => {
                const inputElement = document.createElement('input');
                inputElement.type = input.type;
                inputElement.id = input.id;
                inputElement.placeholder = input.placeholder || '';
                inputElement.maxLength = input.maxLength || 50;
                inputElement.className = 'menu-input';
                
                if (input.id === 'playerName' && this.selectedAccount) {
                    inputElement.value = this.selectedAccount.name;
                }
                
                inputContainer.appendChild(inputElement);
            });
            
            this.menuElement.appendChild(inputContainer);
        }
        
        // Buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'menu-buttons';
        
        menu.buttons.forEach(button => {
            const buttonElement = document.createElement('button');
            buttonElement.className = 'menu-button';
            buttonElement.textContent = button.text;
            buttonElement.onclick = button.action;
            buttonContainer.appendChild(buttonElement);
        });
        
        this.menuElement.appendChild(buttonContainer);
        
        // Settings controls
        if (menu.sliders || menu.checkboxes) {
            this.renderSettingsControls(menu);
        }
        
        // Special content for specific menus
        if (this.currentMenu === 'achievements') {
            this.renderAchievements();
        } else if (this.currentMenu === 'statistics') {
            this.renderStatistics();
        } else if (this.currentMenu === 'accounts') {
            this.renderAccountsList();
        }
    }
    
    renderSettingsControls(menu) {
        const settingsContainer = document.createElement('div');
        settingsContainer.className = 'settings-container';
        
        // Sliders
        if (menu.sliders) {
            menu.sliders.forEach(slider => {
                const sliderContainer = document.createElement('div');
                sliderContainer.className = 'setting-item';
                
                const label = document.createElement('label');
                label.textContent = slider.label;
                label.htmlFor = slider.id;
                
                const sliderElement = document.createElement('input');
                sliderElement.type = 'range';
                sliderElement.id = slider.id;
                sliderElement.min = slider.min;
                sliderElement.max = slider.max;
                sliderElement.value = slider.value;
                sliderElement.className = 'setting-slider';
                
                const valueDisplay = document.createElement('span');
                valueDisplay.className = 'slider-value';
                valueDisplay.textContent = slider.value;
                
                sliderElement.oninput = (e) => {
                    valueDisplay.textContent = e.target.value;
                    this.updateSetting(slider.id, parseInt(e.target.value));
                };
                
                sliderContainer.appendChild(label);
                sliderContainer.appendChild(sliderElement);
                sliderContainer.appendChild(valueDisplay);
                settingsContainer.appendChild(sliderContainer);
            });
        }
        
        // Checkboxes
        if (menu.checkboxes) {
            menu.checkboxes.forEach(checkbox => {
                const checkboxContainer = document.createElement('div');
                checkboxContainer.className = 'setting-item';
                
                const checkboxElement = document.createElement('input');
                checkboxElement.type = 'checkbox';
                checkboxElement.id = checkbox.id;
                checkboxElement.checked = checkbox.checked;
                checkboxElement.className = 'setting-checkbox';
                
                const label = document.createElement('label');
                label.textContent = checkbox.label;
                label.htmlFor = checkbox.id;
                
                checkboxElement.onchange = (e) => {
                    this.updateSetting(checkbox.id, e.target.checked);
                };
                
                checkboxContainer.appendChild(checkboxElement);
                checkboxContainer.appendChild(label);
                settingsContainer.appendChild(checkboxContainer);
            });
        }
        
        this.menuElement.appendChild(settingsContainer);
    }
    
    renderAchievements() {
        const achievementsContainer = document.createElement('div');
        achievementsContainer.className = 'achievements-container';
        
        // Get achievements from account system
        const achievements = this.selectedAccount?.achievements || [];
        
        if (achievements.length === 0) {
            const noAchievements = document.createElement('div');
            noAchievements.className = 'no-achievements';
            noAchievements.textContent = 'No achievements unlocked yet!';
            achievementsContainer.appendChild(noAchievements);
        } else {
            achievements.forEach(achievement => {
                const achievementElement = document.createElement('div');
                achievementElement.className = `achievement ${achievement.unlocked ? 'unlocked' : 'locked'}`;
                achievementElement.innerHTML = `
                    <div class="achievement-icon">${achievement.icon}</div>
                    <div class="achievement-info">
                        <div class="achievement-name">${achievement.name}</div>
                        <div class="achievement-description">${achievement.description}</div>
                    </div>
                `;
                achievementsContainer.appendChild(achievementElement);
            });
        }
        
        this.menuElement.appendChild(achievementsContainer);
    }
    
    renderStatistics() {
        const statsContainer = document.createElement('div');
        statsContainer.className = 'statistics-container';
        
        const stats = this.selectedAccount?.statistics || {};
        
        const statItems = [
            { key: 'gamesPlayed', label: 'Games Played', value: stats.gamesPlayed || 0 },
            { key: 'totalMassConsumed', label: 'Total Mass Consumed', value: stats.totalMassConsumed || 0 },
            { key: 'highestMass', label: 'Highest Mass', value: stats.highestMass || 0 },
            { key: 'totalPlayTime', label: 'Total Play Time', value: this.formatTime(stats.totalPlayTime || 0) },
            { key: 'cellsAbsorbed', label: 'Cells Absorbed', value: stats.cellsAbsorbed || 0 },
            { key: 'timesEaten', label: 'Times Eaten', value: stats.timesEaten || 0 }
        ];
        
        statItems.forEach(stat => {
            const statElement = document.createElement('div');
            statElement.className = 'stat-item';
            statElement.innerHTML = `
                <span class="stat-label">${stat.label}:</span>
                <span class="stat-value">${stat.value}</span>
            `;
            statsContainer.appendChild(statElement);
        });
        
        this.menuElement.appendChild(statsContainer);
    }
    
    renderAccountsList() {
        const accountsContainer = document.createElement('div');
        accountsContainer.className = 'accounts-list';
        
        // This would typically load from a save system
        const savedAccounts = this.getSavedAccounts();
        
        if (savedAccounts.length === 0) {
            const noAccounts = document.createElement('div');
            noAccounts.className = 'no-accounts';
            noAccounts.textContent = 'No saved accounts found.';
            accountsContainer.appendChild(noAccounts);
        } else {
            savedAccounts.forEach(account => {
                const accountElement = document.createElement('div');
                accountElement.className = 'account-item';
                accountElement.innerHTML = `
                    <div class="account-name">${account.name}</div>
                    <div class="account-details">
                        Level ${account.level} | ${account.coins} coins
                    </div>
                `;
                
                accountElement.onclick = () => {
                    this.selectedAccount = account;
                    this.eventSystem.emit('account:selected', account);
                    this.showMenu('main');
                };
                
                accountsContainer.appendChild(accountElement);
            });
        }
        
        this.menuElement.appendChild(accountsContainer);
    }
    
    showMenu(menuName) {
        if (this.menus[menuName]) {
            this.menuHistory.push(this.currentMenu);
            this.currentMenu = menuName;
            this.render();
        }
    }
    
    goBack() {
        if (this.menuHistory.length > 0) {
            this.currentMenu = this.menuHistory.pop();
            this.render();
        }
    }
    
    show() {
        this.isVisible = true;
        this.menuElement.style.display = 'block';
        this.overlayElement.style.display = 'block';
        document.body.classList.add('menu-open');
    }
    
    hide() {
        this.isVisible = false;
        this.menuElement.style.display = 'none';
        this.overlayElement.style.display = 'none';
        document.body.classList.remove('menu-open');
    }
    
    startGame(mode) {
        const playerNameInput = document.getElementById('playerName');
        const playerName = playerNameInput ? playerNameInput.value.trim() : '';
        
        if (!playerName) {
            alert('Please enter a player name!');
            return;
        }
        
        this.hide();
        this.eventSystem.emit('game:start', {
            mode: mode,
            playerName: playerName,
            account: this.selectedAccount
        });
    }
    
    updateSetting(settingId, value) {
        this.eventSystem.emit('settings:changed', {
            setting: settingId,
            value: value
        });
    }
    
    confirmReset() {
        if (confirm('Are you sure you want to reset all progress? This cannot be undone!')) {
            this.eventSystem.emit('progress:reset');
            this.selectedAccount = null;
            this.showMenu('main');
        }
    }
    
    showCreateAccount() {
        const name = prompt('Enter account name:');
        if (name && name.trim()) {
            this.eventSystem.emit('account:create', { name: name.trim() });
        }
    }
    
    showLoadAccount() {
        // This would show a file picker or account selection
        this.showMenu('accounts');
    }
    
    showDeleteAccount() {
        if (this.selectedAccount) {
            if (confirm(`Delete account "${this.selectedAccount.name}"? This cannot be undone!`)) {
                this.eventSystem.emit('account:delete', this.selectedAccount);
                this.selectedAccount = null;
                this.showMenu('accounts');
            }
        }
    }
    
    getSavedAccounts() {
        // This would typically interface with the SaveSystem
        return JSON.parse(localStorage.getItem('savedAccounts') || '[]');
    }
    
    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
    
    destroy() {
        if (this.menuElement) {
            this.menuElement.remove();
        }
        if (this.overlayElement) {
            this.overlayElement.remove();
        }
        document.body.classList.remove('menu-open');
    }
}

export { Menu };
