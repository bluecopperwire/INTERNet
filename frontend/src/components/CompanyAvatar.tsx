import React, { useState, useEffect } from 'react'
import styles from './CompanyAvatar.module.css'

export interface CompanyAvatarProps {
  name?: string | null
  src?: string | null
  alt?: string
  size?: number | string
  fontSize?: number | string
  className?: string
  style?: React.CSSProperties
  shape?: 'circle' | 'rounded'
}

export function getCompanyInitial(companyName?: string | null): string {
  if (!companyName) return 'C'
  const trimmed = companyName.trim()
  if (!trimmed) return 'C'
  const match = trimmed.match(/[a-zA-Z0-9]/)
  return (match ? match[0] : trimmed.charAt(0)).toUpperCase()
}

export const CompanyAvatar: React.FC<CompanyAvatarProps> = ({
  name,
  src,
  alt,
  size,
  fontSize,
  className,
  style,
  shape = 'circle',
}) => {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setHasError(false)
  }, [src])

  const initial = getCompanyInitial(name)
  const isImageAvailable = Boolean(src && !hasError)

  const computedFontSize =
    fontSize !== undefined
      ? typeof fontSize === 'number'
        ? `${fontSize}px`
        : fontSize
      : typeof size === 'number'
        ? `${Math.max(11, Math.round(size * 0.42))}px`
        : undefined

  const sizeStyle: React.CSSProperties = {
    ...(size !== undefined
      ? {
          width: typeof size === 'number' ? `${size}px` : size,
          height: typeof size === 'number' ? `${size}px` : size,
          minWidth: typeof size === 'number' ? `${size}px` : size,
          minHeight: typeof size === 'number' ? `${size}px` : size,
        }
      : {}),
    ...(computedFontSize !== undefined ? { fontSize: computedFontSize } : {}),
    ...style,
  }

  const containerClass = [
    styles.avatar,
    shape === 'rounded' ? styles.rounded : styles.circle,
    !isImageAvailable ? styles.placeholder : undefined,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (isImageAvailable) {
    return (
      <span className={containerClass} style={sizeStyle} aria-hidden="true">
        <img
          src={src!}
          alt={alt ?? (name ? `${name} logo` : 'Company logo')}
          className={styles.image}
          onError={() => setHasError(true)}
        />
      </span>
    )
  }

  return (
    <span
      className={containerClass}
      style={sizeStyle}
      aria-hidden="true"
      title={name ?? undefined}
    >
      <span className={styles.initial}>{initial}</span>
    </span>
  )
}

export default CompanyAvatar

