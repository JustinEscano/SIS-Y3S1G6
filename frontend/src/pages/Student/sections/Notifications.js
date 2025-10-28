// src/pages/Student/Notifications.js (Updated: Removed Test button; added global counts for filters that don't change on tab switch)
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NotificationService from '../../../services/notificationService'; // Adjust path as needed
import { ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon, CheckIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', or 'read'
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [globalUnread, setGlobalUnread] = useState(0); // NEW: Global unread count
  const [globalRead, setGlobalRead] = useState(0); // NEW: Global read count
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const limit = 10;
  // FIXED: Updated to actual Student ID with notifications (from DB: "68e9b754beb6f72e4ab8ee15")
  // TODO: Replace with dynamic user._id from auth context in production
  const userId = '68e9b754beb6f72e4ab8ee15';

  useEffect(() => {
    fetchCounts(); // NEW: Fetch global counts on mount
    fetchNotifications();
  }, []); // Initial load

  useEffect(() => {
    fetchNotifications();
  }, [filter, currentPage]);

  // NEW: Fetch global unread and read counts (independent of filter/pagination)
  const fetchCounts = async () => {
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
  };

  const fetchNotifications = async () => {
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
      setError('Failed to load notifications. Please try refreshing or check if user ID is valid.');
      // Fallback to mock data if needed (updated dates to match current 2025-10-28)
      setNotifications([
        { _id: '1', title: 'New Enrollment', message: 'You have been enrolled in Math C!', createdAt: '2025-10-28T10:00:00Z', read: false, type: 'enrollment' },
        { _id: '2', title: 'Grade Updated', message: 'Your Q1 grade in Math C has been updated to 85.', createdAt: '2025-10-27T14:30:00Z', read: true, type: 'grade_update' },
        { _id: '3', title: 'New Assignment', message: 'Homework due in Science.', createdAt: '2025-10-26T09:15:00Z', read: false, type: 'assignment' },
        { _id: '4', title: 'Welcome', message: 'Welcome to the portal!', createdAt: '2025-10-25T08:00:00Z', read: true, type: 'welcome' }
      ]);
      setTotalPages(1);
      setTotal(4);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
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
      // NEW: Update global counts after action
      fetchCounts();
    } catch (error) {
      console.error('Failed to mark as read:', error);
      setError('Failed to mark as read.');
    }
  };

  // NEW: Mark as unread for individual
  const markAsUnread = async (notificationId) => {
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
      // NEW: Update global counts after action
      fetchCounts();
    } catch (error) {
      console.error('Failed to mark as unread:', error);
      setError('Failed to mark as unread.');
    }
  };

  const bulkMarkAsRead = async () => {
    if (selectedIds.size === 0) return;
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
      // NEW: Update global counts after action
      fetchCounts();
    } catch (error) {
      console.error('Failed to bulk mark as read:', error);
      setError('Failed to bulk mark as read.');
    }
  };

  // NEW: Bulk mark as unread
  const bulkMarkAsUnread = async () => {
    if (selectedIds.size === 0) return;
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
      // NEW: Update global counts after action
      fetchCounts();
    } catch (error) {
      console.error('Failed to bulk mark as unread:', error);
      setError('Failed to bulk mark as unread.');
    }
  };

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

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map(n => n._id)));
    }
    setSelectAll(!selectAll);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'enrollment': return '📚';
      case 'grade_update': return '📈';
      case 'assignment': return '📝';
      case 'welcome': return '👋';
      case 'test': return '🧪';
      default: return '🔔';
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read).length;
  const readNotifications = notifications.filter(n => n.read).length;

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading notifications...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
          >
            <ChevronLeftIcon className="h-5 w-5 mr-1" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-600 mt-1">{globalUnread} unread</p> {/* UPDATED: Use globalUnread */}
        </div>
        <div className="flex items-center space-x-2">
          {/* REMOVED: Test button */}
          <button
            onClick={fetchNotifications}
            className="flex items-center text-blue-600 hover:text-blue-700"
          >
            <ArrowPathIcon className="h-5 w-5 mr-1" />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'all'
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All ({total})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'unread'
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Unread ({globalUnread}) {/* UPDATED: Use globalUnread */}
          </button>
          {/* NEW: Read filter tab */}
          <button
            onClick={() => setFilter('read')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'read'
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Read ({globalRead}) {/* UPDATED: Use globalRead */}
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">{selectedIds.size} selected</span>
            <div className="flex space-x-2">
              {/* NEW: Mark as Read button */}
              <button
                onClick={bulkMarkAsRead}
                className="flex items-center px-3 py-1 text-xs text-green-700 hover:text-green-900 font-medium bg-green-100 rounded border border-green-300"
              >
                <EyeIcon className="h-3 w-3 mr-1" />
                Read
              </button>
              {/* NEW: Mark as Unread button */}
              <button
                onClick={bulkMarkAsUnread}
                className="flex items-center px-3 py-1 text-xs text-red-700 hover:text-red-900 font-medium bg-red-100 rounded border border-red-300"
              >
                <EyeSlashIcon className="h-3 w-3 mr-1" />
                Unread
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={toggleSelectAll}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Select all on this page</span>
          </label>
        </div>
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4 text-4xl">🔔</div>
            <p className="text-gray-600 text-lg">No notifications yet</p>
            <p className="text-gray-500 text-sm">Stay tuned for updates on enrollments and grades.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notif) => (
              <div
                key={notif._id}
                className={`rounded-lg p-4 border border-gray-200 hover:shadow-md cursor-pointer transition-shadow ${
                  !notif.read ? 'bg-blue-50 border-blue-200' : 'bg-white'
                }`}
              >
                <div className="flex items-start space-x-3">
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
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{notif.title}</h3>
                      {!notif.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full ml-2"></div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                    <p className={`text-xs mt-2 ${notif.read ? 'text-gray-400' : 'text-gray-500'}`}>
                      {new Date(notif.createdAt).toLocaleString()} {notif.read && '(Read)'}
                    </p>
                  </div>
                  {/* NEW: Individual read/unread buttons */}
                  <div className="flex space-x-1 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notif._id);
                      }}
                      disabled={notif.read}
                      className="p-1 text-green-600 hover:text-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      className="p-1 text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
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