class TrackBuilder {
    constructor() {
        this.selectedElementType = 'straight';
        this.isAddingElement = false;
        this.grid = [];
        this.elements = new Map(); // Store element data for each cell
        
        // Touch support variables
        this.touchStartTime = 0;
        this.touchStartPosition = { x: 0, y: 0 };
        this.isDragging = false;
        this.draggedElement = null;
        this.draggedElementType = null;
        this.draggedElementSource = null; // 'toolbar' or 'grid'
        this.draggedElementData = null;
        
        // Double tap detection for deletion
        this.lastTapTime = 0;
        this.lastTapPosition = { x: 0, y: 0 };
        this.doubleTapDelay = 300; // milliseconds
        this.doubleTapDistance = 50; // pixels
        
        this.initializeEventListeners();
        
        // Read initial values from HTML inputs
        this.gridWidth = parseInt(document.getElementById('gridWidth').value) || 5;
        this.gridHeight = parseInt(document.getElementById('gridHeight').value) || 7;
        
        this.createGrid();
    }

    initializeEventListeners() {
        // Grid size inputs
        document.getElementById('gridWidth').addEventListener('change', (e) => {
            this.gridWidth = Math.min(10, Math.max(3, parseInt(e.target.value) || 3));
            e.target.value = this.gridWidth;
        });

        document.getElementById('gridHeight').addEventListener('change', (e) => {
            this.gridHeight = Math.min(10, Math.max(3, parseInt(e.target.value) || 3));
            e.target.value = this.gridHeight;
        });

        // Add input validation for non-numeric input
        document.getElementById('gridWidth').addEventListener('input', (e) => {
            if (e.target.value < 3) e.target.value = 3;
            if (e.target.value > 10) e.target.value = 10;
        });

        document.getElementById('gridHeight').addEventListener('change', (e) => {
            if (e.target.value < 3) e.target.value = 3;
            if (e.target.value > 10) e.target.value = 10;
        });

        // Create grid button
        document.getElementById('createGrid').addEventListener('click', () => {
            this.createGrid();
        });

        // Download Track button
        document.getElementById('downloadPDF').addEventListener('click', () => {
            this.downloadTrackAsImage();
        });

        // Fill blanks button
        const fillBlanksButton = document.getElementById('fillBlanks');
        if (fillBlanksButton) {
            fillBlanksButton.addEventListener('click', () => {
                this.fillEmptySpaces();
            });
        }

        // Clear grid button
        document.getElementById('clearGrid').addEventListener('click', () => {
            this.clearGrid();
        });

        // Initialize drag and drop
        this.initializeDragAndDrop();
        
        // Initialize touch support
        this.initializeTouchSupport();
        
        // Show mobile instructions if applicable
        this.showMobileInstructions();
    }

