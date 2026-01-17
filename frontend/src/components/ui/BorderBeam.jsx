import React from 'react'

export const BorderBeam = ({
  duration = 8,
  size = 100,
  colorFrom = '#ffaa40',
  colorTo = '#9c40ff',
  className = ''
}) => {
  return (
    <div
      className={`border-beam ${className}`}
      style={{
        '--duration': `${duration}s`,
        '--size': `${size}px`,
        '--color-from': colorFrom,
        '--color-to': colorTo,
      }}
    />
  )
}

export default BorderBeam
