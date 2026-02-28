// Push Notification Service for Najah Tutors
// Include this script in your HTML pages to enable push notifications

class PushNotificationService {
    constructor() {
        this.apiBaseUrl = window.location.origin + '/api';
        this.authToken = localStorage.getItem('authToken');
        this.vapidPublicKey = null;
        this.swRegistration = null;
    }

    // Initialize push notification service
    async init() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn('Push notifications are not supported in this browser');
            return false;
        }

        try {
            // Get VAPID public key from server
            const response = await fetch(`${this.apiBaseUrl}/notifications/vapid-key`);
            const result = await response.json();
            
            if (!result.success || !result.data.publicKey) {
                console.warn('Push notifications not configured on server');
                return false;
            }

            this.vapidPublicKey = result.data.publicKey;

            // Register service worker
            this.swRegistration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered');

            // Check if already subscribed
            const subscription = await this.swRegistration.pushManager.getSubscription();
            if (subscription) {
                console.log('Already subscribed to push notifications');
                return true;
            }

            return true;
        } catch (error) {
            console.error('Error initializing push notifications:', error);
            return false;
        }
    }

    // Request notification permission and subscribe
    async subscribe() {
        if (!this.swRegistration || !this.vapidPublicKey) {
            await this.init();
        }

        if (!this.swRegistration) {
            throw new Error('Service Worker not registered');
        }

        try {
            // Request notification permission
            const permission = await Notification.requestPermission();
            
            if (permission !== 'granted') {
                throw new Error('Notification permission denied');
            }

            // Subscribe to push notifications
            const subscription = await this.swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
            });

            // Send subscription to server
            if (this.authToken) {
                const response = await fetch(`${this.apiBaseUrl}/notifications/subscribe`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.authToken}`
                    },
                    body: JSON.stringify({ subscription })
                });

                const result = await response.json();
                
                if (result.success) {
                    console.log('Successfully subscribed to push notifications');
                    this.showNotification('Push Notifications Enabled', 'You will now receive notifications about your classes');
                    return true;
                } else {
                    throw new Error(result.message || 'Failed to save subscription');
                }
            } else {
                console.warn('User not logged in. Subscription saved locally but not synced to server.');
                return true;
            }
        } catch (error) {
            console.error('Error subscribing to push notifications:', error);
            throw error;
        }
    }

    // Unsubscribe from push notifications
    async unsubscribe() {
        if (!this.swRegistration) {
            return false;
        }

        try {
            const subscription = await this.swRegistration.pushManager.getSubscription();
            
            if (subscription) {
                await subscription.unsubscribe();
            }

            // Notify server
            if (this.authToken) {
                await fetch(`${this.apiBaseUrl}/notifications/unsubscribe`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.authToken}`
                    }
                });
            }

            console.log('Unsubscribed from push notifications');
            this.showNotification('Push Notifications Disabled', 'You will no longer receive push notifications');
            return true;
        } catch (error) {
            console.error('Error unsubscribing:', error);
            return false;
        }
    }

    // Check subscription status
    async isSubscribed() {
        if (!this.swRegistration) {
            await this.init();
        }

        if (!this.swRegistration) {
            return false;
        }

        const subscription = await this.swRegistration.pushManager.getSubscription();
        return subscription !== null;
    }

    // Update notification preferences
    async updatePreferences(preferences) {
        if (!this.authToken) {
            throw new Error('User must be logged in to update preferences');
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/notifications/preferences`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify(preferences)
            });

            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('Error updating preferences:', error);
            throw error;
        }
    }

    // Send test notification
    async sendTestNotification() {
        if (!this.authToken) {
            throw new Error('User must be logged in');
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/notifications/test`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error sending test notification:', error);
            throw error;
        }
    }

    // Helper: Convert VAPID key
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // Show a notification (for UI feedback)
    showNotification(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: '/najah.png',
                badge: '/najah.png'
            });
        }
    }
}

// Create global instance
const pushNotificationService = new PushNotificationService();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Only initialize if user is logged in
    if (localStorage.getItem('authToken')) {
        await pushNotificationService.init();
        
        // Check if user wants to enable notifications
        const notificationPref = localStorage.getItem('enableNotifications');
        if (notificationPref === 'true') {
            const isSubscribed = await pushNotificationService.isSubscribed();
            if (!isSubscribed) {
                // Show a prompt to enable notifications
                setTimeout(() => {
                    if (confirm('Would you like to receive push notifications about your classes?')) {
                        pushNotificationService.subscribe().catch(err => {
                            console.error('Failed to subscribe:', err);
                            alert('Failed to enable push notifications. Please check your browser settings.');
                        });
                    }
                }, 2000);
            }
        }
    }
});