    initializeTouchSupport() {
        // Add touch events to toolbar elements
        const toolbarElements = document.querySelectorAll('.toolbar-element');
        toolbarElements.forEach(element => {
            element.addEventListener('touchstart', (e) => this.handleToolbarTouchStart(e));
            element.addEventListener('touchend', (e) => this.handleToolbarTouchEnd(e));
        });
        
        // Prevent default touch behavior to avoid conflicts
        document.addEventListener('touchmove', (e) => {
            if (this.isDragging) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Add visual feedback for touch interactions
        this.addTouchVisualFeedback();
    }

    addTouchVisualFeedback() {
        // Add touch feedback to toolbar elements
        const toolbarElements = document.querySelectorAll('.toolbar-element');
        toolbarElements.forEach(element => {
            element.addEventListener('touchstart', () => {
                element.classList.add('touch-active');
            });
            
            element.addEventListener('touchend', () => {
                element.classList.remove('touch-active');
            });
        });
    }

    handleToolbarTouchStart(e) {
        e.preventDefault();
        const elementType = e.currentTarget.dataset.elementType;
        console.log('Toolbar touch start:', elementType);
        
        // Store the element type for placement
        this.draggedElementType = elementType;
        this.draggedElementSource = 'toolbar';
        
        // Visual feedback
        e.currentTarget.style.opacity = '0.5';
        e.currentTarget.style.transform = 'scale(0.95)';
    }

    handleToolbarTouchEnd(e) {
        e.preventDefault();
        const touch = e.changedTouches[0];
        console.log('Toolbar touch end:', touch.clientX, touch.clientY);
        
        // Reset visual feedback
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.transform = 'scale(1)';
        
        // Find the cell under the touch point
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        const targetCell = this.findCellFromElement(elementBelow);
        
        if (targetCell && this.draggedElementType) {
            const row = parseInt(targetCell.dataset.row);
            const col = parseInt(targetCell.dataset.col);
            
            console.log('Placing element at:', row, col);
            
            // Check if target cell is already occupied
            if (this.elements.has(`${row},${col}`)) {
                alert('Cannot place element in an occupied cell. Please choose an empty cell.');
            } else {
                this.placeElement(row, col, this.draggedElementType);
            }
        }
        
        // Clean up
        this.draggedElementType = null;
        this.draggedElementSource = null;
    }

    isMobileDevice() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               ('ontouchstart' in window) || 
               (navigator.maxTouchPoints > 0);
        
        console.log('Mobile device check:', { 
            userAgent: navigator.userAgent,
            hasTouchStart: 'ontouchstart' in window,
            maxTouchPoints: navigator.maxTouchPoints,
            isMobile: isMobile
        });
        
        return isMobile;
    }

    showMobileInstructions() {
        if (this.isMobileDevice()) {
            console.log('Mobile device detected - touch controls enabled');
            // You could add additional mobile-specific UI here if needed
        }
    }

    // Old touch handling methods removed - replaced with simpler toolbar and element handlers

    createTouchDragPreview() {
        this.draggedElement = document.createElement('div');
        this.draggedElement.style.cssText = `
            position: fixed;
            width: 80px;
            height: 80px;
            background: white;
            border: 2px solid #2196F3;
            border-radius: 8px;
            z-index: 10000;
            pointer-events: none;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;
        
        // Add image or text to preview
        if (this.draggedElementSource === 'toolbar') {
            const img = document.createElement('img');
            img.src = `elements/${this.draggedElementType}.png`;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            img.onerror = () => {
                this.draggedElement.textContent = this.draggedElementType.charAt(0).toUpperCase();
                this.draggedElement.style.fontSize = '24px';
                this.draggedElement.style.fontWeight = 'bold';
                this.draggedElement.style.color = '#333';
            };
            this.draggedElement.appendChild(img);
        } else if (this.draggedElementSource === 'grid') {
            const img = document.createElement('img');
            img.src = `elements/${this.draggedElementType}.png`;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'contain';
            img.onerror = () => {
                this.draggedElement.textContent = this.draggedElementType.charAt(0).toUpperCase();
                this.draggedElement.style.fontSize = '24px';
                this.draggedElement.style.fontWeight = 'bold';
                this.draggedElement.style.color = '#333';
            };
            this.draggedElement.appendChild(img);
        }
        
        document.body.appendChild(this.draggedElement);
    }

    findCellFromElement(element) {
        // Traverse up the DOM tree to find a grid cell
        let current = element;
        while (current && !current.classList.contains('grid-cell')) {
            current = current.parentElement;
        }
        return current;
    }

    cleanupTouchDrag() {
        if (this.draggedElement) {
            document.body.removeChild(this.draggedElement);
            this.draggedElement = null;
        }
        this.draggedElementType = null;
        this.draggedElementSource = null;
        this.draggedElementData = null;
        this.isDragging = false;
    }

    // Old cell touch handling methods removed - now using simple element-level touch events

    // Element touch handling methods for placed elements
    handleElementTouchStart(e, row, col) {
        e.preventDefault();
        e.stopPropagation();
        
        const touch = e.touches[0];
        this.touchStartTime = Date.now();
        this.touchStartPosition = { x: touch.clientX, y: touch.clientY };
        
        // Store element info for potential drag
        const element = e.currentTarget;
        this.draggedElementType = element.classList[1];
        this.draggedElementSource = 'grid';
        this.draggedElementData = `move:${row}:${col}:${this.draggedElementType}`;
    }

    handleElementTouchMove(e, row, col) {
        if (!this.draggedElementType || this.draggedElementSource !== 'grid') return;
        
        e.preventDefault();
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - this.touchStartPosition.x);
        const deltaY = Math.abs(touch.clientY - this.touchStartPosition.y);
        
        // Start dragging after a small movement threshold
        if (deltaX > 10 || deltaY > 10) {
            this.isDragging = true;
            
            // Create drag preview if not exists
            if (!this.draggedElement) {
                this.createTouchDragPreview();
            }
            
            // Update drag preview position
            if (this.draggedElement) {
                this.draggedElement.style.left = (touch.clientX - 40) + 'px';
                this.draggedElement.style.top = (touch.clientY - 40) + 'px';
            }
        }
    }

    handleElementTouchEnd(e, row, col) {
        if (!this.draggedElementType) return;
        
        // Prevent any other touch events from firing
        e.preventDefault();
        e.stopPropagation();
        
        const touch = e.changedTouches[0];
        const touchDuration = Date.now() - this.touchStartTime;
        

        
        if (this.isDragging) {
            // Handle drag and drop
            const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
            const targetCell = this.findCellFromElement(elementBelow);
            
            if (targetCell) {
                const targetRow = parseInt(targetCell.dataset.row);
                const targetCol = parseInt(targetCell.dataset.col);
                const [, oldRow, oldCol] = this.draggedElementData.split(':');
                
                if (parseInt(oldRow) !== targetRow || parseInt(oldCol) !== targetCol) {
                    this.moveElement(parseInt(oldRow), parseInt(oldCol), targetRow, targetCol, this.draggedElementType);
                }
            }
        } else if (touchDuration < 500) {
            // Short touch - handle rotation or deletion
            if (this.isMobileDevice()) {
                // Mobile: check for double tap
                this.handleMobileTap(row, col, touch);
            } else {
                // Desktop: long press for deletion
                if (touchDuration > 300) {
                    this.deleteElement(row, col);
                } else {
                    // Short tap - rotate
                    this.rotateElement(row, col);
                }
            }
        }
        
        // Mark touch as processed to prevent multiple firings
        this.touchProcessed = true;
        
        // Clean up
        this.cleanupTouchDrag();
    }

    handleMobileTap(row, col, touch) {
        const now = Date.now();
        const distance = Math.sqrt(
            Math.pow(touch.clientX - this.lastTapPosition.x, 2) + 
            Math.pow(touch.clientY - this.lastTapPosition.y, 2)
        );
        
        if (now - this.lastTapTime < this.doubleTapDelay && distance < this.doubleTapDistance) {
            // Double tap detected - delete element
            this.deleteElement(row, col);
            
            // Reset double tap tracking
            this.lastTapTime = 0;
            this.lastTapPosition = { x: 0, y: 0 };
        } else {
            // Single tap - rotate element
            this.rotateElement(row, col);
            
            // Update last tap info for potential double tap
            this.lastTapTime = now;
            this.lastTapPosition = { x: touch.clientX, y: touch.clientY };
        }
    }

    showLongPressIndicator(row, col) {
        const cell = this.grid[row][col];
        const indicator = document.createElement('div');
        indicator.className = 'long-press-indicator';
        indicator.textContent = 'Deleting...';
        
        cell.appendChild(indicator);
        
        // Remove indicator after animation
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.remove();
            }
        }, 1000);
    }

    // showDeleteButton method removed - not needed for simple double-tap deletion

    createGrid() {
        const gridContainer = document.getElementById('trackGrid');
        gridContainer.innerHTML = '';
        
        // Set grid template columns
        gridContainer.style.gridTemplateColumns = `repeat(${this.gridWidth}, 80px)`;
        
        // Clear data structures
        this.grid = [];
        this.elements.clear();
        
        // Create grid cells
        for (let row = 0; row < this.gridHeight; row++) {
            this.grid[row] = [];
            for (let col = 0; col < this.gridWidth; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                
                // Add drag and drop events
                cell.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    cell.style.background = '#e3f2fd';
                    cell.style.zIndex = '1';
                });
                
                cell.addEventListener('dragleave', (e) => {
                    cell.style.background = 'white';
                    cell.style.zIndex = 'auto';
                });
                
                cell.addEventListener('drop', (e) => {
                    e.preventDefault();
                    cell.style.background = 'white';
                    cell.style.zIndex = 'auto';
                    
                    const data = e.dataTransfer.getData('text/plain');
                    if (data) {
                        if (data.startsWith('move:')) {
                            // Moving an existing element
                            const [, oldRow, oldCol, elementType] = data.split(':');
                            // Check if dropping in the same location
                            if (parseInt(oldRow) === row && parseInt(oldCol) === col) {
                                // Same location, just return without doing anything
                                return;
                            }
                            this.moveElement(parseInt(oldRow), parseInt(oldCol), row, col, elementType);
                        } else {
                            // Placing a new element from toolbar
                            // Check if target cell is already occupied
                            if (this.elements.has(`${row},${col}`)) {
                                alert('Cannot place element in an occupied cell. Please choose an empty cell.');
                                return;
                            }
                            this.placeElement(row, col, data);
                        }
                    }
                });
                
                // Add right-click event for immediate deletion
                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.deleteElement(row, col);
                });
                
                // Touch events removed from cell level to prevent conflicts
                // Now only element-level touch events are used
                
                // Disable touch events on cells to prevent conflicts
                cell.style.touchAction = 'none';
                
                gridContainer.appendChild(cell);
                this.grid[row][col] = cell;
            }
        }
        
        // Reset element mode
        this.isAddingElement = false;
        this.updateButtonStates();
    }

    initializeDragAndDrop() {
        // Get all toolbar elements
        const toolbarElements = document.querySelectorAll('.toolbar-element');
        
        toolbarElements.forEach(element => {
            element.addEventListener('dragstart', (e) => {
                this.handleDragStart(e);
            });
            
            element.addEventListener('dragend', (e) => {
                this.handleDragEnd(e);
            });
        });
    }

    handleDragStart(e) {
        const elementType = e.target.dataset.elementType;
        e.dataTransfer.setData('text/plain', elementType);
        e.target.classList.add('dragging');
        
        // Create a clean drag preview with just the element image
        const dragImage = document.createElement('div');
        dragImage.style.cssText = `
            position: absolute;
            top: -1000px;
            left: -1000px;
            width: 60px;
            height: 60px;
            background: white;
            border: 1px solid #ddd;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        // Clone just the image from the toolbar element
        const originalImg = e.target.querySelector('img');
        if (originalImg) {
            const imgClone = originalImg.cloneNode(true);
            imgClone.style.width = '100%';
            imgClone.style.height = '100%';
            imgClone.style.objectFit = 'contain';
            dragImage.appendChild(imgClone);
        } else {
            // Fallback to text if no image
            const fallbackText = e.target.querySelector('.fallback-text');
            if (fallbackText) {
                dragImage.textContent = fallbackText.textContent;
                dragImage.style.fontSize = '16px';
                dragImage.style.fontWeight = 'bold';
                dragImage.style.color = '#333';
            }
        }
        
        document.body.appendChild(dragImage);
        e.dataTransfer.setDragImage(dragImage, 40, 40);
        
        // Remove the temporary drag image after a short delay
        setTimeout(() => {
            if (document.body.contains(dragImage)) {
                document.body.removeChild(dragImage);
            }
        }, 100);
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
    }

    handlePlacedElementDragStart(e, row, col) {
        const elementType = e.target.classList[1]; // Get the element type from class
        e.dataTransfer.setData('text/plain', `move:${row}:${col}:${elementType}`);
        e.target.style.opacity = '0.5';
        
        // Get the current rotation of the element
        const currentRotation = this.elements.get(`${row},${col}`)?.rotation || 0;
        
        // Create a properly sized drag preview
        const dragImage = document.createElement('div');
        dragImage.style.cssText = `
            position: absolute;
            top: -1000px;
            left: -1000px;
            width: 80px;
            height: 80px;
            background: white;
            border: 1px solid #ddd;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        // Clone just the image from the grid element
        const originalImg = e.target.querySelector('img');
        if (originalImg) {
            const imgClone = originalImg.cloneNode(true);
            imgClone.style.width = '100%';
            imgClone.style.height = '100%';
            imgClone.style.objectFit = 'contain';
            // Apply the current rotation to the drag preview
            imgClone.style.transform = `rotate(${currentRotation}deg)`;
            dragImage.appendChild(imgClone);
        } else {
            // Fallback to text if no image
            const fallbackText = e.target.querySelector('.fallback-text');
            if (fallbackText) {
                dragImage.textContent = fallbackText.textContent;
                dragImage.style.fontSize = '16px';
                dragImage.style.fontWeight = 'bold';
                dragImage.style.color = '#333';
                // Apply the current rotation to the text fallback
                dragImage.style.transform = `rotate(${currentRotation}deg)`;
            }
        }
        
        document.body.appendChild(dragImage);
        e.dataTransfer.setDragImage(dragImage, 40, 40);
        
        // Remove the temporary drag image after a short delay
        setTimeout(() => {
            if (document.body.contains(dragImage)) {
                document.body.removeChild(dragImage);
            }
        }, 100);
    }

    handlePlacedElementDragEnd(e) {
        e.target.style.opacity = '1';
    }

    showDeleteButton(row, col) {
        const cell = this.grid[row][col];
        const element = cell.querySelector('.track-element');
        if (!element) return;
        
        // Remove any existing delete button
        const existingButton = cell.querySelector('.delete-button');
        if (existingButton) {
            existingButton.remove();
            return;
        }
        
        // Create delete button
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        deleteButton.innerHTML = '×';
        deleteButton.style.cssText = `
            position: absolute;
            top: -8px;
            right: -8px;
            width: 20px;
            height: 20px;
            background: #f44336;
            color: white;
            border: none;
            border-radius: 50%;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            z-index: 10;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        
        // Add hover effect
        deleteButton.addEventListener('mouseenter', () => {
            deleteButton.style.background = '#d32f2f';
            deleteButton.style.transform = 'scale(1.1)';
        });
        
        deleteButton.addEventListener('mouseleave', () => {
            deleteButton.style.background = '#f44336';
            deleteButton.style.transform = 'scale(1)';
        });
        
        // Add click event to delete
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteElement(row, col);
        });
        
