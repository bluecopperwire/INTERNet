import { API_BASE_URL } from '../services/api'

export function publicUploadUrl(
  storedPath?: string | null,
  version?: string | Date | null,
): string | undefined {
  if (!storedPath) return undefined
  if (/^(?:https?:|data:|blob:)/i.test(storedPath)) return storedPath

  const url = `${API_BASE_URL}/${storedPath.replace(/^\/+/, '')}`
  return version ? `${url}?v=${encodeURIComponent(String(version))}` : url
}
