import type { ReactNode, MouseEvent } from 'react'

import './components.css'

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void
  children?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  children
}: ButtonProps) {
  return (
    <button className={`hqa-btn ${variant} ${size}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  )
}
