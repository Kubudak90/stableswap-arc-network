import React from 'react';

/**
 * LoadingSpinner Component
 * Displays a spinning loader with optional message
 */
const LoadingSpinner = ({ message = 'Loading...', size = 'medium', fullScreen = false }) => {
  const sizeClasses = {
    small: 'loading-spinner-small',
    medium: 'loading-spinner-medium',
    large: 'loading-spinner-large',
  };

  const content = (
    <div className={`loading-spinner-container ${fullScreen ? 'loading-fullscreen' : ''}`}>
      <div className={`loading-spinner ${sizeClasses[size]}`}>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );

  return content;
};

/**
 * LoadingSkeleton Component
 * Displays placeholder content while loading
 */
export const LoadingSkeleton = ({ width = '100%', height = '20px', className = '' }) => {
  return (
    <div
      className={`loading-skeleton ${className}`}
      style={{ width, height }}
    />
  );
};

/**
 * LoadingCard Component
 * Displays a loading state for card-like content
 */
export const LoadingCard = () => {
  return (
    <div className="loading-card">
      <LoadingSkeleton width="60%" height="24px" className="mb-3" />
      <LoadingSkeleton width="100%" height="40px" className="mb-2" />
      <LoadingSkeleton width="80%" height="16px" className="mb-2" />
      <LoadingSkeleton width="40%" height="36px" />
    </div>
  );
};

/**
 * LoadingButton Component
 * Button with loading state
 */
export const LoadingButton = ({
  isLoading,
  onClick,
  children,
  disabled = false,
  className = '',
  loadingText = 'Processing...'
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`loading-button ${isLoading ? 'is-loading' : ''} ${className}`}
    >
      {isLoading ? (
        <>
          <span className="button-spinner"></span>
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

/**
 * TransactionPending Component
 * Shows transaction pending state
 */
export const TransactionPending = ({ hash, message = 'Transaction pending...' }) => {
  return (
    <div className="transaction-pending">
      <div className="pending-icon">
        <div className="pending-spinner"></div>
      </div>
      <p className="pending-message">{message}</p>
      {hash && (
        <a
          href={`https://explorer.arc.dev/tx/${hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="pending-link"
        >
          View on Explorer
        </a>
      )}
    </div>
  );
};

export default LoadingSpinner;
