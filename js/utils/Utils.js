// Utility functions for the game
export class Utils {
    // Generate unique IDs
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    // Distance calculation
    static distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // Distance squared (faster for comparisons)
    static distanceSquared(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx * dx + dy * dy;
    }
    
    // Angle between two points
    static angle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    }
    
    // Normalize angle to 0-2π range
    static normalizeAngle(angle) {
        while (angle < 0) angle += Math.PI * 2;
        while (angle >= Math.PI * 2) angle -= Math.PI * 2;
        return angle;
    }
    
    // Linear interpolation
    static lerp(start, end, factor) {
        return start + (end - start) * factor;
    }
    
    // Clamp value between min and max
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
    
    // Random number between min and max
    static random(min, max) {
        return Math.random() * (max - min) + min;
    }
    
    // Random integer between min and max (inclusive)
    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    // Random element from array
    static randomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
    
    // Vector operations
    static normalizeVector(x, y) {
        const length = Math.sqrt(x * x + y * y);
        if (length === 0) return { x: 0, y: 0 };
        return { x: x / length, y: y / length };
    }
    
    static vectorLength(x, y) {
        return Math.sqrt(x * x + y * y);
    }
    
    static dotProduct(x1, y1, x2, y2) {
        return x1 * x2 + y1 * y2;
    }
    
    // Circle collision detection
    static circlesCollide(x1, y1, r1, x2, y2, r2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < (r1 + r2);
    }
    
    // Check if point is inside circle
    static pointInCircle(px, py, cx, cy, radius) {
        return this.distanceSquared(px, py, cx, cy) <= radius * radius;
    }
    
    // Check if circles overlap (with overlap amount)
    static circleOverlap(x1, y1, r1, x2, y2, r2) {
        const distance = this.distance(x1, y1, x2, y2);
        const totalRadius = r1 + r2;
        if (distance >= totalRadius) return 0;
        return totalRadius - distance;
    }
    
    // Format numbers for display
    static formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return Math.floor(num).toString();
    }
    
    // Format time (ms to mm:ss)
    static formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    // Color utilities
    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }
    
    static rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    
    static adjustBrightness(hex, percent) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;
        
        const factor = 1 + percent / 100;
        const r = Math.min(255, Math.max(0, Math.floor(rgb.r * factor)));
        const g = Math.min(255, Math.max(0, Math.floor(rgb.g * factor)));
        const b = Math.min(255, Math.max(0, Math.floor(rgb.b * factor)));
        
        return this.rgbToHex(r, g, b);
    }
    
    // Canvas utilities
    static getCanvasMousePos(canvas, event) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top
        };
    }
    
    // Boundary checking
    static keepInBounds(x, y, minX, minY, maxX, maxY) {
        return {
            x: this.clamp(x, minX, maxX),
            y: this.clamp(y, minY, maxY)
        };
    }
    
    // Calculate mass from radius (area-based)
    static massFromRadius(radius) {
        return Math.PI * radius * radius;
    }
    
    // Calculate radius from mass
    static radiusFromMass(mass) {
        return Math.sqrt(mass / Math.PI);
    }
    
    // Performance timing
    static createTimer() {
        const start = performance.now();
        return {
            elapsed: () => performance.now() - start,
            reset: () => {
                const newStart = performance.now();
                const elapsed = newStart - start;
                return { elapsed, timer: this.createTimer() };
            }
        };
    }
    
    // Smooth step function for animations
    static smoothStep(t) {
        return t * t * (3 - 2 * t);
    }
    
    // Easing functions
    static easeInOut(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }
    
    static easeOut(t) {
        return 1 - Math.pow(1 - t, 3);
    }
    
    // Deep clone object (for save data)
    static deepClone(obj) {
        if (obj === null || typeof obj !== "object") return obj;
        if (obj instanceof Date) return new Date(obj);
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === "object") {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    }
}
