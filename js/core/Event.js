// Event system for game-wide communication
export class EventSystem {
    constructor() {
        this.listeners = new Map();
    }
    
    // Subscribe to an event
    on(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType).push(callback);
    }
    
    // Unsubscribe from an event
    off(eventType, callback) {
        if (!this.listeners.has(eventType)) return;
        
        const callbacks = this.listeners.get(eventType);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }
    
    // Emit an event
    emit(eventType, data = null) {
        if (!this.listeners.has(eventType)) return;
        
        const callbacks = this.listeners.get(eventType);
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event callback for ${eventType}:`, error);
            }
        });
    }
    
    // Remove all listeners for an event type
    removeAllListeners(eventType) {
        this.listeners.delete(eventType);
    }
    
    // Clear all event listeners
    clear() {
        this.listeners.clear();
    }
    
    // Get number of listeners for an event
    getListenerCount(eventType) {
        return this.listeners.has(eventType) ? this.listeners.get(eventType).length : 0;
    }
}

// Create global event system instance
export const gameEvents = new EventSystem();