        // Position the button relative to the cell
        cell.style.position = 'relative';
        cell.appendChild(deleteButton);
        
        // Auto-hide the button after 3 seconds
        setTimeout(() => {
            if (deleteButton.parentNode) {
                deleteButton.remove();
            }
        }, 3000);
    }

    deleteElement(row, col) {
        const cell = this.grid[row][col];
        const element = cell.querySelector('.track-element');
        const deleteButton = cell.querySelector('.delete-button');
        const mobileDeleteButton = cell.querySelector('.mobile-delete-button');
        
        if (element) {
            element.remove();
        }
        if (deleteButton) {
            deleteButton.remove();
        }
        if (mobileDeleteButton) {
            mobileDeleteButton.remove();
        }
        
        cell.classList.remove('has-element');
        this.elements.delete(`${row},${col}`);
        this.updateButtonStates();
    }

    moveElement(fromRow, fromCol, toRow, toCol, elementType) {
        // Check if target cell is empty
        if (this.elements.has(`${toRow},${toCol}`)) {
            alert('Cannot move element to an occupied square. Please choose an empty square.');
            return;
        }
        
        // Get the element data
        const elementData = this.elements.get(`${fromRow},${fromCol}`);
        if (!elementData) return;
        
        // Remove from old location
        this.elements.delete(`${fromRow},${fromCol}`);
        const oldCell = this.grid[fromRow][fromCol];
        const oldElement = oldCell.querySelector('.track-element');
        if (oldElement) {
            oldElement.remove();
        }
        oldCell.classList.remove('has-element');
        
        // Place in new location
        this.placeElement(toRow, toCol, elementType);
        
        // Restore rotation
        const newElementData = this.elements.get(`${toRow},${toCol}`);
        if (newElementData) {
            newElementData.rotation = elementData.rotation;
            const newCell = this.grid[toRow][toCol];
            const newElement = newCell.querySelector('.track-element');
            if (newElement) {
                newElement.style.transform = `rotate(${elementData.rotation}deg)`;
            }
        }
    }

    fillEmptySpaces() {
        let filledCount = 0;
        
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                if (!this.elements.has(`${row},${col}`)) {
                    // Place blank element
                    this.placeElement(row, col, 'blank');
                    filledCount++;
                }
            }
        }
        
        // Silently fill spaces without confirmation
        // User can see the result immediately on the grid
    }

    toggleElementMode() {
        this.isAddingElement = !this.isAddingElement;
        this.updateButtonStates();
        
        if (this.isAddingElement) {
            document.getElementById('addElement').textContent = 'Cancel';
            document.getElementById('addElement').style.background = '#f44336';
            document.body.style.cursor = 'crosshair';
        } else {
            document.getElementById('addElement').textContent = 'Add Element';
            document.getElementById('addElement').style.background = '#2196F3';
            document.body.style.cursor = 'default';
        }
    }

    placeElement(row, col, elementType = null) {
        const cell = this.grid[row][col];
        
        // Use provided element type or fall back to selected type
        const typeToUse = elementType || this.selectedElementType;
        
        // Remove existing element if any
        const existingElement = cell.querySelector('.track-element');
        if (existingElement) {
            existingElement.remove();
        }
        
        // Create new element
        const element = document.createElement('div');
        element.className = `track-element ${typeToUse}`;
        
        // Create image element
        const img = document.createElement('img');
        const imagePath = `elements/${typeToUse}.png`;
        img.src = imagePath;
        img.alt = typeToUse.charAt(0).toUpperCase() + typeToUse.slice(1);
        img.draggable = false;
        
        console.log(`Loading image: ${imagePath}`);
        
        // Add error handling for missing images
        img.onerror = () => {
            console.warn(`Image not found: elements/${typeToUse}.png`);
            // Fallback to text representation
            img.style.display = 'none';
            const fallbackText = document.createElement('div');
            fallbackText.textContent = typeToUse.charAt(0).toUpperCase();
            fallbackText.style.fontSize = '16px';
            fallbackText.style.fontWeight = 'bold';
            fallbackText.style.color = '#333';
            element.appendChild(fallbackText);
        };
        
        element.appendChild(img);
        
        // Make the placed element draggable
        element.draggable = true;
        element.dataset.row = row;
        element.dataset.col = col;
        
        // Add drag and drop events for the placed element
        element.addEventListener('dragstart', (e) => {
            this.handlePlacedElementDragStart(e, row, col);
        });
        
        element.addEventListener('dragend', (e) => {
            this.handlePlacedElementDragEnd(e);
        });
        
        // Add click event for rotation
        element.addEventListener('click', (e) => {
            e.stopPropagation();
            this.rotateElement(row, col);
        });
        
        // Add touch events for mobile rotation and deletion
        element.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            this.handleElementTouchStart(e, row, col);
        });
        
        element.addEventListener('touchmove', (e) => {
            e.stopPropagation();
            this.handleElementTouchMove(e, row, col);
        });
        
        element.addEventListener('touchend', (e) => {
            e.stopPropagation();
            this.handleElementTouchEnd(e, row, col);
        });
        
        // Store element data
        this.elements.set(`${row},${col}`, {
            type: typeToUse,
            rotation: 0
        });
        
        cell.appendChild(element);
        cell.classList.add('has-element');
        
        // Update button states
        this.updateButtonStates();
    }

    rotateElement(row, col) {
        const elementData = this.elements.get(`${row},${col}`);
        if (!elementData) return;
        
        // Rotate 90 degrees clockwise
        elementData.rotation += 90;
        
        const cell = this.grid[row][col];
        const element = cell.querySelector('.track-element');
        if (element) {
            element.style.transform = `rotate(${elementData.rotation}deg)`;
        }
        
        // Update stored data
        this.elements.set(`${row},${col}`, elementData);
    }

    clearGrid() {
        if (confirm('Are you sure you want to clear the entire grid?')) {
            this.createGrid();
        }
    }

    updateButtonStates() {
        const hasElements = this.elements.size > 0;
        document.getElementById('clearGrid').disabled = !hasElements;
        
        // Fill Blanks button should always be enabled if grid exists
        const fillBlanksButton = document.getElementById('fillBlanks');
        if (fillBlanksButton) {
            fillBlanksButton.disabled = false;
        }
    }









    // Method to get track data (useful for saving/loading)
    getTrackData() {
        return {
            gridWidth: this.gridWidth,
            gridHeight: this.gridHeight,
            elements: Array.from(this.elements.entries()).map(([key, value]) => {
                const [row, col] = key.split(',').map(Number);
                return {
                    row,
                    col,
                    ...value
                };
            })
        };
    }

    // Method to load track data (useful for saving/loading)
    loadTrackData(data) {
        this.gridWidth = data.gridWidth || data.gridSize || 8;
        this.gridHeight = data.gridHeight || data.gridSize || 8;
        
        // Update input fields
        document.getElementById('gridWidth').value = this.gridWidth;
        document.getElementById('gridHeight').value = this.gridHeight;
        
        this.createGrid();
        
        data.elements.forEach(element => {
            this.elements.set(`${element.row},${element.col}`, {
                type: element.type,
                rotation: element.rotation
            });
            
            const cell = this.grid[element.row][element.col];
            const elementDiv = document.createElement('div');
            elementDiv.className = `track-element ${element.type}`;
            elementDiv.style.transform = `rotate(${element.rotation}deg)`;
            
            // Make the loaded element draggable and add touch support
            elementDiv.draggable = true;
            elementDiv.dataset.row = element.row;
            elementDiv.dataset.col = element.col;
            
            // Add drag and drop events for the loaded element
            elementDiv.addEventListener('dragstart', (e) => {
                this.handlePlacedElementDragStart(e, element.row, element.col);
            });
            
            elementDiv.addEventListener('dragend', (e) => {
                this.handlePlacedElementDragEnd(e);
            });
            
            // Add click event for rotation
            elementDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                this.rotateElement(element.row, element.col);
            });
            
            // Add touch events for mobile rotation and deletion
            elementDiv.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                this.handleElementTouchStart(e, element.row, element.col);
            });
            
            elementDiv.addEventListener('touchmove', (e) => {
                e.stopPropagation();
                this.handleElementTouchMove(e, element.row, element.col);
            });
            
            elementDiv.addEventListener('touchend', (e) => {
                e.stopPropagation();
                this.handleElementTouchEnd(e, element.row, element.col);
            });
            
            cell.appendChild(elementDiv);
            cell.classList.add('has-element');
        });
        
        this.updateButtonStates();
    }

    downloadTrackAsImage() {
        try {
            console.log('Starting image generation...');
            
            // Check if there are elements to draw
            if (this.elements.size === 0) {
                alert('No track elements to download. Please add some elements to the grid first.');
                return;
            }
            
            // Create a canvas element
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                alert('Canvas not supported in this browser.');
                return;
            }
            
            // Set canvas size with high resolution (2x scale for better quality)
            const cellSize = 80;
            const scale = 2; // 2x resolution for high quality
            canvas.width = this.gridWidth * cellSize * scale;
            canvas.height = this.gridHeight * cellSize * scale;
            
            // Scale the context for high resolution
            ctx.scale(scale, scale);
            
            console.log(`Canvas created: ${canvas.width}x${canvas.height}`);
            
            // Set background to white
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw grid lines with improved quality
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
            ctx.lineWidth = 0.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            // Vertical lines
            for (let col = 0; col <= this.gridWidth; col++) {
                ctx.beginPath();
                ctx.moveTo(col * cellSize, 0);
                ctx.lineTo(col * cellSize, canvas.height);
                ctx.stroke();
            }
            
            // Horizontal lines
            for (let row = 0; row <= this.gridHeight; row++) {
                ctx.beginPath();
                ctx.moveTo(0, row * cellSize);
                ctx.lineTo(canvas.width, row * cellSize);
                ctx.stroke();
            }
            
            console.log('Grid lines drawn, processing elements...');
            
            // Process elements and draw them
            let processedCount = 0;
            const totalElements = this.elements.size;
            
            this.elements.forEach((elementData, key) => {
                const [row, col] = key.split(',').map(Number);
                const x = col * cellSize;
                const y = row * cellSize;
                
                // Draw element background with improved quality
                ctx.fillStyle = '#e8f4fd';
                ctx.fillRect(x, y, cellSize, cellSize);
                
                // Add subtle border for better definition
                ctx.strokeStyle = 'rgba(33, 150, 243, 0.2)';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(x, y, cellSize, cellSize);
                
                // Try to load image, fallback to text if it fails
                const img = new Image();
                img.onload = () => {
                    console.log(`Image loaded: ${elementData.type}.png`);
                    // Draw the image with rotation
                    ctx.save();
                    ctx.translate(x + cellSize / 2, y + cellSize / 2);
                    ctx.rotate((elementData.rotation * Math.PI) / 180);
                    ctx.drawImage(img, -cellSize / 2, -cellSize / 2, cellSize, cellSize);
                    ctx.restore();
                    
                    processedCount++;
                    if (processedCount === totalElements) {
                        this.finishImageDownload(canvas);
                    }
                };
                
                img.onerror = () => {
                    console.log(`Image failed to load: ${elementData.type}.png, using text fallback`);
                    // Fallback to text with improved quality
                    ctx.fillStyle = '#1a1a1a';
                    ctx.font = 'bold 18px Arial, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    
                    // Add text shadow for better readability
                    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
                    ctx.shadowBlur = 2;
                    ctx.shadowOffsetX = 1;
                    ctx.shadowOffsetY = 1;
                    
                    ctx.save();
                    ctx.translate(x + cellSize / 2, y + cellSize / 2);
                    ctx.rotate((elementData.rotation * Math.PI) / 180);
                    ctx.fillText(elementData.type.charAt(0).toUpperCase() + elementData.type.slice(1), 0, 0);
                    ctx.restore();
                    
                    processedCount++;
                    if (processedCount === totalElements) {
                        this.finishImageDownload(canvas);
                    }
                };
                
                img.src = `elements/${elementData.type}.png`;
            });
            
        } catch (error) {
            console.error('Error generating image:', error);
            alert('Error generating image: ' + error.message);
        }
    }
    
    finishImageDownload(canvas) {
        try {
            console.log('All elements processed, creating download...');
            
            // Convert canvas to high-quality image and download
            canvas.toBlob((blob) => {
                if (blob) {
                    console.log('High-quality blob created, downloading...');
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Custom Track - ${this.gridWidth}x${this.gridHeight}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    console.log('High-quality download complete!');
                } else {
                    console.error('Failed to create blob');
                    alert('Failed to create image. Please try again.');
                }
            }, 'image/png', 1.0);
            
        } catch (error) {
            console.error('Error in finishImageDownload:', error);
            alert('Error creating download: ' + error.message);
        }
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Create single instance of TrackBuilder
    window.trackBuilder = new TrackBuilder();
    
    // Test image loading
    console.log('Testing image paths...');
    const testElements = ['start', 'straight', 'corner', 'squeeze', 'obstacles', 'gap', 'finish', 'blank'];
    testElements.forEach(element => {
        const testImg = new Image();
        testImg.onload = () => console.log(`✓ ${element}.png loaded successfully`);
        testImg.onerror = () => console.log(`✗ ${element}.png failed to load`);
        testImg.src = `elements/${element}.png`;
    });
});

// Add some sample track layouts for demonstration
function loadSampleTrack() {
    const trackBuilder = window.trackBuilder;
    if (trackBuilder) {
        const sampleData = {
            gridWidth: 8,
            gridHeight: 8,
            elements: [
                { row: 1, col: 1, type: 'start', rotation: 0 },
                { row: 1, col: 2, type: 'straight', rotation: 0 },
                { row: 1, col: 3, type: 'corner', rotation: 0 },
                { row: 2, col: 3, type: 'straight', rotation: 90 },
                { row: 3, col: 3, type: 'squeeze', rotation: 90 },
                { row: 4, col: 3, type: 'corner', rotation: 90 },
                { row: 4, col: 2, type: 'straight', rotation: 0 },
                { row: 4, col: 1, type: 'finish', rotation: 0 }
            ]
        };
        trackBuilder.loadTrackData(sampleData);
    }
} 