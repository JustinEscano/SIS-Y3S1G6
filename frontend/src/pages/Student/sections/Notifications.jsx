// src/pages/Student/Notifications.js
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from '../../../context/authContext';
import NotificationService from '../../../services/notificationService';
import { 
  ArrowPathIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  EyeIcon, 
  EyeSlashIcon 
} from '@heroicons/react/24/outline';

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [globalUnread, setGlobalUnread] = useState(0);
  const [globalRead, setGlobalRead] = useState(0);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const limit = 10;
  const userId = user?.id;

  // Student-specific content
  const studentContent = {
    heroTitle: "Stay updated on your learning journey",
    heroDescription: "Track assignment deadlines, grade updates, and important class announcements in one place.",
    emptyTitle: "No notifications yet",
    emptyDescription: "You're all caught up! New assignment alerts and grade updates will appear here.",
    summaryCards: [
      {
        label: 'All notifications',
        value: total,
        helper: 'Assignment deadlines, grade updates, and class announcements.',
        accent: '#f97316'
      },
      {
        label: 'Unread items',
        value: globalUnread,
        helper: 'Important updates that need your attention.',
        accent: '#22c55e'
      },
      {
        label: 'Reviewed updates',
        value: globalRead,
        helper: 'Notifications you have already checked.',
        accent: '#3b82f6'
      }
    ]
  };

  // Fetch global counts
  const fetchCounts = useCallback(async () => {
    if (!userId) return;

    try {
      const [unreadData, readData] = await Promise.all([
        NotificationService.getUserNotifications(userId, { read: false, limit: 1 }),
        NotificationService.getUserNotifications(userId, { read: true, limit: 1 })
      ]);
      setGlobalUnread(unreadData.total || 0);
      setGlobalRead(readData.total || 0);
    } catch (error) {
      console.error('Failed to fetch notification counts:', error);
    }
  }, [userId]);

  // Fetch notifications with current filter and pagination
  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const options = { 
        page: currentPage, 
        limit, 
        read: filter === 'unread' ? false : (filter === 'read' ? true : null) 
      };
      const data = await NotificationService.getUserNotifications(userId, options);
      setNotifications(data.notifications || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
      setSelectAll(false);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setError('Failed to load notifications. Please try refreshing.');
      setNotifications([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filter, limit, userId]);

  // Mark single notification as read
  const markAsRead = async (notificationId) => {
    if (!userId) return;
    
    try {
      await NotificationService.markAsRead(userId, notificationId);
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, read: true } 
            : notif
        )
      );
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
      fetchCounts();
    } catch (error) {
      console.error('Failed to mark as read:', error);
      setError('Failed to mark as read.');
    }
  };

  // Mark single notification as unread
  const markAsUnread = async (notificationId) => {
    if (!userId) return;
    
    try {
      await NotificationService.markAsUnread(userId, notificationId);
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { ...notif, read: false } 
            : notif
        )
      );
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
      fetchCounts();
    } catch (error) {
      console.error('Failed to mark as unread:', error);
      setError('Failed to mark as unread.');
    }
  };

  // Bulk mark as read
  const bulkMarkAsRead = async () => {
    if (!userId || selectedIds.size === 0) return;
    
    try {
      await NotificationService.bulkMarkAsRead(userId, Array.from(selectedIds));
      setNotifications(prev => 
        prev.map(notif => 
          selectedIds.has(notif._id) && !notif.read
            ? { ...notif, read: true } 
            : notif
        )
      );
      setSelectedIds(new Set());
      setSelectAll(false);
      fetchCounts();
    } catch (error) {
      console.error('Failed to bulk mark as read:', error);
      setError('Failed to bulk mark as read.');
    }
  };

  // Bulk mark as unread
  const bulkMarkAsUnread = async () => {
    if (!userId || selectedIds.size === 0) return;
    
    try {
      await NotificationService.bulkMarkAsUnread(userId, Array.from(selectedIds));
      setNotifications(prev => 
        prev.map(notif => 
          selectedIds.has(notif._id) && notif.read
            ? { ...notif, read: false } 
            : notif
        )
      );
      setSelectedIds(new Set());
      setSelectAll(false);
      fetchCounts();
    } catch (error) {
      console.error('Failed to bulk mark as unread:', error);
      setError('Failed to bulk mark as unread.');
    }
  };

  // Toggle selection for single notification
  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Toggle select all on current page
  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map(n => n._id)));
    }
    setSelectAll(!selectAll);
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // Get icon for notification type
  const getTypeIcon = (type) => {
    const icons = {
      enrollment: '📚',
      grade_update: '📈',
      assignment: '📝',
      welcome: '👋',
      test: '🧪',
      announcement: '📢',
      system: '⚙️',
      deadline: '⏰',
      submission: '📤',
      feedback: '💬'
    };
    return icons[type] || '🔔';
  };

  // Format date for display
  const formatDate = (value) => {
    try {
      return new Date(value).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return value;
    }
  };

  // Effects
  useEffect(() => {
    if (userId) {
      fetchCounts();
    }
  }, [fetchCounts, userId]);

  useEffect(() => {
    if (userId) {
      fetchNotifications();
    }
  }, [fetchNotifications, userId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <ArrowPathIcon className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-2 text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 pb-16 pt-10 sm:px-8 min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#410b13] via-[#8d1322] to-[#f25c74] text-white shadow-2xl">
        <div
          className="absolute inset-0 opacity-30"
          style={{ backgroundImage: "radial-gradient(circle at 15% 20%, rgba(255,255,255,0.65), transparent 60%)" }}
          aria-hidden="true"
        />
        <div className="relative z-10 space-y-8 p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4 max-w-2xl">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white hover:bg-white/20 transition"
              >
                <ChevronLeftIcon className="h-4 w-4" />
                Back
              </button>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold md:text-4xl text-white">{studentContent.heroTitle}</h1>
                <p className="text-sm text-white">
                  {studentContent.heroDescription}
                </p>
              </div>
            </div>
            <button
              onClick={fetchNotifications}
              className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/25 shadow-lg shadow-black/20"
            >
              <ArrowPathIcon className="h-5 w-5" />
              Refresh feed
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {studentContent.summaryCards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl bg-white/18 p-5 backdrop-blur-md shadow-xl shadow-black/10 ring-1 ring-white/25"
              >
                <p className="text-xs uppercase tracking-wider text-white">{card.label}</p>
                <p className="mt-3 text-3xl font-semibold text-white" style={{ textShadow: '0 8px 18px rgba(0,0,0,0.35)' }}>
                  {card.value}
                </p>
                <p className="mt-2 text-xs text-white leading-relaxed">{card.helper}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-100 text-blue-700 border border-blue-300 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            All ({total})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-blue-100 text-blue-700 border border-blue-300 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Unread ({globalUnread})
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'read'
                ? 'bg-blue-100 text-blue-700 border border-blue-300 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Read ({globalRead})
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800 font-medium">{selectedIds.size} notification{selectedIds.size !== 1 ? 's' : ''} selected</span>
            <div className="flex space-x-2">
              <button
                onClick={bulkMarkAsRead}
                className="flex items-center px-3 py-2 text-xs text-green-700 hover:text-green-900 font-medium bg-green-100 rounded-lg border border-green-300 transition-colors hover:bg-green-200"
              >
                <EyeIcon className="h-3 w-3 mr-1" />
                Mark as Read
              </button>
              <button
                onClick={bulkMarkAsUnread}
                className="flex items-center px-3 py-2 text-xs text-red-700 hover:text-red-900 font-medium bg-red-100 rounded-lg border border-red-300 transition-colors hover:bg-red-200"
              >
                <EyeSlashIcon className="h-3 w-3 mr-1" />
                Mark as Unread
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={toggleSelectAll}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700 font-medium">Select all on this page</span>
          </label>
        </div>
        
        {notifications.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-300 mb-4 text-6xl">🔔</div>
            <p className="text-gray-600 text-xl font-semibold mb-2">{studentContent.emptyTitle}</p>
            <p className="text-gray-500 text-sm max-w-md mx-auto">{studentContent.emptyDescription}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notif) => (
              <div
                key={notif._id}
                className={`rounded-xl p-5 border transition-all duration-200 hover:shadow-lg cursor-pointer ${
                  !notif.read 
                    ? 'bg-blue-50/80 border-blue-200 ring-1 ring-blue-100' 
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(notif._id)}
                    onChange={() => toggleSelect(notif._id)}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-shrink-0 mt-1">
                    <span className="text-2xl">{getTypeIcon(notif.type)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className={`text-sm font-semibold ${
                          !notif.read ? 'text-gray-900' : 'text-gray-700'
                        }`}>
                          {notif.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1 leading-relaxed">{notif.message}</p>
                        <p className={`text-xs mt-3 ${
                          notif.read ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {formatDate(notif.createdAt)} {notif.read && '• Read'}
                        </p>
                      </div>
                      {!notif.read && (
                        <div className="flex-shrink-0 ml-3">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notif._id);
                      }}
                      disabled={notif.read}
                      className="p-2 text-green-600 hover:text-green-800 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-green-50 transition-colors"
                      title="Mark as read"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsUnread(notif._id);
                      }}
                      disabled={!notif.read}
                      className="p-2 text-red-600 hover:text-red-800 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-red-50 transition-colors"
                      title="Mark as unread"
                    >
                      <EyeSlashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
            <div className="text-sm text-gray-700">
              Showing page {currentPage} of {totalPages} • {total} total notifications
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center space-x-1"
              >
                <ChevronLeftIcon className="h-4 w-4" />
                <span>Previous</span>
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors flex items-center space-x-1"
              >
                <span>Next</span>
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;