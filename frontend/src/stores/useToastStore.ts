import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export const DEFAULT_TOAST_DURATION = 5000
export const TOAST_EXIT_DURATION = 180
export const MAX_VISIBLE_TOASTS = 5

export interface ToastItem {
  id: string
  type: ToastType
  message: string
  duration?: number
  isDismissing?: boolean
}

interface ToastStore {
  toasts: ToastItem[]
  addToast: (toast: Omit<ToastItem, 'id' | 'isDismissing'>) => string
  dismissToast: (id: string) => void
  removeToast: (id: string) => void
  clearToasts: () => void
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
}

let toastSequence = 0
const autoDismissTimers = new Map<string, ReturnType<typeof setTimeout>>()
const removalTimers = new Map<string, ReturnType<typeof setTimeout>>()

const clearToastTimers = (id: string) => {
  const autoDismissTimer = autoDismissTimers.get(id)
  const removalTimer = removalTimers.get(id)
  if (autoDismissTimer) clearTimeout(autoDismissTimer)
  if (removalTimer) clearTimeout(removalTimer)
  autoDismissTimers.delete(id)
  removalTimers.delete(id)
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${Date.now()}-${++toastSequence}`
    const item: ToastItem = { ...toast, id, isDismissing: false }
    let removedToasts: ToastItem[] = []

    set((state) => {
      const nextToasts = [item, ...state.toasts]
      removedToasts = nextToasts.slice(MAX_VISIBLE_TOASTS)
      return { toasts: nextToasts.slice(0, MAX_VISIBLE_TOASTS) }
    })
    removedToasts.forEach((removedToast) => clearToastTimers(removedToast.id))

    const duration = toast.duration ?? DEFAULT_TOAST_DURATION
    if (duration > 0) {
      const visibleDuration = Math.max(duration - TOAST_EXIT_DURATION, 0)
      autoDismissTimers.set(id, setTimeout(() => get().dismissToast(id), visibleDuration))
    }

    return id
  },

  dismissToast: (id) => {
    if (!get().toasts.some((toast) => toast.id === id && !toast.isDismissing)) return

    const autoDismissTimer = autoDismissTimers.get(id)
    if (autoDismissTimer) clearTimeout(autoDismissTimer)
    autoDismissTimers.delete(id)
    set((state) => ({
      toasts: state.toasts.map((toast) =>
        toast.id === id ? { ...toast, isDismissing: true } : toast,
      ),
    }))
    removalTimers.set(id, setTimeout(() => get().removeToast(id), TOAST_EXIT_DURATION))
  },

  removeToast: (id) => {
    clearToastTimers(id)
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }))
  },

  clearToasts: () => {
    get().toasts.forEach((toast) => clearToastTimers(toast.id))
    set({ toasts: [] })
  },

  success: (message, duration) => {
    get().addToast({ type: 'success', message, duration })
  },
  error: (message, duration) => {
    get().addToast({ type: 'error', message, duration })
  },
  info: (message, duration) => {
    get().addToast({ type: 'info', message, duration })
  },
  warning: (message, duration) => {
    get().addToast({ type: 'warning', message, duration })
  },
}))
