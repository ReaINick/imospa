// physics/Splitting.js
import { MathUtils } from '../utils/Math.js';
import { Cell } from '../entities/Cell.js';
import { Utils } from '../utils/Utils.js';

export class SplittingSystem {
    constructor(physicsEngine) {
        this.physics = physicsEngine;
        this.config = {
            minSplitMass: 35,
            maxCells: 16,
            splitMomentum: 15,
            recombineDelay: 15000, // 15 seconds
            splitMassRatio: 0.5, // Each split cell gets 50% of original mass
            splitDistance: 40,
            splitAngleSpread: 0.1, // Slight randomness in split direction
            recombineRadius: 10 // How close cells need to be to auto-recombine
        };
        
        this.splitCooldowns = new Map(); // Track split cooldowns per player
        this.recombineTimers = new Map(); // Track when cells can recombine
    }

    // Main split function
    performSplit(player, mouseX, mouseY) {
        // Validate split conditions
        if (!this.canSplit(player)) {
            return false;
        }

        // Check cooldown
        if (this.isOnCooldown(player.id)) {
            return false;
        }

        const splitResults = [];
        const cellsToSplit = [...player.cells]; // Copy array to avoid mutation issues
        
        // Split each eligible cell
        for (let cell of cellsToSplit) {
            if (this.canCellSplit(cell)) {
                const splitResult = this.splitCell(cell, mouseX, mouseY, player);
                if (splitResult) {
                    splitResults.push(splitResult);
                }
            }
        }

        // Update player cell array
        if (splitResults.length > 0) {
            this.updatePlayerCells(player, splitResults);
            this.setSplitCooldown(player.id);
            return true;
        }

        return false;
    }

    // Check if player can split
    canSplit(player) {
        return player.cells.length < this.config.maxCells && 
               player.cells.some(cell => this.canCellSplit(cell));
    }

    // Check if individual cell can split
    canCellSplit(cell) {
        return cell.mass >= this.config.minSplitMass;
    }

    // Split a single cell
    splitCell(originalCell, mouseX, mouseY, player) {
        // Calculate split direction
        const direction = this.calculateSplitDirection(originalCell, mouseX, mouseY);
        
        // Calculate new masses
        const newMass = originalCell.mass * this.config.splitMassRatio;
        
        // Create new cell
        const newCell = this.createSplitCell(originalCell, direction, newMass, player);
        
        // Update original cell
        originalCell.mass = newMass;
        originalCell.updateRadius();
        
        // Apply split momentum
        this.applySplitMomentum(originalCell, newCell, direction);
        
        // Set recombine timers
        this.setRecombineTimer(originalCell);
        this.setRecombineTimer(newCell);
        
        return {
            original: originalCell,
            newCell: newCell
        };
    }

    // Calculate split direction based on mouse position
    calculateSplitDirection(cell, mouseX, mouseY) {
        const dx = mouseX - cell.x;
        const dy = mouseY - cell.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If mouse is too close, use random direction
        if (distance < 10) {
            const randomAngle = Math.random() * Math.PI * 2;
            return {
                x: Math.cos(randomAngle),
                y: Math.sin(randomAngle),
                angle: randomAngle
            };
        }
        
        const angle = Math.atan2(dy, dx);
        
        // Add slight randomness to prevent perfect splits
        const randomOffset = (Math.random() - 0.5) * this.config.splitAngleSpread;
        const finalAngle = angle + randomOffset;
        
        return {
            x: Math.cos(finalAngle),
            y: Math.sin(finalAngle),
            angle: finalAngle
        };
    }

    // Create a new cell from splitting
    createSplitCell(originalCell, direction, mass, player) {
        // Calculate position for new cell
        const distance = this.config.splitDistance;
        const newX = originalCell.x + direction.x * distance;
        const newY = originalCell.y + direction.y * distance;
        
        // Create new cell
        const newCell = new Cell(newX, newY, mass);
        newCell.playerId = player.id;
        newCell.color = originalCell.color;
        newCell.isPlayer = true;
        newCell.canRecombine = false; // Will be set to true after delay
        
        return newCell;
    }

