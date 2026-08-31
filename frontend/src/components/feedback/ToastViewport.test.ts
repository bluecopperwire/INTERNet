import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ToastCard } from './ToastViewport'
import type { ToastType } from '../../stores/useToastStore'

describe('ToastCard', () => {
  it.each([
    ['success', 'Success', 'status', 'polite'],
    ['error', 'Error', 'alert', 'assertive'],
    ['warning', 'Warning', 'alert', 'assertive'],
    ['info', 'Information', 'status', 'polite'],
  ] as const)('renders an accessible %s notification', (type, label, role, liveMode) => {
    const message = `${label} notification content`
    const markup = renderToStaticMarkup(createElement(ToastCard, {
      toast: { id: `${type}-toast`, type: type as ToastType, message },
      onDismiss: () => undefined,
    }))

    expect(markup).toContain(`role="${role}"`)
    expect(markup).toContain(`aria-live="${liveMode}"`)
    expect(markup).toContain(label)
    expect(markup).toContain(message)
    expect(markup).toContain(`aria-label="Dismiss ${label.toLowerCase()} notification"`)
  })
})
