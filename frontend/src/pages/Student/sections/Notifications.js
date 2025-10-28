// src/pages/Student/Notifications.js (Revamp UI to match dashboard styling and tidy data hooks)
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import NotificationService from '../../../services/notificationService'; // Adjust path as needed
import { useAuth } from '../../../context/authContext';
import { ArrowPathIcon, ChevronLeftIcon, ChevronRightIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

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
  const { user } = useAuth();
  const userId = user?.id || null;

  const fetchCounts = useCallback(async () => {
    try {
      if (!userId) return;
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
      if (!userId) {
        setNotifications([]);
        setTotal(0);
        setTotalPages(1);
        return;
      }
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

  const summaryCards = useMemo(() => ([
    {
      label: 'Total notifications',
      value: total,
      helper: 'Includes read and unread updates across your courses.',
      accent: '#f97316'
    },
    {
      label: 'Unread messages',
      value: globalUnread,
      helper: 'Items that still need your attention.',
      accent: '#22c55e'
    },
    {
      label: 'Completed reads',
      value: globalRead,
      helper: 'Keep tabs on what you have already reviewed.',
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

  return (
    <div className="space-y-6 px-6 py-6 min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#5f0f19] via-[#a31621] to-[#f25c74] text-white shadow-2xl">
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at top left, rgba(255,255,255,0.6), transparent 55%)" }}
          aria-hidden="true"
        />
        <div className="relative z-10 space-y-6 p-5 md:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-white/25"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Back
            </button>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold md:text-4xl text-white">All your updates in one place</h1>
              <p className="text-sm text-white max-w-2xl">
                Review announcements, grades, and class reminders without bouncing between tabs. Use the filters below to focus on what matters now.
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
                <p
                  className="mt-3 text-3xl font-semibold text-white"
                  style={{ textShadow: "0 8px 18px rgba(0,0,0,0.35)" }}
                >
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 md:p-6">
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
      <section className="rounded-3xl border border-gray-200 bg-white/95 p-5 shadow-xl ring-1 ring-black/5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Bulk actions</h2>
            <p className="text-sm text-gray-500">
              Select individual notifications to toggle their read status or use the bulk actions above.
            </p>
          </div>
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
      </section>
    )}

      {/* Notifications List */}
      <section className="rounded-3xl border border-gray-200 bg-white/95 p-5 shadow-xl ring-1 ring-black/5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-gray-900">Inbox overview</h2>
            <p className="text-sm text-gray-500">
              Filter notifications, mark them read or unread in bulk, and review the activity summary.
            </p>
          </div>
          <div className="flex items-center justify-between">
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
        </div>

        <div className="mt-6 space-y-4">
          {loading ? (
            <p className="text-center text-sm text-gray-500">Loading notifications…</p>
          ) : notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-gray-500">
              No notifications found.
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif._id}
                onClick={() => toggleSelect(notif._id)}
                className={`flex items-start justify-between rounded-2xl border border-gray-200 p-4 transition ${
                  selectedIds.has(notif._id) ? 'bg-blue-50 ring-2 ring-blue-200' : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <span>{getTypeIcon(notif.type)}</span>
                    <span>{notif.title}</span>
                    {!notif.read && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Unread</span>}
                  </div>
                  <p className="text-sm text-gray-600">{notif.message}</p>
                  <p className="text-xs text-gray-400">{formatDate(notif.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(notif._id)}
                    onChange={() => toggleSelect(notif._id)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex space-x-1">
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
            ))
          )}
        </div>

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
      </section>
    </div>
  );
};

export default Notifications;