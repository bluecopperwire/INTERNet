import type { ComponentType } from 'react'
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { useToastStore, type ToastItem, type ToastType } from '../../stores/useToastStore'
import styles from './ToastViewport.module.css'

const toastIcons: Record<ToastType, ComponentType<{ size?: number; 'aria-hidden'?: boolean }>> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const toastLabels: Record<ToastType, string> = {
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
  info: 'Information',
}

interface ToastCardProps {
  toast: ToastItem
  onDismiss: (id: string) => void
}

export function ToastCard({ toast, onDismiss }: ToastCardProps) {
  const Icon = toastIcons[toast.type]
  const isUrgent = toast.type === 'error' || toast.type === 'warning'

  return (
    <article
      className={`${styles.toast} ${styles[toast.type]} ${toast.isDismissing ? styles.dismissing : ''}`}
      role={isUrgent ? 'alert' : 'status'}
      aria-live={isUrgent ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <Icon size={21} aria-hidden={true} />
      <div className={styles.content}>
        <strong>{toastLabels[toast.type]}</strong>
        <p>{toast.message}</p>
      </div>
      <button
        type="button"
        className={styles.dismissButton}
        onClick={() => onDismiss(toast.id)}
        aria-label={`Dismiss ${toastLabels[toast.type].toLowerCase()} notification`}
      >
        <X size={17} aria-hidden={true} />
      </button>
    </article>
  )
}

export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts)
  const dismissToast = useToastStore((state) => state.dismissToast)

  if (toasts.length === 0) return null

  return (
    <section className={styles.viewport} aria-label="Notifications">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </section>
  )
}
