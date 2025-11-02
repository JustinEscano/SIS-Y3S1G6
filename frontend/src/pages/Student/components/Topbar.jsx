// components/Topbar.jsx (Student Version - Revamped)
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from '../../../context/authContext';
import NotificationService from '../../../services/notificationService';
import profilePic from "../../../assets/images/logo.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faBell, faCircle } from "@fortawesome/free-solid-svg-icons";
import '../styles/Topbar.css';

function Topbar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);
  
  const userId = user?.id;
  const MAX_NOTIFICATIONS = 4;

  // Fetch notification data
  const fetchData = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const [notifications, count] = await Promise.all([
        NotificationService.getRecentNotifications(userId, MAX_NOTIFICATIONS),
        NotificationService.getUnreadCount(userId)
      ]);
      
      // Ensure we only show max 4 notifications
      const limitedNotifications = notifications.slice(0, MAX_NOTIFICATIONS);
      setRecentNotifications(limitedNotifications);
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch notification data:', error);
      setError('Failed to load notifications.');
      setRecentNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Handle bell click - single click shows dropdown, double click navigates
  const handleBellClick = (e) => {
    e.stopPropagation();
    
    // Check if it's a double click (within 300ms of previous click)
    const now = Date.now();
    if (lastClickTime.current && now - lastClickTime.current < 300) {
      // Double click - navigate to notifications page
      setShowNotifications(false);
      navigate('/student/notifications');
      lastClickTime.current = null;
      return;
    }
    
    // Single click - toggle dropdown
    lastClickTime.current = now;
    setShowNotifications(!showNotifications);
    
    // Fetch data if dropdown is being opened and we don't have data
    if (!showNotifications && recentNotifications.length === 0) {
      fetchData();
    }
  };

  const lastClickTime = useRef(null);

  // Handle notification item click - goes directly to notifications page
  const handleNotificationClick = () => {
    setShowNotifications(false);
    navigate('/student/notifications');
  };

  // Handle see more click
  const handleSeeMore = () => {
    setShowNotifications(false);
    navigate('/student/notifications');
  };

  // Refresh notifications
  const handleRefresh = () => {
    fetchData();
  };

  // Format date for display
  const formatDate = (value) => {
    try {
      const date = new Date(value);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
      
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      return value;
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
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

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  // Initial data fetch
  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [fetchData, userId]);

  return (
    <header className="teacher-topbar top-0 left-0 right-0 z-40 h-16 bg-[#81020b]/90 backdrop-blur-sm flex items-center justify-between px-6 shadow-md border-b border-gray-200 relative">
      <div className="topbar-left">
        <h1 className="topbar-title text-white font-semibold text-xl">Student Portal</h1>
      </div>

      <div className="topbar-right flex items-center space-x-6" ref={dropdownRef}>
        {/* Search Icon */}
        <FontAwesomeIcon
          icon={faSearch}
          className="icon text-white/80 hover:text-white cursor-pointer transition-colors"
          aria-label="Search"
        />
        
        {/* Notifications Bell */}
        <div className="relative">
          <div 
            className="relative cursor-pointer group"
            onClick={handleBellClick}
            title="Click once to view notifications, double-click to go to notifications page"
          >
            <FontAwesomeIcon
              icon={faBell}
              className="icon text-white/80 group-hover:text-white transition-colors text-lg"
              aria-label="Notifications"
            />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 inline-flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full border-2 border-[#81020b]">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          
          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                  <div className="flex items-center space-x-2">
                    {unreadCount > 0 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {unreadCount} unread
                      </span>
                    )}
                    <button
                      onClick={handleRefresh}
                      disabled={isLoading}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                    >
                      {isLoading ? 'Refreshing...' : 'Refresh'}
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Latest updates • Double-click bell for full history
                </p>
              </div>

              {/* Error State */}
              {error && (
                <div className="px-5 py-3 bg-red-50 border-b border-red-200">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Notifications List */}
              <div className="max-h-80 overflow-y-auto">
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : recentNotifications.length === 0 ? (
                  <div 
                    className="px-5 py-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={handleNotificationClick}
                  >
                    <div className="text-4xl text-gray-300 mb-2">🔔</div>
                    <p className="text-gray-600 font-medium">No notifications</p>
                    <p className="text-sm text-gray-500 mt-1">You're all caught up!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {recentNotifications.map((notif) => (
                      <div
                        key={notif._id}
                        className={`px-5 py-4 cursor-pointer transition-all duration-200 group hover:bg-blue-50 ${
                          !notif.read ? 'bg-blue-50/50' : 'bg-white'
                        }`}
                        onClick={handleNotificationClick}
                      >
                        <div className="flex items-start space-x-3">
                          {/* Notification Icon */}
                          <div className="flex-shrink-0 mt-0.5">
                            <span className="text-xl">
                              {getNotificationIcon(notif.type)}
                            </span>
                          </div>
                          
                          {/* Notification Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className={`font-medium text-sm leading-tight ${
                                  !notif.read ? 'text-gray-900' : 'text-gray-700'
                                }`}>
                                  {notif.title}
                                </p>
                                <p className="text-gray-600 text-sm mt-1 line-clamp-2 leading-relaxed">
                                  {notif.message}
                                </p>
                                <div className="flex items-center space-x-2 mt-2">
                                  <p className="text-xs text-gray-500">
                                    {formatDate(notif.createdAt)}
                                  </p>
                                  {!notif.read && (
                                    <FontAwesomeIcon 
                                      icon={faCircle} 
                                      className="text-blue-500 text-xs animate-pulse" 
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {recentNotifications.length > 0 && (
                <div 
                  className="px-5 py-3 border-t border-gray-100 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={handleSeeMore}
                >
                  <div className="text-center">
                    <p className="text-sm font-medium text-blue-600 hover:text-blue-700">
                      View all notifications →
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {recentNotifications.length} of {unreadCount + (recentNotifications.length - unreadCount)} shown
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile Picture */}
        <img
          src={profilePic}
          alt="Profile"
          className="topbar-profile cursor-pointer hover:ring-2 hover:ring-white/50 transition-all"
          onClick={() => navigate("/student/profile")}
        />
      </div>
    </header>
  );
}

export default Topbar;