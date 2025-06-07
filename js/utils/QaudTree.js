// QuadTree.js - Spatial partitioning for efficient collision detection
class QuadTree {
    constructor(bounds, maxObjects = 10, maxLevels = 5, level = 0) {
        this.bounds = bounds; // {x, y, width, height}
        this.maxObjects = maxObjects;
        this.maxLevels = maxLevels;
        this.level = level;
        this.objects = [];
        this.nodes = [];
    }

    // Clear the quadtree
    clear() {
        this.objects = [];
        
        for (let i = 0; i < this.nodes.length; i++) {
            if (this.nodes[i]) {
                this.nodes[i].clear();
                this.nodes[i] = null;
            }
        }
        
        this.nodes = [];
    }

    // Split the node into 4 subnodes
    split() {
        const subWidth = this.bounds.width / 2;
        const subHeight = this.bounds.height / 2;
        const x = this.bounds.x;
        const y = this.bounds.y;

        // Top right node
        this.nodes[0] = new QuadTree({
            x: x + subWidth,
            y: y,
            width: subWidth,
            height: subHeight
        }, this.maxObjects, this.maxLevels, this.level + 1);

        // Top left node
        this.nodes[1] = new QuadTree({
            x: x,
            y: y,
            width: subWidth,
            height: subHeight
        }, this.maxObjects, this.maxLevels, this.level + 1);

        // Bottom left node
        this.nodes[2] = new QuadTree({
            x: x,
            y: y + subHeight,
            width: subWidth,
            height: subHeight
        }, this.maxObjects, this.maxLevels, this.level + 1);

        // Bottom right node
        this.nodes[3] = new QuadTree({
            x: x + subWidth,
            y: y + subHeight,
            width: subWidth,
            height: subHeight
        }, this.maxObjects, this.maxLevels, this.level + 1);
    }

    // Determine which node the object belongs to
    getIndex(entity) {
        let index = -1;
        const verticalMidpoint = this.bounds.x + (this.bounds.width / 2);
        const horizontalMidpoint = this.bounds.y + (this.bounds.height / 2);

        // Get entity bounds
        const entityBounds = this.getEntityBounds(entity);

        // Object can completely fit within the top quadrants
        const topQuadrant = (entityBounds.y < horizontalMidpoint && 
                           entityBounds.y + entityBounds.height < horizontalMidpoint);

        // Object can completely fit within the bottom quadrants
        const bottomQuadrant = (entityBounds.y > horizontalMidpoint);

        // Object can completely fit within the left quadrants
        if (entityBounds.x < verticalMidpoint && 
            entityBounds.x + entityBounds.width < verticalMidpoint) {
            if (topQuadrant) {
                index = 1; // Top left
            } else if (bottomQuadrant) {
                index = 2; // Bottom left
            }
        }
        // Object can completely fit within the right quadrants
        else if (entityBounds.x > verticalMidpoint) {
            if (topQuadrant) {
                index = 0; // Top right
            } else if (bottomQuadrant) {
                index = 3; // Bottom right
            }
        }

        return index;
    }

    // Get entity bounds based on type
    getEntityBounds(entity) {
        if (entity.radius !== undefined) {
            // Circular entity (cells, players)
            return {
                x: entity.x - entity.radius,
                y: entity.y - entity.radius,
                width: entity.radius * 2,
                height: entity.radius * 2
            };
        } else if (entity.width !== undefined && entity.height !== undefined) {
            // Rectangular entity
            return {
                x: entity.x - entity.width / 2,
                y: entity.y - entity.height / 2,
                width: entity.width,
                height: entity.height
            };
        } else {
            // Point entity (food, small objects)
            const size = entity.size || 5;
            return {
                x: entity.x - size / 2,
                y: entity.y - size / 2,
                width: size,
                height: size
            };
        }
    }

