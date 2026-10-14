import { describe, expect, it, vi } from 'vitest'
import { openNativePicker } from '../../../utils/native-picker'

describe('schedule interview native picker control', () => {
  it('focuses and opens a supported date or time picker', () => {
    const input = { focus: vi.fn(), showPicker: vi.fn() } as unknown as HTMLInputElement
    openNativePicker(input)
    expect(input.focus).toHaveBeenCalledOnce()
    expect(input.showPicker).toHaveBeenCalledOnce()
  })

  it('keeps focus/manual entry as a safe fallback when showPicker is unavailable', () => {
    const input = { focus: vi.fn() } as unknown as HTMLInputElement
    expect(() => openNativePicker(input)).not.toThrow()
    expect(input.focus).toHaveBeenCalledOnce()
  })
})
