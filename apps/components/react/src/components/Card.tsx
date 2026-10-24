import type { ReactNode } from 'react'

import './components.css'

export interface CardProps {
  title?: string
  children?: ReactNode
}

export function Card({ title, children }: CardProps) {
  return (
    <div className="hqa-card">
      <div className="hqa-card__title">{title}</div>
      <div className="hqa-card__body">{children}</div>
    </div>
  )
}
