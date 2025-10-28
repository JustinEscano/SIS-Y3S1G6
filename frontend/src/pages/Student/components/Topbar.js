// components/Topbar.jsx (Updated: Added individual read/unread buttons in dropdown; simplified toggle on click)
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import NotificationService from '../../../services/notificationService'; // Adjust path as needed
import profilePic from "../../../assets/images/logo.png";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faBell } from "@fortawesome/free-solid-svg-icons";
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import '../styles/Topbar.css'; // Import hybrid CSS

function Topbar() {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState(null); // NEW: Error state
  const dropdownRef = useRef(null);
  // FIXED: Updated to actual Student ID with notifications (from DB: "68e9b754beb6f72e4ab8ee15")
  // TODO: Replace with dynamic user._id from auth context in production
  const userId = '68e9b754beb6f72e4ab8ee15';

  useEffect(() => {
    fetchData();
  }, []);

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

  const fetchData = async () => {
    setError(null);
    try {
      const [notifications, count] = await Promise.all([
        NotificationService.getRecentNotifications(userId),
        NotificationService.getUnreadCount(userId)
      ]);
      setRecentNotifications(notifications);
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch notification data:', error);
      setError('Failed to load notifications. Check if user ID is valid.');
      setRecentNotifications([]); // Clear on error
      setUnreadCount(0);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      // First, check if it was unread
      const notification = recentNotifications.find(n => n._id === notificationId);
      const wasUnread = !notification?.read;

      await NotificationService.markAsRead(userId, notificationId);

      // Update local state
      setRecentNotifications(prev => 
        prev.map(n => 
          n._id === notificationId 
            ? { ...n, read: true } 
            : n
        )
      );

      // Decrement if it was unread
      if (wasUnread) {
        setUnreadCount(prev => prev - 1);
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
      setError('Failed to mark as read.');
    }
  };

  // NEW: Mark as unread for recent notifications
  const markAsUnread = async (notificationId) => {
    try {
      await NotificationService.markAsUnread(userId, notificationId);

      // Update local state
      setRecentNotifications(prev => 
        prev.map(n => 
          n._id === notificationId 
            ? { ...n, read: false } 
            : n
        )
      );

      // Increment unread count
      setUnreadCount(prev => prev + 1);
    } catch (error) {
      console.error('Failed to mark as unread:', error);
      setError('Failed to mark as unread.');
    }
  };

  const handleBellClick = (e) => {
    e.stopPropagation();
    setShowNotifications(!showNotifications);
    if (recentNotifications.length === 0 && unreadCount === 0) {
      fetchData(); // Refetch if empty
    }
  };

  const handleSeeMore = () => {
    setShowNotifications(false);
    navigate('/student/notifications');
  };

  // NEW: Refresh button in dropdown if error
  const handleRefresh = () => {
    fetchData();
  };

  return (
    <header className="teacher-topbar top-0 left-0 right-0 z-40 h-16 bg-[#81020b]/90 backdrop-blur-sm flex items-center justify-between px-6 shadow-md border-b border-gray-200 relative">
      <div className="topbar-left">
        <h1 className="topbar-title">Student Portal</h1>
      </div>

      <div className="topbar-right relative" ref={dropdownRef}>
        <div className="relative right-3 top-1">
          <FontAwesomeIcon
            icon={faBell}
            className="icon cursor-pointer"
            aria-label="Notifications"
            onClick={handleBellClick}
          />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
              {unreadCount}
            </span>
          )}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
              {/* Error in Dropdown */}
              {error && (
                <div className="px-4 py-2 bg-red-50 border-b border-red-200">
                  <p className="text-xs text-red-800">{error}</p>
                  <button
                    onClick={handleRefresh}
                    className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                  >
                    Retry
                  </button>
                </div>
              )}
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                <h3 className="text-sm font-semibold text-gray-900">Recent Notifications ({unreadCount} unread)</h3>
              </div>
              <div className="py-2">
                {recentNotifications.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-500 text-center">No recent notifications</p>
                ) : (
                  recentNotifications.map((notif) => (
                    <div
                      key={notif._id}
                      className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                        !notif.read ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">{notif.title}</p>
                          <p className="text-gray-600 text-sm mt-1">{notif.message}</p>
                          <p className={`text-xs mt-1 ${notif.read ? 'text-gray-400' : 'text-gray-500'}`}>
                            {new Date(notif.createdAt).toLocaleDateString()} {notif.read && '(Read)'}
                          </p>
                        </div>
                        {/* NEW: Individual read/unread buttons in dropdown */}
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
                            <EyeIcon className="h-3 w-3" />
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
                            <EyeSlashIcon className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-3 border-t border-gray-100">
                <button
                  onClick={handleSeeMore}
                  className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium text-center"
                >
                  See more
                </button>
              </div>
            </div>
          )}
        </div>
        <img
          src={profilePic}
          alt="Profile"
          className="topbar-profile cursor-pointer"
          onClick={() => navigate("/student/profile")}
        />
      </div>
    </header>
  );
}

export default Topbar;