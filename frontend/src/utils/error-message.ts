type ErrorLike = {
  message?: unknown
  response?: {
    data?: {
      message?: unknown
    }
  }
}

const normalizeMessage = (message: unknown) => {
  if (Array.isArray(message)) return message.filter((item): item is string => typeof item === 'string').join(', ')
  return typeof message === 'string' ? message : ''
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== 'object') return fallback
  const errorLike = error as ErrorLike
  return normalizeMessage(errorLike.response?.data?.message) || normalizeMessage(errorLike.message) || fallback
}
