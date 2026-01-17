import React, { useState } from 'react'

export const InteractiveHoverButton = ({
  children,
  onClick,
  disabled,
  className = '',
  style = {}
}) => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`interactive-hover-button ${className}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px 20px',
        fontSize: '0.875rem',
        fontWeight: 600,
        color: isHovered ? 'var(--background)' : 'var(--text-primary)',
        background: 'transparent',
        border: '1px solid var(--border)',
        borderRadius: '9999px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        overflow: 'hidden',
        transition: 'color 0.3s ease',
        opacity: disabled ? 0.5 : 1,
        ...style
      }}
    >
      {/* Background slide effect */}
      <span
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--text-primary)',
          transform: isHovered ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
          zIndex: 0
        }}
      />

      {/* Content */}
      <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
        {children}
      </span>

      {/* Arrow icon that appears on hover */}
      <span
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          marginLeft: isHovered ? '8px' : '0',
          width: isHovered ? '16px' : '0',
          opacity: isHovered ? 1 : 0,
          overflow: 'hidden',
          transition: 'all 0.3s ease'
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </span>
    </button>
  )
}

export default InteractiveHoverButton
