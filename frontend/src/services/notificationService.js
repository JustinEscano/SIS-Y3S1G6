// src/services/NotificationService.js (Updated: Added markAsUnread and bulkMarkAsUnread methods)
import AppService from '../appService'; // Adjust path as needed (matching teacherService)

class NotificationService {
  /**
   * Get recent notifications (last 5, sorted by createdAt desc)
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of notifications
   */
  static async getRecentNotifications(userId) {
    try {
      // Use AppService with params for page=1, limit=5 (controller handles sort)
      const { data } = await AppService.get(`/notifications/${userId}`, {
        params: { page: 1, limit: 5 }
      });
      return data.notifications || [];
    } catch (error) {
      console.error('Failed to fetch recent notifications:', error);
      throw error;
    }
  }

  /**
   * Get unread count (uses dedicated endpoint if available, fallback to list with read=false)
   * @param {string} userId - User ID
   * @returns {Promise<number>} Unread count
   */
  static async getUnreadCount(userId) {
    try {
      // Try dedicated endpoint first
      const { data } = await AppService.get(`/notifications/${userId}/unread-count`);
      return data.unreadCount || 0;
    } catch (error) {
      // Fallback to list endpoint with read=false
      console.warn('Unread endpoint not available, falling back to list query');
      const { data: listData } = await AppService.get(`/notifications/${userId}`, {
        params: { read: false, limit: 1, page: 1 } // Just need count, limit 1 for efficiency
      });
      return listData.total || 0;
    }
  }

  /**
   * Get user notifications with filters/pagination
   * @param {string} userId - User ID
   * @param {Object} options - { page, limit, read? (null for all, true/false) }
   * @returns {Promise<Object>} { notifications, currentPage, totalPages, total }
   */
  static async getUserNotifications(userId, options = {}) {
    const { page = 1, limit = 10, read = null } = options;
    try {
      const params = { page, limit };
      if (read !== null) params.read = read; // AppService/Axios serializes boolean to 'true'/'false'
      const { data } = await AppService.get(`/notifications/${userId}`, { params });
      return data;
    } catch (error) {
      console.error('Failed to fetch user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark a single notification as read
   * @param {string} userId - User ID
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} Updated notification
   */
  static async markAsRead(userId, notificationId) {
    try {
      const { data } = await AppService.patch(`/notifications/${userId}/mark-read`, { notificationId });
      return data.data || data; // Flexible for single response
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  /**
   * NEW: Mark a single notification as unread
   * @param {string} userId - User ID
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} Updated notification
   */
  static async markAsUnread(userId, notificationId) {
    try {
      const { data } = await AppService.patch(`/notifications/${userId}/mark-unread`, { notificationId });
      return data.data || data; // Flexible for single response
    } catch (error) {
      console.error('Failed to mark notification as unread:', error);
      throw error;
    }
  }

  /**
   * Bulk mark notifications as read
   * @param {string} userId - User ID
   * @param {Array<string>} notificationIds - Array of notification IDs
   * @returns {Promise<number>} Number of updated notifications
   */
  static async bulkMarkAsRead(userId, notificationIds) {
    try {
      const { data } = await AppService.patch(`/notifications/${userId}/mark-read`, { notificationIds });
      return data.updated || 0;
    } catch (error) {
      console.error('Failed to bulk mark notifications as read:', error);
      throw error;
    }
  }

  /**
   * NEW: Bulk mark notifications as unread
   * @param {string} userId - User ID
   * @param {Array<string>} notificationIds - Array of notification IDs
   * @returns {Promise<number>} Number of updated notifications
   */
  static async bulkMarkAsUnread(userId, notificationIds) {
    try {
      const { data } = await AppService.patch(`/notifications/${userId}/mark-unread`, { notificationIds });
      return data.updated || 0;
    } catch (error) {
      console.error('Failed to bulk mark notifications as unread:', error);
      throw error;
    }
  }

  /**
   * Create a test notification (for debugging)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Created notification
   */
  static async createTestNotification(userId) {
    try {
      const { data } = await AppService.post(`/notifications/${userId}/test`);
      return data.data || data;
    } catch (error) {
      console.error('Failed to create test notification:', error);
      throw error;
    }
  }
}

export default NotificationService;