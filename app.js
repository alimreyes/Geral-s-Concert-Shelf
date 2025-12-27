// Geral's Concert Shelf - Interactive Version
// By Alim, with 💚

class ConcertShelfInteractive {
    constructor() {
        this.addedTrinkets = new Set();
        this.trinketElements = new Map();
        this.draggedElement = null;
        this.offsetX = 0;
        this.offsetY = 0;
        this.currentTrinketId = null;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.isResizing = false;
        this.wasResizing = false;
        this.resizeElement = null;
        this.resizeStartWidth = 0;
        this.resizeStartX = 0;
        this.resizeStartY = 0;
        
        this.init();
    }
    
    init() {
        this.checkFirstVisit();
        this.setupGallery();
        this.setupEventListeners();
        this.loadSavedTrinkets();
    }
    
    checkFirstVisit() {
        const hasVisited = localStorage.getItem('concertShelfVisited');
        const welcomeMessage = document.getElementById('welcomeMessage');
        
        if (!hasVisited) {
            welcomeMessage.classList.remove('hidden');
            document.getElementById('startButton').addEventListener('click', () => {
                welcomeMessage.classList.add('hidden');
                localStorage.setItem('concertShelfVisited', 'true');
            });
        } else {
            welcomeMessage.classList.add('hidden');
        }
    }
    
    setupGallery() {
        // Organize trinkets by artist
        const topTrinkets = trinketsData.filter(t => t.id.startsWith('top-'));
        const jbTrinkets = trinketsData.filter(t => t.id.startsWith('jb-'));
        const skTrinkets = trinketsData.filter(t => t.id.startsWith('sk-'));
        const otherTrinkets = trinketsData.filter(t => 
            t.id.startsWith('baekhyun-') || 
            t.id.startsWith('ptv-') || 
            t.id.startsWith('nct-')
        );
        
        this.populateGallerySection('top-trinkets', topTrinkets);
        this.populateGallerySection('jb-trinkets', jbTrinkets);
        this.populateGallerySection('sk-trinkets', skTrinkets);
        this.populateGallerySection('other-trinkets', otherTrinkets);
    }
    
    populateGallerySection(sectionId, trinkets) {
        const section = document.getElementById(sectionId);
        
        trinkets.forEach(trinket => {
            const trinketCard = document.createElement('div');
            trinketCard.className = 'gallery-trinket';
            trinketCard.dataset.trinketId = trinket.id;
            
            const img = document.createElement('img');
            img.src = trinket.image;
            img.alt = trinket.title;
            img.onerror = () => {
                img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23666"%3E%3F%3C/text%3E%3C/svg%3E';
            };
            
            const title = document.createElement('div');
            title.className = 'trinket-title';
            title.textContent = trinket.title;
            
            trinketCard.appendChild(img);
            trinketCard.appendChild(title);
            
            trinketCard.addEventListener('click', () => {
                if (!this.addedTrinkets.has(trinket.id)) {
                    this.addTrinketToShelf(trinket);
                }
            });
            
            section.appendChild(trinketCard);
        });
    }
    
    addTrinketToShelf(trinket) {
        if (this.addedTrinkets.has(trinket.id)) return;
        
        const container = document.getElementById('shelfContainer');
        const trinketElement = this.createTrinketElement(trinket);
        
        // Position in center initially
        trinketElement.style.top = '50%';
        trinketElement.style.left = '50%';
        trinketElement.style.transform = 'translate(-50%, -50%)';
        
        container.appendChild(trinketElement);
        this.trinketElements.set(trinket.id, trinketElement);
        this.addedTrinkets.add(trinket.id);
        
        // Mark as added in gallery
        this.updateGalleryStatus(trinket.id, true);
        
        // Save state
        this.saveState();
        
        // Show success animation
        trinketElement.style.animation = 'slideIn 0.5s ease';
        setTimeout(() => {
            trinketElement.style.animation = '';
        }, 500);
    }
    
