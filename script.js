class ShopPWA {
    constructor() {
        this.cart = JSON.parse(localStorage.getItem('cart')) || [];
        this.products = [];
        this.filteredProducts = [];
        this.searchQuery = '';
        this.isOnline = navigator.onLine;
        this.deferredPrompt = null;
        
        this.init();
    }
    
    async init() {
        // Register Service Worker
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register(this.getServiceWorkerCode());
                console.log('Service Worker registered:', registration);
                
                // Listen for updates
                registration.addEventListener('updatefound', () => {
                    this.showToast('New version available! Refresh to update.', 'info');
                });
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load products
        await this.loadProducts();
        
        // Update UI based on connection status
        this.updateConnectionStatus();
        
        // Request notification permission
        this.setupNotifications();
        
        // Setup install prompt
        this.setupInstallPrompt();
        
        // Update cart UI
        this.updateCartUI();
    }
    
    getServiceWorkerCode() {
        const swCode = `
            const CACHE_NAME = 'shoppwa-v1';
            const urlsToCache = [
                '/',
                'https://cdn.tailwindcss.com'
            ];
            
            self.addEventListener('install', event => {
                event.waitUntil(
                    caches.open(CACHE_NAME)
                        .then(cache => cache.addAll(urlsToCache))
                );
            });
            
            self.addEventListener('fetch', event => {
                event.respondWith(
                    caches.match(event.request)
                        .then(response => {
                            if (response) {
                                return response;
                            }
                            return fetch(event.request);
                        })
                );
            });
            
            self.addEventListener('push', event => {
                const options = {
                    body: event.data ? event.data.text() : 'New deals available!',
                    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9IiMyNTYzZWIiPjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiByeD0iMSIgZmlsbD0iI3RoZW1lLWNvbG9yIi8+PC9zdmc+',
                    badge: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9IiMyNTYzZWIiPjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiByeD0iMSIgZmlsbD0iI3RoZW1lLWNvbG9yIi8+PC9zdmc+',
                    vibrate: [100, 50, 100],
                    data: {
                        dateOfArrival: Date.now(),
                        primaryKey: '2'
                    }
                };
                
                event.waitUntil(
                    self.registration.showNotification('ShopPWA', options)
                );
            });
        `;
        
        const blob = new Blob([swCode], { type: 'application/javascript' });
        return URL.createObjectURL(blob);
    }
    
    setupEventListeners() {
        // Online/Offline events
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateConnectionStatus();
            this.showToast('Back online! Syncing data...', 'success');
            this.syncData();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateConnectionStatus();
        });
        
        // Cart events
        document.getElementById('cartBtn').addEventListener('click', () => this.showCart());
        document.getElementById('closeCart').addEventListener('click', () => this.hideCart());
        document.getElementById('checkoutBtn').addEventListener('click', () => this.checkout());
        
        // Sync button
        document.getElementById('syncBtn').addEventListener('click', () => this.syncData());
        
        // Notification button
        document.getElementById('notificationBtn').addEventListener('click', () => this.requestNotificationPermission());
        
        // Install prompt
        document.getElementById('installBtn').addEventListener('click', () => this.installApp());
        document.getElementById('dismissInstall').addEventListener('click', () => this.dismissInstallPrompt());
        
        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('mobileSearchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));
        
        // PWA install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallPrompt();
        });
    }
    
    async loadProducts() {
        // Try to load from cache first
        const cachedProducts = localStorage.getItem('products');
        if (cachedProducts) {
            this.products = JSON.parse(cachedProducts);
            this.renderProducts();
        }
        
        // If online, fetch fresh data
        if (this.isOnline) {
            try {
                // Simulate API call with sample data
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                this.products = [
                    {
                        id: 1,
                        name: "Wireless Headphones",
                        price: 8299,
                        image: "🎧",
                        description: "Premium wireless headphones with noise cancellation",
                        inStock: true
                    },
                    {
                        id: 2,
                        name: "Smart Watch",
                        price: 24999,
                        image: "⌚",
                        description: "Advanced fitness tracking and notifications",
                        inStock: true
                    },
                    {
                        id: 3,
                        name: "Laptop Stand",
                        price: 4199,
                        image: "💻",
                        description: "Ergonomic aluminum laptop stand",
                        inStock: true
                    },
                    {
                        id: 4,
                        name: "Phone Case",
                        price: 2099,
                        image: "📱",
                        description: "Protective case with wireless charging support",
                        inStock: false
                    },
                    {
                        id: 5,
                        name: "Bluetooth Speaker",
                        price: 6699,
                        image: "🔊",
                        description: "Portable speaker with 360° sound",
                        inStock: true
                    },
                    {
                        id: 6,
                        name: "USB-C Hub",
                        price: 3299,
                        image: "🔌",
                        description: "Multi-port hub with 4K HDMI output",
                        inStock: true
                    }
                ];
                
                // Cache products
                localStorage.setItem('products', JSON.stringify(this.products));
                this.renderProducts();
                
            } catch (error) {
                console.error('Failed to load products:', error);
                this.showToast('Failed to load new products', 'error');
            }
        }
    }
    
    handleSearch(query) {
        this.searchQuery = query.toLowerCase().trim();
        
        // Sync both search inputs
        document.getElementById('searchInput').value = query;
        document.getElementById('mobileSearchInput').value = query;
        
        this.renderProducts();
    }
    
    getFilteredProducts() {
        if (!this.searchQuery) {
            return this.products;
        }
        
        return this.products.filter(product => 
            product.name.toLowerCase().includes(this.searchQuery) ||
            product.description.toLowerCase().includes(this.searchQuery)
        );
    }
    
    renderProducts() {
        const grid = document.getElementById('productsGrid');
        const filteredProducts = this.getFilteredProducts();
        
        if (filteredProducts.length === 0 && this.searchQuery) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <div class="text-4xl mb-4">🔍</div>
                    <h3 class="text-xl font-semibold text-gray-600 mb-2">No products found</h3>
                    <p class="text-gray-500">Try adjusting your search terms for "${this.searchQuery}"</p>
                    <button onclick="app.clearSearch()" class="mt-4 text-blue-600 hover:text-blue-700 font-medium">Clear Search</button>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = filteredProducts.map(product => `
            <div class="product-card bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="p-6">
                    <div class="text-4xl mb-4 text-center">${product.image}</div>
                    <h3 class="font-semibold text-lg mb-2">${product.name}</h3>
                    <p class="text-gray-600 text-sm mb-4">${product.description}</p>
                    <div class="flex items-center justify-between">
                        <span class="text-2xl font-bold text-blue-600">₹${product.price.toLocaleString('en-IN')}</span>
                        <button 
                            onclick="app.addToCart(${product.id})"
                            class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors ${!product.inStock ? 'opacity-50 cursor-not-allowed' : ''}"
                            ${!product.inStock ? 'disabled' : ''}
                        >
                            ${product.inStock ? 'Add to Cart' : 'Out of Stock'}
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    clearSearch() {
        this.searchQuery = '';
        document.getElementById('searchInput').value = '';
        document.getElementById('mobileSearchInput').value = '';
        this.renderProducts();
    }
    
    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product || !product.inStock) return;
        
        const existingItem = this.cart.find(item => item.id === productId);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cart.push({ ...product, quantity: 1 });
        }
        
        this.saveCart();
        this.updateCartUI();
        this.showToast(`${product.name} added to cart!`, 'success');
        
        // Trigger haptic feedback if available
        if ('vibrate' in navigator) {
            navigator.vibrate(50);
        }
    }
    
    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.saveCart();
        this.updateCartUI();
        this.renderCart();
    }
    
    updateQuantity(productId, change) {
        const item = this.cart.find(item => item.id === productId);
        if (item) {
            item.quantity += change;
            if (item.quantity <= 0) {
                this.removeFromCart(productId);
            } else {
                this.saveCart();
                this.updateCartUI();
                this.renderCart();
            }
        }
    }
    
    saveCart() {
        localStorage.setItem('cart', JSON.stringify(this.cart));
    }
    
    updateCartUI() {
        const badge = document.getElementById('cartBadge');
        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        
        if (totalItems > 0) {
            badge.textContent = totalItems;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
    
    showCart() {
        this.renderCart();
        document.getElementById('cartModal').classList.remove('hidden');
    }
    
    hideCart() {
        document.getElementById('cartModal').classList.add('hidden');
    }
    
    renderCart() {
        const container = document.getElementById('cartItems');
        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        if (this.cart.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <div class="text-4xl mb-4">🛒</div>
                    <p class="text-gray-500">Your cart is empty</p>
                </div>
            `;
        } else {
            container.innerHTML = this.cart.map(item => `
                <div class="flex items-center gap-4 py-4 border-b border-gray-100 last:border-b-0">
                    <div class="text-2xl">${item.image}</div>
                    <div class="flex-1">
                        <h4 class="font-medium">${item.name}</h4>
                        <p class="text-sm text-gray-500">₹${item.price.toLocaleString('en-IN')}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="app.updateQuantity(${item.id}, -1)" class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">-</button>
                        <span class="w-8 text-center">${item.quantity}</span>
                        <button onclick="app.updateQuantity(${item.id}, 1)" class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">+</button>
                    </div>
                    <button onclick="app.removeFromCart(${item.id})" class="text-red-500 hover:text-red-700 ml-2">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            `).join('');
        }
        
        document.getElementById('cartTotal').textContent = `₹${total.toLocaleString('en-IN')}`;
    }
    
    checkout() {
        if (this.cart.length === 0) return;
        
        // Simulate checkout process
        this.showToast('Processing order...', 'info');
        
        setTimeout(() => {
            this.cart = [];
            this.saveCart();
            this.updateCartUI();
            this.hideCart();
            this.showToast('Order placed successfully! 🎉', 'success');
            
            // Send push notification after delay
            setTimeout(() => {
                this.sendPushNotification('Order confirmed! Your items will be delivered soon.');
            }, 3000);
        }, 2000);
    }
    
    updateConnectionStatus() {
        const indicator = document.getElementById('offlineIndicator');
        const status = document.getElementById('connectionStatus');
        
        if (this.isOnline) {
            indicator.classList.remove('show');
            status.classList.remove('hidden');
            status.className = 'mb-6 p-4 rounded-lg bg-green-100 text-green-800';
            status.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="w-3 h-3 bg-green-500 rounded-full"></span>
                    <span class="font-medium">Online</span> - All features available
                </div>
            `;
        } else {
            indicator.classList.add('show');
            status.classList.remove('hidden');
            status.className = 'mb-6 p-4 rounded-lg bg-orange-100 text-orange-800';
            status.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="w-3 h-3 bg-orange-500 rounded-full"></span>
                    <span class="font-medium">Offline</span> - Browsing cached content
                </div>
            `;
        }
    }
    
    async syncData() {
        if (!this.isOnline) {
            this.showToast('Cannot sync while offline', 'error');
            return;
        }
        
        this.showToast('Syncing data...', 'info');
        await this.loadProducts();
        this.showToast('Data synced successfully!', 'success');
    }
    
    async setupNotifications() {
        if ('Notification' in window) {
            const permission = await Notification.permission;
            if (permission === 'granted') {
                document.getElementById('notificationBtn').style.display = 'none';
            }
        }
    }
    
    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            this.showToast('Notifications not supported on this browser', 'error');
            return;
        }
        
        try {
            // Check current permission status
            let permission = Notification.permission;
            
            if (permission === 'granted') {
                this.showToast('Notifications are already enabled! 🔔', 'success');
                document.getElementById('notificationBtn').style.display = 'none';
                return;
            }
            
            if (permission === 'denied') {
                this.showToast('Notifications were previously blocked', 'warning');
                setTimeout(() => {
                    this.showToast('Please click the 🔒 icon in your address bar and allow notifications', 'info');
                }, 2000);
                return;
            }
            
            // Request permission for first time
            if (permission === 'default') {
                this.showToast('Please allow notifications when prompted', 'info');
                
                // Small delay to show the message before permission dialog
                setTimeout(async () => {
                    try {
                        permission = await Notification.requestPermission();
                        
                        if (permission === 'granted') {
                            this.showToast('Notifications enabled successfully! 🔔', 'success');
                            document.getElementById('notificationBtn').style.display = 'none';
                            
                            // Send welcome notification
                            setTimeout(() => {
                                this.sendPushNotification('Welcome to ShopPWA! You\'ll receive updates about deals and orders.');
                            }, 1000);
                        } else if (permission === 'denied') {
                            this.showToast('Notifications blocked. You can enable them later in browser settings.', 'warning');
                        } else {
                            this.showToast('Notification permission not granted', 'info');
                        }
                    } catch (error) {
                        console.error('Error requesting notification permission:', error);
                        this.showToast('Error requesting notification permission', 'error');
                    }
                }, 500);
            }
        } catch (error) {
            console.error('Notification permission error:', error);
            this.showToast('Error with notification permissions', 'error');
        }
    }
    
    sendPushNotification(message) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('ShopPWA', {
                body: message,
                icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9IiMyNTYzZWIiPjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiByeD0iMSIgZmlsbD0iI3RoZW1lLWNvbG9yIi8+PC9zdmc+',
                badge: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4IiBoZWlnaHQ9IjEyOCIgdmlld0JveD0iMCAwIDEyOCAxMjgiIGZpbGw9IiMyNTYzZWIiPjxyZWN0IHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiByeD0iMSIgZmlsbD0iI3RoZW1lLWNvbG9yIi8+PC9zdmc+',
                vibrate: [100, 50, 100]
            });
        }
    }
    
    setupInstallPrompt() {
        // Auto-show install prompt after 30 seconds if not installed
        setTimeout(() => {
            if (this.deferredPrompt && !window.matchMedia('(display-mode: standalone)').matches) {
                this.showInstallPrompt();
            }
        }, 30000);
    }
    
    showInstallPrompt() {
        document.getElementById('installPrompt').classList.add('show');
    }
    
    dismissInstallPrompt() {
        document.getElementById('installPrompt').classList.remove('show');
    }
    
    async installApp() {
        if (!this.deferredPrompt) return;
        
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            this.showToast('App installed successfully!', 'success');
        } else {
            this.showToast('Installation cancelled', 'info');
        }
        
        this.deferredPrompt = null;
        this.dismissInstallPrompt();
    }
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            info: 'bg-blue-500',
            warning: 'bg-orange-500'
        };
        
        toast.className = `${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg slide-in max-w-sm`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            toast.style.opacity = '0';
            setTimeout(() => container.removeChild(toast), 300);
        }, 4000);
    }
}

// Initialize the PWA
const app = new ShopPWA();

// Expose app globally for onclick handlers
window.app = app;