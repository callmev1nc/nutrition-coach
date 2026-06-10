/**
 * Safe localStorage wrapper for Safari Private Browsing compatibility.
 * Safari <14 throws QuotaExceededError on setItem in private mode.
 */
export const safeStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value)
    } catch {
      // Silently fail in Safari Private Browsing or when storage is full
    }
  },

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch {
      // Silently fail
    }
  },
}
