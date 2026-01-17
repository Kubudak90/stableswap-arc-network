import React from 'react'

export const RainbowButton = ({ children, onClick, disabled, className = '', style = {} }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rainbow-button ${className}`}
      style={style}
    >
      {children}
    </button>
  )
}

export default RainbowButton
