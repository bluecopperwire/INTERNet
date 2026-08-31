import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_TOAST_DURATION,
  MAX_VISIBLE_TOASTS,
  TOAST_EXIT_DURATION,
  useToastStore,
} from './useToastStore'

describe('useToastStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useToastStore.getState().clearToasts()
  })

  afterEach(() => {
    useToastStore.getState().clearToasts()
    vi.useRealTimers()
  })

  it('adds all supported notification types through the shared API', () => {
    const toast = useToastStore.getState()
    toast.success('Saved', 0)
    toast.error('Failed', 0)
    toast.warning('Check this', 0)
    toast.info('For your information', 0)

    expect(useToastStore.getState().toasts.map(({ type, message }) => ({ type, message }))).toEqual([
      { type: 'info', message: 'For your information' },
      { type: 'warning', message: 'Check this' },
      { type: 'error', message: 'Failed' },
      { type: 'success', message: 'Saved' },
    ])
  })

  it('auto-dismisses after the five-second default including the exit transition', () => {
    useToastStore.getState().success('Profile updated')

    vi.advanceTimersByTime(DEFAULT_TOAST_DURATION - TOAST_EXIT_DURATION - 1)
    expect(useToastStore.getState().toasts[0]?.isDismissing).toBe(false)

    vi.advanceTimersByTime(1)
    expect(useToastStore.getState().toasts[0]?.isDismissing).toBe(true)

    vi.advanceTimersByTime(TOAST_EXIT_DURATION)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('supports manual dismissal with the same exit transition', () => {
    const id = useToastStore.getState().addToast({ type: 'info', message: 'Dismiss me', duration: 0 })

    useToastStore.getState().dismissToast(id)
    expect(useToastStore.getState().toasts[0]?.isDismissing).toBe(true)

    vi.advanceTimersByTime(TOAST_EXIT_DURATION)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })

  it('shows the newest notifications first and caps the stack at five', () => {
    for (let index = 1; index <= MAX_VISIBLE_TOASTS + 1; index += 1) {
      useToastStore.getState().info(`Notification ${index}`, 0)
    }

    const messages = useToastStore.getState().toasts.map((toast) => toast.message)
    expect(messages).toEqual([
      'Notification 6',
      'Notification 5',
      'Notification 4',
      'Notification 3',
      'Notification 2',
    ])
  })

  it('keeps repeated messages as distinct notifications', () => {
    useToastStore.getState().error('Please try again.', 0)
    useToastStore.getState().error('Please try again.', 0)

    const toasts = useToastStore.getState().toasts
    expect(toasts).toHaveLength(2)
    expect(toasts[0]?.id).not.toBe(toasts[1]?.id)
  })
})
