/**
 * Shadow DOM 内部样式。类名与 Vue / React 版保持一致；
 * 颜色全部走 var(--hqa-*)——自定义属性穿透 shadow 边界，由页面主题提供。
 */

export const HOST_RESET = `
  :host {
    display: inline-block;
    font-family: inherit;
  }
`

export const BUTTON_STYLE = `
  ${HOST_RESET}
  .hqa-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
    border-radius: var(--hqa-radius-sm);
    font: inherit;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition:
      background-color var(--hqa-transition),
      border-color var(--hqa-transition),
      color var(--hqa-transition),
      opacity var(--hqa-transition);
  }
  .hqa-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .hqa-btn.sm { padding: 4px 12px; font-size: 13px; }
  .hqa-btn.md { padding: 7px 18px; font-size: 14px; }
  .hqa-btn.lg { padding: 10px 24px; font-size: 16px; }
  .hqa-btn.primary {
    background: hsl(var(--hqa-primary));
    color: hsl(var(--hqa-on-primary));
  }
  .hqa-btn.primary:hover:not(:disabled) {
    background: hsl(var(--hqa-primary-hover));
  }
  .hqa-btn.secondary {
    background: hsl(var(--hqa-surface));
    color: hsl(var(--hqa-text));
    border-color: hsl(var(--hqa-border-strong));
  }
  .hqa-btn.secondary:hover:not(:disabled) {
    border-color: hsl(var(--hqa-primary));
    color: hsl(var(--hqa-primary));
  }
  .hqa-btn.ghost {
    background: transparent;
    color: hsl(var(--hqa-primary));
  }
  .hqa-btn.ghost:hover:not(:disabled) {
    background: hsl(var(--hqa-primary) / 0.1);
  }
`

export const CARD_STYLE = `
  ${HOST_RESET}
  .hqa-card {
    background: hsl(var(--hqa-bg));
    border: 1px solid hsl(var(--hqa-border));
    border-radius: var(--hqa-radius-md);
    padding: 20px;
    max-width: 360px;
  }
  .hqa-card__title {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 8px;
    color: hsl(var(--hqa-text));
  }
  .hqa-card__body {
    font-size: 14px;
    line-height: 1.7;
    color: hsl(var(--hqa-text-muted));
  }
`

export const SWITCH_STYLE = `
  ${HOST_RESET.replace('display: inline-block;', 'display: inline-flex; align-items: center;')}
  .hqa-switch {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    font-size: 14px;
    color: hsl(var(--hqa-text));
    cursor: pointer;
  }
  .hqa-switch[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .hqa-switch__track {
    position: relative;
    flex: none;
    width: 40px;
    height: 22px;
    border-radius: 999px;
    background: hsl(var(--hqa-border-strong));
    transition: background-color var(--hqa-transition);
  }
  .hqa-switch__thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: hsl(var(--hqa-bg));
    box-shadow: 0 1px 2px hsl(220 16% 14% / 0.3);
    transition: transform var(--hqa-transition);
  }
  .hqa-switch.is-checked .hqa-switch__track {
    background: hsl(var(--hqa-primary));
  }
  .hqa-switch.is-checked .hqa-switch__thumb {
    transform: translateX(18px);
  }
`
