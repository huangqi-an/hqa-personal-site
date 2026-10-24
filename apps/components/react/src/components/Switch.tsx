import { useState, type MouseEvent } from 'react'

import './components.css'

export interface SwitchProps {
  /** 受控值：传入即受控模式，不传则组件自管状态 */
  checked?: boolean
  /** 非受控初始值 */
  defaultChecked?: boolean
  disabled?: boolean
  label?: string
  onChange?: (checked: boolean, event: MouseEvent<HTMLButtonElement>) => void
}

export function Switch({
  checked,
  defaultChecked = false,
  disabled = false,
  label,
  onChange
}: SwitchProps) {
  const [inner, setInner] = useState(defaultChecked)
  const controlled = checked !== undefined
  const on = controlled ? checked : inner

  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    if (disabled) return
    if (!controlled) setInner(!on)
    onChange?.(!on, event)
  }

  return (
    <button
      type="button"
      className={`hqa-switch${on ? ' is-checked' : ''}`}
      role="switch"
      aria-checked={on}
      aria-label={label || 'switch'}
      disabled={disabled}
      onClick={toggle}
    >
      <span className="hqa-switch__track">
        <span className="hqa-switch__thumb" />
      </span>
      {label && <span className="hqa-switch__label">{label}</span>}
    </button>
  )
}