    // Apply momentum to split cells
    applySplitMomentum(originalCell, newCell, direction) {
        const momentum = this.config.splitMomentum;
        
        // New cell moves in split direction
        newCell.velocity.x = direction.x * momentum;
        newCell.velocity.y = direction.y * momentum;
        
        // Original cell gets slight backward momentum
        originalCell.velocity.x -= direction.x * momentum * 0.3;
        originalCell.velocity.y -= direction.y * momentum * 0.3;
    }

    // Update player's cell array after splitting
    updatePlayerCells(player, splitResults) {
        for (let result of splitResults) {
            player.cells.push(result.newCell);
        }
        
        // Update total mass
        player.updateTotalMass();
    }

    // Recombine powerup implementation
    performRecombine(player, mouseX, mouseY, maintainMomentum = true) {
        if (player.cells.length <= 1) {
            return false; // Nothing to recombine
        }

        const targetDirection = this.calculateRecombineDirection(player, mouseX, mouseY);
        return this.executeCellMerge(player.cells, targetDirection, maintainMomentum, player);
    }

    // Calculate direction for recombine powerup
    calculateRecombineDirection(player, mouseX, mouseY) {
        // Get center of mass of all cells
        const centerOfMass = this.getPlayerCenterMass(player);
        
        // Calculate direction from center to mouse
        const dx = mouseX - centerOfMass.x;
        const dy = mouseY - centerOfMass.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 10) {
            // Use last known direction or default
            return player.lastDirection || { x: 1, y: 0 };
        }
        
