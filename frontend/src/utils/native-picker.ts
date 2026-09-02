export function openNativePicker(input: HTMLInputElement | null) {
  if (!input) return
  input.focus()
  try {
    input.showPicker?.()
  } catch {
    // Browsers without showPicker still retain native focus/manual input behavior.
  }
}
