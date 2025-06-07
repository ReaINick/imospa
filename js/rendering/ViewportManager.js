// ViewportManager.js - Manages viewport culling and LOD for performance
class ViewportManager {
    constructor(camera) {
        this.camera = camera;
        this.cullingBuffer = 100; // Extra space around viewport for smooth transitions
        this.lodDistances = {
            high: 300,    // Full detail within this distance
            medium: 600,  // Reduced detail beyond this
            low: 1000     // Minimal detail beyond this
        };
        this.visibleEntities = new Set();
        this.culledEntities = new Set();
        this.lodLevels = new Map();
        this.quadTree = null; // Will be set by game engine
    }

    // Update visibility and LOD for all entities
    update(entities) {
        this.visibleEntities.clear();
        this.culledEntities.clear();
        this.lodLevels.clear();

        const bounds = this.camera.getVisibleBounds();
        const expandedBounds = this.getExpandedBounds(bounds);
        const cameraCenter = { x: this.camera.x, y: this.camera.y };

        for (const entity of entities) {
            const isVisible = this.isEntityVisible(entity, expandedBounds);
            
            if (isVisible) {
                this.visibleEntities.add(entity);
                
                // Calculate LOD level based on distance from camera
                const distance = this.calculateDistance(entity, cameraCenter);
                const lodLevel = this.calculateLOD(distance);
                this.lodLevels.set(entity.id, lodLevel);
            } else {
                this.culledEntities.add(entity);
            }
        }
    }

    // Get expanded bounds with culling buffer
    getExpandedBounds(bounds) {
        return {
            left: bounds.left - this.cullingBuffer,
            right: bounds.right + this.cullingBuffer,
            top: bounds.top - this.cullingBuffer,
            bottom: bounds.bottom + this.cullingBuffer
        };
    }

    // Check if an entity is visible within the expanded bounds
    isEntityVisible(entity, bounds) {
        if (entity.type === 'cell' || entity.type === 'player') {
            // For cells, check if any part of the circle is visible
            return this.isCircleInBounds(entity.x, entity.y, entity.radius, bounds);
        } else if (entity.type === 'food') {
            // For food, just check the center point (they're small)
            return this.isPointInBounds(entity.x, entity.y, bounds);
        } else {
            // Default: check center point
            return this.isPointInBounds(entity.x, entity.y, bounds);
        }
    }

    // Check if a point is within bounds
    isPointInBounds(x, y, bounds) {
        return x >= bounds.left && 
               x <= bounds.right && 
               y >= bounds.top && 
               y <= bounds.bottom;
    }

    // Check if a circle intersects with bounds
    isCircleInBounds(x, y, radius, bounds) {
        return x + radius >= bounds.left && 
               x - radius <= bounds.right && 
               y + radius >= bounds.top && 
               y - radius <= bounds.bottom;
    }

    // Calculate distance between entity and camera center
    calculateDistance(entity, cameraCenter) {
        const dx = entity.x - cameraCenter.x;
        const dy = entity.y - cameraCenter.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Calculate LOD level based on distance
    calculateLOD(distance) {
        if (distance <= this.lodDistances.high) {
            return 'high';
        } else if (distance <= this.lodDistances.medium) {
            return 'medium';
        } else if (distance <= this.lodDistances.low) {
            return 'low';
        } else {
            return 'minimal';
        }
    }

    // Get visible entities
    getVisibleEntities() {
        return Array.from(this.visibleEntities);
    }

    // Get entities by type that are visible
    getVisibleEntitiesByType(type) {
        return Array.from(this.visibleEntities).filter(entity => entity.type === type);
    }

    // Get LOD level for a specific entity
    getLODLevel(entityId) {
        return this.lodLevels.get(entityId) || 'high';
    }

    // Check if entity should be rendered with full detail
    shouldRenderFull(entityId) {
        const lod = this.getLODLevel(entityId);
        return lod === 'high' || lod === 'medium';
    }

    // Check if entity should be rendered at all
    shouldRender(entityId) {
        return this.lodLevels.has(entityId);
    }

    // Get rendering detail level for an entity
    getRenderingDetail(entityId) {
        const lod = this.getLODLevel(entityId);
        
        switch (lod) {
            case 'high':
                return {
                    drawOutline: true,
                    drawName: true,
                    drawEffects: true,
                    antiAlias: true,
                    shadowQuality: 'high'
                };
            case 'medium':
                return {
                    drawOutline: true,
                    drawName: true,
                    drawEffects: false,
                    antiAlias: true,
                    shadowQuality: 'medium'
                };
            case 'low':
                return {
                    drawOutline: false,
                    drawName: false,
                    drawEffects: false,
                    antiAlias: false,
                    shadowQuality: 'low'
                };
            case 'minimal':
                return {
                    drawOutline: false,
                    drawName: false,
                    drawEffects: false,
                    antiAlias: false,
                    shadowQuality: 'none'
                };
            default:
                return this.getRenderingDetail('high');
        }
    }

    // Frustum culling for more advanced scenarios
    frustumCull(entities, frustumPlanes = null) {
        if (!frustumPlanes) {
            // Use simple bounding box culling
            return this.getVisibleEntities();
        }

        const culledEntities = [];
        const bounds = this.camera.getVisibleBounds();

        for (const entity of entities) {
            if (this.isEntityInFrustum(entity, frustumPlanes, bounds)) {
                culledEntities.push(entity);
            }
        }

        return culledEntities;
    }

    // Check if entity is within view frustum
    isEntityInFrustum(entity, frustumPlanes, bounds) {
        // For now, use simple bounds checking
        // Could be extended for more complex frustum culling
        return this.isEntityVisible(entity, bounds);
    }

    // Spatial partitioning helpers (for use with QuadTree)
    getEntitiesInRegion(x, y, width, height) {
        if (!this.quadTree) {
            return this.getVisibleEntities();
        }

        const region = {
            x: x - width / 2,
            y: y - height / 2,
            width: width,
            height: height
        };

        return this.quadTree.retrieve(region);
    }

    // Set QuadTree reference for spatial queries
    setQuadTree(quadTree) {
        this.quadTree = quadTree;
    }

    // Performance metrics
    getPerformanceStats() {
        return {
            visibleCount: this.visibleEntities.size,
            culledCount: this.culledEntities.size,
            lodLevels: {
                high: Array.from(this.lodLevels.values()).filter(lod => lod === 'high').length,
                medium: Array.from(this.lodLevels.values()).filter(lod => lod === 'medium').length,
                low: Array.from(this.lodLevels.values()).filter(lod => lod === 'low').length,
                minimal: Array.from(this.lodLevels.values()).filter(lod => lod === 'minimal').length
            }
        };
    }

    // Adjust culling parameters for performance tuning
    setCullingBuffer(buffer) {
        this.cullingBuffer = buffer;
    }

    // Adjust LOD distances
    setLODDistances(high, medium, low) {
        this.lodDistances.high = high;
        this.lodDistances.medium = medium;
        this.lodDistances.low = low;
    }

    // Reset viewport manager state
    reset() {
        this.visibleEntities.clear();
        this.culledEntities.clear();
        this.lodLevels.clear();
    }
}

export default ViewportManager;
