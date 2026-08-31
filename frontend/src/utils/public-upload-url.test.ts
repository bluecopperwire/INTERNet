import { describe, expect, it } from 'vitest'
import { API_BASE_URL } from '../services/api'
import { publicUploadUrl } from './public-upload-url'

describe('publicUploadUrl', () => {
  it('turns a stored upload path into a versioned public URL', () => {
    expect(
      publicUploadUrl(
        '/uploads/profile_pictures/42-demo-company-pfp.png',
        '2026-08-31T04:00:00.000Z',
      ),
    ).toBe(
      `${API_BASE_URL}/uploads/profile_pictures/42-demo-company-pfp.png?v=2026-08-31T04%3A00%3A00.000Z`,
    )
  })

  it('preserves an already public URL and handles missing pictures', () => {
    expect(publicUploadUrl('https://cdn.example.test/avatar.png')).toBe(
      'https://cdn.example.test/avatar.png',
    )
    expect(publicUploadUrl(null)).toBeUndefined()
  })
})
