// components/ui/LoadingSpinner.jsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

const LoadingSpinner = ({ 
  message = 'Loading...', 
  size = 'lg', // 'sm', 'lg', '2xl'
  color = 'blue', // 'blue', 'red', 'gray'
  fullScreen = false 
}) => {
  const sizeClasses = {
    sm: 'text-sm',
    lg: 'text-lg',
    '2xl': 'text-2xl'
  }[size] || 'text-lg';

  const colorClasses = {
    blue: 'text-blue-500',
    red: 'text-red-500',
    gray: 'text-gray-500'
  }[color] || 'text-blue-500';

  const containerClass = fullScreen 
    ? 'flex justify-center items-center h-screen bg-gray-50' 
    : 'flex justify-center items-center h-64';

  return (
    <div className={containerClass}>
      <FontAwesomeIcon 
        icon={faSpinner} 
        className={`${sizeClasses} ${colorClasses} animate-spin mr-2`} 
      />
      <span className="font-medium">{message}</span>
    </div>
  );
};

export default LoadingSpinner;