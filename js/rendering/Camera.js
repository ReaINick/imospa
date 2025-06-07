// Camera.js - Handles viewport positioning and smooth following
class Camera {
    constructor(canvas) {
        this.canvas = canvas;
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.zoom = 1;
        this.targetZoom = 1;
        this.smoothing = 0.08;
        this.zoomSmoothing = 0.05;
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeOffset = { x: 0, y: 0 };
        this.bounds = {
            minX: -2000,
            maxX: 2000,
            minY: -2000,
            maxY: 2000
        };
        this.minZoom = 0.3;
        this.maxZoom = 2.0;
        this.defaultZoom = 1.0;
        this.massZoomFactor = 0.001;
    }

    // Follow a target entity (usually the player)
    follow(target) {
        if (!target) return;

        // Calculate target position (center of all player cells)
        if (target.cells && target.cells.length > 0) {
            let totalX = 0;
            let totalY = 0;
            let totalMass = 0;

            for (const cell of target.cells) {
                totalX += cell.x * cell.mass;
                totalY += cell.y * cell.mass;
                totalMass += cell.mass;
            }

            this.targetX = totalX / totalMass;
            this.targetY = totalY / totalMass;

            // Adjust zoom based on total mass
            this.calculateZoomForMass(totalMass);
        } else {
            this.targetX = target.x;
            this.targetY = target.y;
            this.calculateZoomForMass(target.mass);
        }
    }

    // Calculate appropriate zoom level based on mass
    calculateZoomForMass(mass) {
        const baseZoom = this.defaultZoom;
        const massEffect = Math.log(mass + 1) * this.massZoomFactor;
        this.targetZoom = Math.max(this.minZoom, Math.min(this.maxZoom, baseZoom - massEffect));
    }

    // Update camera position and zoom with smooth interpolation
    update(deltaTime) {
        // Smooth camera movement
        const deltaX = this.targetX - this.x;
        const deltaY = this.targetY - this.y;
        
        this.x += deltaX * this.smoothing;
        this.y += deltaY * this.smoothing;

        // Smooth zoom
        const deltaZoom = this.targetZoom - this.zoom;
        this.zoom += deltaZoom * this.zoomSmoothing;

        // Apply bounds
        this.applyBounds();

        // Update screen shake
        this.updateScreenShake(deltaTime);
    }

    // Apply camera bounds to keep it within world limits
    applyBounds() {
        const halfWidth = (this.canvas.width / 2) / this.zoom;
        const halfHeight = (this.canvas.height / 2) / this.zoom;

        this.x = Math.max(this.bounds.minX + halfWidth, 
                 Math.min(this.bounds.maxX - halfWidth, this.x));
        this.y = Math.max(this.bounds.minY + halfHeight, 
                 Math.min(this.bounds.maxY - halfHeight, this.y));
    }

    // Add screen shake effect
    addShake(intensity, duration) {
        this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
        this.shakeDuration = Math.max(this.shakeDuration, duration);
    }

    // Update screen shake effect
    updateScreenShake(deltaTime) {
        if (this.shakeDuration > 0) {
            this.shakeDuration -= deltaTime;
            
            const shakeAmount = this.shakeIntensity * (this.shakeDuration / 1000);
            this.shakeOffset.x = (Math.random() - 0.5) * shakeAmount;
            this.shakeOffset.y = (Math.random() - 0.5) * shakeAmount;

            if (this.shakeDuration <= 0) {
                this.shakeOffset.x = 0;
                this.shakeOffset.y = 0;
                this.shakeIntensity = 0;
            }
        }
    }

    // Convert world coordinates to screen coordinates
    worldToScreen(worldX, worldY) {
        const screenX = (worldX - this.x + this.shakeOffset.x) * this.zoom + this.canvas.width / 2;
        const screenY = (worldY - this.y + this.shakeOffset.y) * this.zoom + this.canvas.height / 2;
        return { x: screenX, y: screenY };
    }

    // Convert screen coordinates to world coordinates
    screenToWorld(screenX, screenY) {
        const worldX = (screenX - this.canvas.width / 2) / this.zoom + this.x - this.shakeOffset.x;
        const worldY = (screenY - this.canvas.height / 2) / this.zoom + this.y - this.shakeOffset.y;
        return { x: worldX, y: worldY };
    }

    // Get the visible world bounds
    getVisibleBounds() {
        const halfWidth = (this.canvas.width / 2) / this.zoom;
        const halfHeight = (this.canvas.height / 2) / this.zoom;

        return {
            left: this.x - halfWidth,
            right: this.x + halfWidth,
            top: this.y - halfHeight,
            bottom: this.y + halfHeight
        };
    }

    // Check if a point is visible on screen
    isPointVisible(x, y, buffer = 0) {
        const bounds = this.getVisibleBounds();
        return x >= bounds.left - buffer && 
               x <= bounds.right + buffer && 
               y >= bounds.top - buffer && 
               y <= bounds.bottom + buffer;
    }

    // Check if a circle is visible on screen
    isCircleVisible(x, y, radius, buffer = 0) {
        const bounds = this.getVisibleBounds();
        return x + radius >= bounds.left - buffer && 
               x - radius <= bounds.right + buffer && 
               y + radius >= bounds.top - buffer && 
               y - radius <= bounds.bottom + buffer;
    }

    // Set camera bounds
    setBounds(minX, maxX, minY, maxY) {
        this.bounds = { minX, maxX, minY, maxY };
    }

    // Instantly move camera to position
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
    }

    // Set zoom level
    setZoom(zoom) {
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
        this.targetZoom = this.zoom;
    }

    // Get current camera transformation matrix for rendering
    getTransform() {
        return {
            x: this.x + this.shakeOffset.x,
            y: this.y + this.shakeOffset.y,
            zoom: this.zoom
        };
    }

    // Reset camera to default state
    reset() {
        this.x = 0;
        this.y = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.zoom = this.defaultZoom;
        this.targetZoom = this.defaultZoom;
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeOffset = { x: 0, y: 0 };
    }
}

export default Camera;