    // Insert the object into the quadtree
    insert(entity) {
        if (!entity || entity.x === undefined || entity.y === undefined) {
            return;
        }

        if (this.nodes.length > 0) {
            const index = this.getIndex(entity);

            if (index !== -1) {
                this.nodes[index].insert(entity);
                return;
            }
        }

        this.objects.push(entity);

        if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
            if (this.nodes.length === 0) {
                this.split();
            }

            let i = 0;
            while (i < this.objects.length) {
                const index = this.getIndex(this.objects[i]);
                if (index !== -1) {
                    this.nodes[index].insert(this.objects.splice(i, 1)[0]);
                } else {
                    i++;
                }
            }
        }
    }

    // Return all objects that could collide with the given object
    retrieve(entity) {
        const returnObjects = [];

        if (!entity) return returnObjects;

        const index = this.getIndex(entity);
        
        if (this.nodes.length > 0) {
            if (index !== -1) {
                returnObjects.push(...this.nodes[index].retrieve(entity));
            } else {
                // If entity spans multiple quadrants, check all of them
                for (let i = 0; i < this.nodes.length; i++) {
                    returnObjects.push(...this.nodes[i].retrieve(entity));
                }
            }
        }

        returnObjects.push(...this.objects);

        return returnObjects;
    }

    // Retrieve all objects in a given rectangular area
    retrieveInBounds(bounds) {
        const returnObjects = [];
        
        // Check if bounds intersect with this quadtree's bounds
        if (!this.boundsIntersect(bounds, this.bounds)) {
            return returnObjects;
        }

        // Add objects from this level
        for (const obj of this.objects) {
            if (this.entityInBounds(obj, bounds)) {
                returnObjects.push(obj);
            }
        }

        // Check child nodes
        if (this.nodes.length > 0) {
            for (let i = 0; i < this.nodes.length; i++) {
                returnObjects.push(...this.nodes[i].retrieveInBounds(bounds));
            }
        }

        return returnObjects;
    }

    // Check if two bounds intersect
    boundsIntersect(bounds1, bounds2) {
        return !(bounds1.x > bounds2.x + bounds2.width ||
                bounds1.x + bounds1.width < bounds2.x ||
                bounds1.y > bounds2.y + bounds2.height ||
                bounds1.y + bounds1.height < bounds2.y);
    }

    // Check if entity is within bounds
    entityInBounds(entity, bounds) {
        const entityBounds = this.getEntityBounds(entity);
        return this.boundsIntersect(entityBounds, bounds);
    }

    // Get all objects in the quadtree
    getAllObjects() {
        const allObjects = [...this.objects];
        
        for (const node of this.nodes) {
            if (node) {
                allObjects.push(...node.getAllObjects());
            }
        }
        
        return allObjects;
    }

    // Get quadtree statistics for debugging
    getStats() {
        let stats = {
            totalNodes: 1,
            totalObjects: this.objects.length,
            maxDepth: this.level,
            objectsPerLevel: {}
        };

        stats.objectsPerLevel[this.level] = this.objects.length;

        for (const node of this.nodes) {
            if (node) {
                const nodeStats = node.getStats();
                stats.totalNodes += nodeStats.totalNodes;
                stats.totalObjects += nodeStats.totalObjects;
                stats.maxDepth = Math.max(stats.maxDepth, nodeStats.maxDepth);
                
                // Merge objects per level
                for (const [level, count] of Object.entries(nodeStats.objectsPerLevel)) {
                    stats.objectsPerLevel[level] = (stats.objectsPerLevel[level] || 0) + count;
                }
            }
        }

        return stats;
    }

    // Find nearest neighbors to a point
    findNearestNeighbors(x, y, maxDistance, maxCount = 10) {
        const searchBounds = {
            x: x - maxDistance,
            y: y - maxDistance,
            width: maxDistance * 2,
            height: maxDistance * 2
        };

        const candidates = this.retrieveInBounds(searchBounds);
        const neighbors = [];

        for (const candidate of candidates) {
            const distance = Math.sqrt(
                (candidate.x - x) ** 2 + (candidate.y - y) ** 2
            );

            if (distance <= maxDistance) {
                neighbors.push({
                    entity: candidate,
                    distance: distance
                });
            }
        }

        // Sort by distance and limit count
        neighbors.sort((a, b) => a.distance - b.distance);
        return neighbors.slice(0, maxCount).map(n => n.entity);
    }

    // Remove an object from the quadtree
    remove(entity) {
        if (!entity) return false;

        // Try to remove from current level
        const index = this.objects.indexOf(entity);
        if (index !== -1) {
            this.objects.splice(index, 1);
            return true;
        }

        // Try to remove from child nodes
        if (this.nodes.length > 0) {
            const nodeIndex = this.getIndex(entity);
            if (nodeIndex !== -1) {
                return this.nodes[nodeIndex].remove(entity);
            } else {
                // Entity might be in multiple nodes, try all
                for (const node of this.nodes) {
                    if (node.remove(entity)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    // Update an entity's position in the quadtree
    update(entity, oldX, oldY) {
        if (!entity) return false;

        // Create temporary entity with old position for removal
        const oldEntity = { ...entity, x: oldX, y: oldY };
        
        // Remove from old position
        this.remove(oldEntity);
        
        // Insert at new position
        this.insert(entity);
        
        return true;
    }

    // Render quadtree bounds for debugging
    render(ctx, camera) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.lineWidth = 1;

        const screenBounds = camera.worldToScreen(this.bounds.x, this.bounds.y);
        const screenSize = {
            width: this.bounds.width * camera.zoom,
            height: this.bounds.height * camera.zoom
        };

        ctx.strokeRect(
            screenBounds.x,
            screenBounds.y,
            screenSize.width,
            screenSize.height
        );

        // Render child nodes
        for (const node of this.nodes) {
            if (node) {
                node.render(ctx, camera);
            }
        }

        // Render object count
        if (this.objects.length > 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = '12px Arial';
            ctx.fillText(
                this.objects.length.toString(),
                screenBounds.x + 5,
                screenBounds.y + 15
            );
        }
    }
}

export default QuadTree;