    createTrinketElement(trinket) {
        const div = document.createElement('div');
        div.className = `trinket ${trinket.size}`;
        div.dataset.id = trinket.id;
        
        const img = document.createElement('img');
        img.src = trinket.image;
        img.alt = trinket.title;
        img.draggable = false;
        
        img.onerror = () => {
            img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23666"%3E%3F%3C/text%3E%3C/svg%3E';
        };
        
        div.appendChild(img);
        
        // Add resize handle
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        resizeHandle.innerHTML = '⤡';
        div.appendChild(resizeHandle);
        
        // Click to show details (only if not dragged or resized)
        const handleClick = (e) => {
            if (!this.isDragging && !this.wasResizing && !e.target.classList.contains('resize-handle')) {
                e.preventDefault();
                e.stopPropagation();
                this.openModal(trinket);
            }
        };
        
        div.addEventListener('click', handleClick);
        div.addEventListener('touchend', (e) => {
            // For touch devices, treat touchend as a potential click
            if (!this.isDragging && !this.wasResizing && !e.target.classList.contains('resize-handle')) {
                const touch = e.changedTouches[0];
                const deltaX = Math.abs(touch.clientX - this.dragStartX);
                const deltaY = Math.abs(touch.clientY - this.dragStartY);
                
                // If didn't move much, treat as a tap/click
                if (deltaX < 10 && deltaY < 10) {
                    e.preventDefault();
                    this.openModal(trinket);
                }
            }
        });
        
        // Drag events for moving trinket
        div.addEventListener('mousedown', (e) => {
            if (!e.target.classList.contains('resize-handle')) {
                this.startDrag(e);
            }
        });
        div.addEventListener('touchstart', (e) => {
            if (!e.target.classList.contains('resize-handle')) {
                this.startDrag(e);
            }
        }, { passive: false });
        
        // Resize events
        resizeHandle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.startResize(e, div);
        });
        resizeHandle.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            this.startResize(e, div);
        }, { passive: false });
        
        // For touch devices: tap to show resize handle
        let touchTimer = null;
        div.addEventListener('touchstart', (e) => {
            if (!e.target.classList.contains('resize-handle')) {
                // Show resize handle on touch
                div.classList.add('touched');
                
                // Hide after 3 seconds if no interaction
                clearTimeout(touchTimer);
                touchTimer = setTimeout(() => {
                    if (!this.isResizing && !this.isDragging) {
                        div.classList.remove('touched');
                    }
                }, 3000);
            }
        });
        
        return div;
    }
    
    updateGalleryStatus(trinketId, isAdded) {
        const galleryCard = document.querySelector(`[data-trinket-id="${trinketId}"]`);
        if (galleryCard) {
            if (isAdded) {
                galleryCard.classList.add('added');
            } else {
                galleryCard.classList.remove('added');
            }
        }
    }
    
    removeTrinketFromShelf(trinketId) {
        const element = this.trinketElements.get(trinketId);
        if (element) {
            element.remove();
            this.trinketElements.delete(trinketId);
            this.addedTrinkets.delete(trinketId);
            this.updateGalleryStatus(trinketId, false);
            this.saveState();
            this.closeModal();
        }
    }
    
    setupEventListeners() {
        // Add Trinket Button
        const addButton = document.getElementById('addTrinketButton');
        const gallery = document.getElementById('trinketGallery');
        const closeGallery = document.getElementById('closeGallery');
        
        addButton.addEventListener('click', () => {
            gallery.classList.add('open');
        });
        
        closeGallery.addEventListener('click', () => {
            gallery.classList.remove('open');
        });
        
        // Click outside gallery to close
        gallery.addEventListener('click', (e) => {
            if (e.target === gallery) {
                gallery.classList.remove('open');
            }
        });
        
        // Reset Shelf
        document.getElementById('resetShelf').addEventListener('click', () => {
            if (confirm('¿Estás segura de que quieres vaciar todo el shelf?')) {
                this.resetShelf();
            }
        });
        
        // Modal events
        const modal = document.getElementById('trinketModal');
        const closeButton = document.querySelector('.close-button');
        const linkButton = document.getElementById('modalLinkButton');
        const removeButton = document.getElementById('removeTrinketButton');
        
        closeButton.addEventListener('click', () => this.closeModal());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });
        
        linkButton.addEventListener('click', () => this.openTrinketLink());
        removeButton.addEventListener('click', () => {
            if (this.currentTrinketId) {
                this.removeTrinketFromShelf(this.currentTrinketId);
            }
        });
        
        // Drag events
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('touchmove', (e) => this.drag(e), { passive: false });
        document.addEventListener('mouseup', (e) => {
            this.endDrag(e);
            this.endResize(e);
        });
        document.addEventListener('touchend', (e) => {
            this.endDrag(e);
            this.endResize(e);
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                gallery.classList.remove('open');
            }
        });
    }
    
    startDrag(e) {
        if (e.target.classList.contains('resize-handle')) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        this.draggedElement = e.currentTarget;
        this.draggedElement.classList.add('dragging');
        this.isDragging = false; // Reset
        
        const touch = e.type === 'touchstart' ? e.touches[0] : e;
        const rect = this.draggedElement.getBoundingClientRect();
        
        this.offsetX = touch.clientX - rect.left;
        this.offsetY = touch.clientY - rect.top;
        this.dragStartX = touch.clientX;
        this.dragStartY = touch.clientY;
    }
    
    drag(e) {
        if (!this.draggedElement && !this.isResizing) return;
        
        if (this.isResizing) {
            this.resize(e);
            return;
        }
        
        e.preventDefault();
        const touch = e.type === 'touchmove' ? e.touches[0] : e;
        
        // Check if actually dragging (moved more than 5px)
        const deltaX = Math.abs(touch.clientX - this.dragStartX);
        const deltaY = Math.abs(touch.clientY - this.dragStartY);
        if (deltaX > 5 || deltaY > 5) {
            this.isDragging = true;
        }
        
        const container = document.getElementById('shelfContainer');
        const containerRect = container.getBoundingClientRect();
        
        let newX = touch.clientX - containerRect.left - this.offsetX;
        let newY = touch.clientY - containerRect.top - this.offsetY;
        
        // Convert to percentage
        const percentX = (newX / containerRect.width) * 100;
        const percentY = (newY / containerRect.height) * 100;
        
        // Constrain to container
        const constrainedX = Math.max(0, Math.min(95, percentX));
        const constrainedY = Math.max(0, Math.min(95, percentY));
        
        this.draggedElement.style.left = `${constrainedX}%`;
        this.draggedElement.style.top = `${constrainedY}%`;
        
        // Maintain scale if it exists, otherwise no transform
        const currentScale = this.draggedElement.dataset.scale || '1';
        if (currentScale !== '1') {
            this.draggedElement.style.transform = `scale(${currentScale})`;
        } else {
            this.draggedElement.style.transform = 'none';
        }
    }
    
    endDrag(e) {
        if (!this.draggedElement) return;
        
        this.draggedElement.classList.remove('dragging');
        
        // Save position if it was actually dragged
        if (this.isDragging) {
            this.saveState();
        }
        
        // Small delay to prevent click event
        setTimeout(() => {
            this.draggedElement = null;
            this.isDragging = false;
        }, 10);
    }
    
    startResize(e, element) {
        e.preventDefault();
        e.stopPropagation();
        
        this.isResizing = true;
        this.wasResizing = false;
        this.resizeElement = element;
        
        const touch = e.type === 'touchstart' ? e.touches[0] : e;
        this.resizeStartX = touch.clientX;
        this.resizeStartY = touch.clientY;
        
        const img = element.querySelector('img');
        this.resizeStartWidth = img.offsetWidth;
        
        // Get current scale if it exists
        const currentScale = parseFloat(element.dataset.scale || '1');
        this.resizeStartScale = currentScale;
        
        element.classList.add('resizing');
        
        // Prevent scrolling on touch devices during resize
        if (e.type === 'touchstart') {
            document.body.style.overflow = 'hidden';
        }
    }
    
    resize(e) {
        if (!this.isResizing || !this.resizeElement) return;
        
        e.preventDefault();
        this.wasResizing = true;
        
        const touch = e.type === 'touchmove' ? e.touches[0] : e;
        
        // Calculate distance moved diagonally (bottom-right direction)
        const deltaX = touch.clientX - this.resizeStartX;
        const deltaY = touch.clientY - this.resizeStartY;
        
        // Use the larger delta for uniform scaling
        const delta = Math.max(deltaX, deltaY);
        
        // Calculate new width based on delta
        const newWidth = this.resizeStartWidth + delta;
        
        // Get original width based on size class
        const img = this.resizeElement.querySelector('img');
        const originalWidth = this.resizeElement.classList.contains('small') ? 80 :
                            this.resizeElement.classList.contains('medium') ? 120 : 180;
        
        // Calculate scale relative to original size
        const newScale = newWidth / originalWidth;
        
        // Apply constraints
        const minScale = 0.3;
        const maxScale = 3.0;
        const constrainedScale = Math.max(minScale, Math.min(maxScale, newScale));
        
        // Apply scale transformation
        // transform-origin is set to top-left, so it will scale from that corner
        this.resizeElement.style.transform = `scale(${constrainedScale})`;
        this.resizeElement.dataset.scale = constrainedScale;
    }
    
    endResize(e) {
        if (!this.isResizing) return;
        
        this.isResizing = false;
        
        // Restore scrolling on touch devices
        document.body.style.overflow = 'auto';
        
        if (this.resizeElement) {
            this.resizeElement.classList.remove('resizing');
            this.saveState();
        }
        
        // Delay to prevent click event
        setTimeout(() => {
            this.resizeElement = null;
            this.wasResizing = false;
        }, 50);
    }
    
    openModal(trinket) {
        const modal = document.getElementById('trinketModal');
        const modalImage = document.getElementById('modalImage');
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage');
        const modalLinkButton = document.getElementById('modalLinkButton');
        
        modalImage.src = trinket.image;
        modalTitle.textContent = trinket.title;
        modalMessage.textContent = trinket.message;
        
        modalLinkButton.dataset.link = trinket.link;
        this.currentTrinketId = trinket.id;
        
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
    
    closeModal() {
        const modal = document.getElementById('trinketModal');
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
        this.currentTrinketId = null;
    }
    
    openTrinketLink() {
        const linkButton = document.getElementById('modalLinkButton');
        const link = linkButton.dataset.link;
        
        if (link) {
            window.open(link, '_blank');
        }
    }
    
    resetShelf() {
        // Remove all trinkets
        this.trinketElements.forEach(element => element.remove());
        this.trinketElements.clear();
        this.addedTrinkets.clear();
        
        // Update gallery
        document.querySelectorAll('.gallery-trinket').forEach(card => {
            card.classList.remove('added');
        });
        
        // Clear storage
        localStorage.removeItem('concertShelfState');
        
        // Show feedback
        const resetButton = document.getElementById('resetShelf');
        const originalText = resetButton.textContent;
        resetButton.textContent = '✅ Shelf vaciado!';
        setTimeout(() => {
            resetButton.textContent = originalText;
        }, 2000);
    }
    
    saveState() {
        const state = {
            trinkets: []
        };
        
        this.trinketElements.forEach((element, id) => {
            state.trinkets.push({
                id: id,
                top: element.style.top,
                left: element.style.left,
                scale: element.dataset.scale || '1'
            });
        });
        
        localStorage.setItem('concertShelfState', JSON.stringify(state));
    }
    
    loadSavedTrinkets() {
        const saved = localStorage.getItem('concertShelfState');
        if (!saved) return;
        
        try {
            const state = JSON.parse(saved);
            
            state.trinkets.forEach(saved => {
                const trinketData = trinketsData.find(t => t.id === saved.id);
                if (trinketData) {
                    const container = document.getElementById('shelfContainer');
                    const trinketElement = this.createTrinketElement(trinketData);
                    
                    trinketElement.style.top = saved.top;
                    trinketElement.style.left = saved.left;
                    
                    const scale = saved.scale || '1';
                    if (scale !== '1') {
                        trinketElement.style.transform = `scale(${scale})`;
                        trinketElement.dataset.scale = scale;
                    } else {
                        trinketElement.style.transform = 'none';
                    }
                    
                    container.appendChild(trinketElement);
                    this.trinketElements.set(trinketData.id, trinketElement);
                    this.addedTrinkets.add(trinketData.id);
                    this.updateGalleryStatus(trinketData.id, true);
                }
            });
        } catch (error) {
            console.error('Error loading saved state:', error);
        }
    }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ConcertShelfInteractive();
});