        return {
            x: dx / distance,
            y: dy / distance
        };
    }

    // Execute cell merge sequence for recombine powerup
    executeCellMerge(cells, direction, maintainMomentum, player) {
        if (cells.length <= 1) return false;
        
        // Calculate merge parameters
        const totalMass = cells.reduce((sum, cell) => sum + cell.mass, 0);
        const centerOfMass = this.calculateCenterOfMass(cells);
        
        // Calculate final position based on direction
        const mergeSpeed = 8.0;
        const finalPosition = {
            x: centerOfMass.x + direction.x * 20,
            y: centerOfMass.y + direction.y * 20
        };
        
        // Start merge animation
        this.startMergeAnimation(cells, finalPosition, totalMass, maintainMomentum, mergeSpeed, player);
        
        return true;
    }

    // Start the merge animation sequence
    startMergeAnimation(cells, targetPosition, totalMass, maintainMomentum, speed, player) {
        const mergeData = {
            cells: [...cells],
            targetPosition: targetPosition,
            totalMass: totalMass,
            startTime: Date.now(),
            duration: 2000, // 2 seconds
            speed: speed,
            maintainMomentum: maintainMomentum,
            player: player
        };
        
        // Store merge data for update loop
        player.activeMerge = mergeData;
        
        // Apply initial momentum to cells
        for (let cell of cells) {
            const dx = targetPosition.x - cell.x;
            const dy = targetPosition.y - cell.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                cell.velocity.x = (dx / distance) * speed;
                cell.velocity.y = (dy / distance) * speed;
            }
        }
    }

    // Update active merge animations
    updateMergeAnimations(player, deltaTime) {
        if (!player.activeMerge) return;
        
        const merge = player.activeMerge;
        const elapsed = Date.now() - merge.startTime;
        const progress = Math.min(elapsed / merge.duration, 1);
        
        // Move cells towards target
        for (let cell of merge.cells) {
            const dx = merge.targetPosition.x - cell.x;
            const dy = merge.targetPosition.y - cell.y;
            
            // Ease towards target
            cell.x += dx * progress * 0.1;
            cell.y += dy * progress * 0.1;
        }
        
        // Complete merge when animation finishes
        if (progress >= 1) {
            this.completeMerge(merge);
        }
    }

    // Complete the merge process
    completeMerge(mergeData) {
        const player = mergeData.player;
        const cells = mergeData.cells;
        
        // Create single merged cell
        const mergedCell = new Cell(
            mergeData.targetPosition.x,
            mergeData.targetPosition.y,
            mergeData.totalMass
        );
        
        mergedCell.playerId = player.id;
        mergedCell.color = cells[0].color;
        mergedCell.isPlayer = true;
        mergedCell.canRecombine = true;
        
        // Apply combined momentum if requested
        if (mergeData.maintainMomentum) {
            const avgVelocity = this.calculateAverageVelocity(cells);
            mergedCell.velocity.x = avgVelocity.x * 0.3; // Reduce momentum
            mergedCell.velocity.y = avgVelocity.y * 0.3;
        }
        
        // Replace all cells with merged cell
        player.cells = [mergedCell];
        player.updateTotalMass();
        
        // Clear merge data
        delete player.activeMerge;
    }

    // Calculate average velocity of cells
    calculateAverageVelocity(cells) {
        const totalVelocity = cells.reduce((sum, cell) => ({
            x: sum.x + cell.velocity.x,
            y: sum.y + cell.velocity.y
        }), { x: 0, y: 0 });
        
        return {
            x: totalVelocity.x / cells.length,
            y: totalVelocity.y / cells.length
        };
    }

    // Get center of mass for player's cells
    getPlayerCenterMass(player) {
        const totalMass = player.cells.reduce((sum, cell) => sum + cell.mass, 0);
        
        const weightedPosition = player.cells.reduce((sum, cell) => ({
            x: sum.x + cell.x * cell.mass,
            y: sum.y + cell.y * cell.mass
        }), { x: 0, y: 0 });
        
        return {
            x: weightedPosition.x / totalMass,
            y: weightedPosition.y / totalMass
        };
    }

    // Calculate center of mass for array of cells
    calculateCenterOfMass(cells) {
        const totalMass = cells.reduce((sum, cell) => sum + cell.mass, 0);
        
        const weightedPosition = cells.reduce((sum, cell) => ({
            x: sum.x + cell.x * cell.mass,
            y: sum.y + cell.y * cell.mass
        }), { x: 0, y: 0 });
        
        return {
            x: weightedPosition.x / totalMass,
            y: weightedPosition.y / totalMass
        };
    }

    // Auto-recombine cells that are close together and can merge
    updateAutoRecombine(player, deltaTime) {
        if (player.cells.length <= 1) return;
        
        const cellsToMerge = [];
        
        // Check all cell pairs for auto-recombine
        for (let i = 0; i < player.cells.length; i++) {
            for (let j = i + 1; j < player.cells.length; j++) {
                const cellA = player.cells[i];
                const cellB = player.cells[j];
                
                if (this.canCellsRecombine(cellA, cellB)) {
                    const distance = MathUtils.distance(cellA.x, cellA.y, cellB.x, cellB.y);
                    
                    if (distance < this.config.recombineRadius + cellA.radius + cellB.radius) {
                        cellsToMerge.push({ cellA, cellB, index: j });
                    }
                }
            }
        }
        
        // Process merges (from highest index to avoid array issues)
        cellsToMerge.sort((a, b) => b.index - a.index);
        
        for (let merge of cellsToMerge) {
            this.mergeTwoCells(merge.cellA, merge.cellB, player);
            player.cells.splice(merge.index, 1); // Remove merged cell
        }
        
        if (cellsToMerge.length > 0) {
            player.updateTotalMass();
        }
    }

    // Check if two cells can recombine
    canCellsRecombine(cellA, cellB) {
        return cellA.canRecombine && cellB.canRecombine && 
               cellA.playerId === cellB.playerId;
    }

    // Merge two specific cells
    mergeTwoCells(cellA, cellB, player) {
        // Combine masses
        const totalMass = cellA.mass + cellB.mass;
        
        // Calculate new position (weighted by mass)
        const newX = (cellA.x * cellA.mass + cellB.x * cellB.mass) / totalMass;
        const newY = (cellA.y * cellA.mass + cellB.y * cellB.mass) / totalMass;
        
        // Update the first cell
        cellA.x = newX;
        cellA.y = newY;
        cellA.mass = totalMass;
        cellA.updateRadius();
        
        // Combine velocities
        cellA.velocity.x = (cellA.velocity.x + cellB.velocity.x) * 0.5;
        cellA.velocity.y = (cellA.velocity.y + cellB.velocity.y) * 0.5;
    }

    // Set recombine timer for a cell
    setRecombineTimer(cell) {
        cell.canRecombine = false;
        
        setTimeout(() => {
            cell.canRecombine = true;
        }, this.config.recombineDelay);
    }

    // Set split cooldown for player
    setSplitCooldown(playerId, cooldownMs = 1000) {
        this.splitCooldowns.set(playerId, Date.now() + cooldownMs);
    }

    // Check if player is on split cooldown
    isOnCooldown(playerId) {
        const cooldownTime = this.splitCooldowns.get(playerId);
        return cooldownTime && Date.now() < cooldownTime;
    }

    // Get remaining cooldown time
    getRemainingCooldown(playerId) {
        const cooldownTime = this.splitCooldowns.get(playerId);
        if (!cooldownTime) return 0;
        
        const remaining = cooldownTime - Date.now();
        return Math.max(0, remaining);
    }

    // Force split in specific direction (for AI or special abilities)
    forceSplit(player, direction, count = 1) {
        const results = [];
        
        for (let i = 0; i < count && this.canSplit(player); i++) {
            const largestCell = this.getLargestSplittableCell(player);
            if (!largestCell) break;
            
            const mouseX = largestCell.x + direction.x * 100;
            const mouseY = largestCell.y + direction.y * 100;
            
            const result = this.splitCell(largestCell, mouseX, mouseY, player);
            if (result) {
                results.push(result);
                player.cells.push(result.newCell);
            }
        }
        
        if (results.length > 0) {
            player.updateTotalMass();
            this.setSplitCooldown(player.id);
        }
        
        return results;
    }

    // Get the largest cell that can split
    getLargestSplittableCell(player) {
        return player.cells
            .filter(cell => this.canCellSplit(cell))
            .reduce((largest, cell) => 
                (!largest || cell.mass > largest.mass) ? cell : largest, null);
    }

    // Get split statistics for UI
    getSplitStats(player) {
        const splittableCells = player.cells.filter(cell => this.canCellSplit(cell));
        const recombinableCells = player.cells.filter(cell => cell.canRecombine);
        const cooldownRemaining = this.getRemainingCooldown(player.id);
        
        return {
            canSplit: this.canSplit(player),
            splittableCells: splittableCells.length,
            totalCells: player.cells.length,
            maxCells: this.config.maxCells,
            recombinableCells: recombinableCells.length,
            cooldownRemaining: cooldownRemaining,
            isOnCooldown: this.isOnCooldown(player.id)
        };
    }

    // Clean up expired timers and cooldowns
    cleanup() {
        const now = Date.now();
        
        // Clean up expired cooldowns
        for (let [playerId, cooldownTime] of this.splitCooldowns.entries()) {
            if (now >= cooldownTime) {
                this.splitCooldowns.delete(playerId);
            }
        }
    }

    // Update all splitting-related systems
    update(player, deltaTime) {
        // Update merge animations
        this.updateMergeAnimations(player, deltaTime);
        
        // Update auto-recombine
        this.updateAutoRecombine(player, deltaTime);
        
        // Clean up expired timers
        this.cleanup();
    }
}
