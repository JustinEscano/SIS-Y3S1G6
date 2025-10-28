// src/pages/Teacher/Notifications.js (Teacher Version: Full notifications page with filters, bulk actions, and read/unread)
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import NotificationService from '../../../services/notificationService'; // Adjust path as needed
import { ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'unread', or 'read'
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [globalUnread, setGlobalUnread] = useState(0); // Global unread count
  const [globalRead, setGlobalRead] = useState(0); // Global read count
  const [selectAll, setSelectAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const limit = 10;
  // TODO: Replace with dynamic teacher._id from auth context in production
  const userId = '68efb429f004d451b418c8c1'; // Sample Teacher ID from DB

  const fetchCounts = useCallback(async () => {
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

  const fetchNotifications = useCallback(async () => {
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
  }, [currentPage, filter, limit, userId]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

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
      fetchCounts(); // Update global counts
    } catch (error) {
      console.error('Failed to mark as read:', error);
      setError('Failed to mark as read.');
    }
  };

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
      fetchCounts(); // Update global counts
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
      fetchCounts(); // Update global counts
    } catch (error) {
      console.error('Failed to bulk mark as read:', error);
      setError('Failed to bulk mark as read.');
    }
  };

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
      fetchCounts(); // Update global counts
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

  const summaryCards = useMemo(() => ([
    {
      label: 'All notifications',
      value: total,
      helper: 'Announcements, grading updates, and class reminders.',
      accent: '#f97316'
    },
    {
      label: 'Unread items',
      value: globalUnread,
      helper: 'Messages that still need attention.',
      accent: '#22c55e'
    },
    {
      label: 'Reviewed updates',
      value: globalRead,
      helper: 'History of changes you already checked.',
      accent: '#3b82f6'
    }
  ]), [globalRead, globalUnread, total]);

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

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading notifications...</div>;
  }

  return (
    <div className="space-y-8 px-4 pb-16 pt-10 sm:px-8 min-h-screen bg-gray-50">
      {/* Hero */}
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
                <h1 className="text-3xl font-bold md:text-4xl text-white">Keep ahead of class updates</h1>
                <p className="text-sm text-white">
                  Survey grading changes, assignments, and roster activity at a glance. Apply filters or bulk actions to manage alerts quickly.
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
            {summaryCards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl bg-white/18 p-5 backdrop-blur-md shadow-xl shadow-black/10 ring-1 ring-white/25"
              >
                <p className="text-xs uppercase tracking-wider text-white">{card.label}</p>
                <p className="mt-3 text-3xl font-semibold text-white" style={{ textShadow: '0 8px 18px rgba(0,0,0,0.35)' }}>{card.value}</p>
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
            Unread ({globalUnread})
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === 'read'
                ? 'bg-blue-100 text-blue-700 border border-blue-300'
                : 'text-gray-600 hover:text-gray-900'
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
            <span className="text-sm text-blue-800">{selectedIds.size} selected</span>
            <div className="flex space-x-2">
              <button
                onClick={bulkMarkAsRead}
                className="flex items-center px-3 py-1 text-xs text-green-700 hover:text-green-900 font-medium bg-green-100 rounded border border-green-300"
              >
                <EyeIcon className="h-3 w-3 mr-1" />
                Read
              </button>
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
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
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
                className={`rounded-xl p-4 border border-gray-200 hover:shadow-lg cursor-pointer transition-all ${
                  !notif.read ? 'bg-blue-50/80 border-blue-200' : 'bg-white'
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
                      {formatDate(notif.createdAt)} {notif.read && '(Read)'}
                    </p>
                  </div>
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