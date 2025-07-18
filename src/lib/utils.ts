import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines clsx and tailwind-merge for optimal className handling
 * @param inputs - Class values to merge
 * @returns Merged className string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as currency with proper localization
 * @param amount - The amount to format
 * @param currency - Currency code (default: USD)
 * @param locale - Locale string (default: en-US)
 */
export function formatCurrency(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Formats a date relative to now (e.g., "2 hours ago", "in 3 days")
 * @param date - Date to format
 * @param locale - Locale string (default: en-US)
 */
export function formatRelativeTime(
  date: Date | string | number,
  locale: string = "en-US"
): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  const dateObj = new Date(date)
  const now = new Date()
  const diffInSeconds = Math.floor((dateObj.getTime() - now.getTime()) / 1000)
  
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2628000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
    ["second", 1],
  ]
  
  for (const [unit, seconds] of units) {
    const interval = Math.floor(Math.abs(diffInSeconds) / seconds)
    if (interval >= 1) {
      return rtf.format(diffInSeconds < 0 ? -interval : interval, unit)
    }
  }
  
  return "just now"
}

/**
 * Debounces a function call
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  
  return function debounced(...args: Parameters<T>) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

/**
 * Throttles a function call
 * @param func - Function to throttle
 * @param limit - Time limit in milliseconds
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  let lastResult: ReturnType<T>
  
  return function throttled(...args: Parameters<T>): void {
    if (!inThrottle) {
      inThrottle = true
      lastResult = func(...args)
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Generates a unique ID with optional prefix
 * @param prefix - Optional prefix for the ID
 */
export function generateId(prefix: string = ""): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 9)
  return prefix ? `${prefix}_${timestamp}${randomPart}` : `${timestamp}${randomPart}`
}

/**
 * Safely parses JSON with fallback
 * @param json - JSON string to parse
 * @param fallback - Fallback value if parsing fails
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json)
  } catch {
    return fallback
  }
}

/**
 * Deep clones an object
 * @param obj - Object to clone
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as T
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as T
  if (obj instanceof Object) {
    const clonedObj = {} as T
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }
  return obj
}

/**
 * Converts bytes to human-readable format
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes"
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
}

/**
 * Validates email format
 * @param email - Email string to validate
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Truncates text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @param suffix - Suffix to add (default: "...")
 */
export function truncateText(
  text: string,
  maxLength: number,
  suffix: string = "..."
): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - suffix.length) + suffix
}

/**
 * Converts pixels to inches
 * @param pixels - Pixel value
 * @param dpi - Dots per inch (default: 96)
 */
export function pixelsToInches(pixels: number, dpi: number = 96): number {
  return pixels / dpi
}

/**
 * Converts inches to pixels
 * @param inches - Inch value
 * @param dpi - Dots per inch (default: 96)
 */
export function inchesToPixels(inches: number, dpi: number = 96): number {
  return inches * dpi
}

/**
 * Gets contrast color (black or white) based on background
 * @param hexColor - Hex color string
 */
export function getContrastColor(hexColor: string): "black" | "white" {
  // Convert hex to RGB
  const hex = hexColor.replace("#", "")
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  return luminance > 0.5 ? "black" : "white"
}

/**
 * Async sleep function
 * @param ms - Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retries an async function with exponential backoff
 * @param fn - Async function to retry
 * @param maxRetries - Maximum number of retries
 * @param baseDelay - Base delay in milliseconds
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i)
        await sleep(delay)
      }
    }
  }
  
  throw lastError!
}

/**
 * Groups array items by a key
 * @param array - Array to group
 * @param key - Key to group by
 */
export function groupBy<T, K extends keyof T>(
  array: T[],
  key: K
): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key])
    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(item)
    return groups
  }, {} as Record<string, T[]>)
}

/**
 * Removes duplicate items from array
 * @param array - Array with potential duplicates
 * @param key - Optional key for object comparison
 */
export function removeDuplicates<T>(
  array: T[],
  key?: keyof T
): T[] {
  if (!key) {
    return [...new Set(array)]
  }
  
  const seen = new Set<any>()
  return array.filter(item => {
    const value = item[key]
    if (seen.has(value)) {
      return false
    }
    seen.add(value)
    return true
  })
}

/**
 * Validates image dimensions
 * @param file - Image file
 * @param maxWidth - Maximum width in pixels
 * @param maxHeight - Maximum height in pixels
 */
export async function validateImageDimensions(
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<{ valid: boolean; width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const valid = img.width <= maxWidth && img.height <= maxHeight
      resolve({ valid, width: img.width, height: img.height })
    }
    img.onerror = () => {
      resolve({ valid: false, width: 0, height: 0 })
    }
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Converts file to base64 data URL
 * @param file - File to convert
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Downloads data as file
 * @param data - Data to download
 * @param filename - Name of the file
 * @param mimeType - MIME type of the file
 */
export function downloadFile(
  data: BlobPart,
  filename: string,
  mimeType: string = "application/octet-stream"
): void {
  const blob = new Blob([data], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Checks if code is running in browser
 */
export function isBrowser(): boolean {
  return typeof window !== "undefined"
}

/**
 * Gets query parameter value
 * @param name - Parameter name
 * @param url - Optional URL string (defaults to current URL)
 */
export function getQueryParam(name: string, url?: string): string | null {
  if (!isBrowser() && !url) return null
  const searchParams = new URLSearchParams(url || window.location.search)
  return searchParams.get(name)
}

/**
 * Copies text to clipboard with better error handling
 * @param text - Text to copy
 * @returns Promise<boolean> - Success status
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!isBrowser()) return false
  
  try {
    // Check if we're in a secure context and clipboard API is available
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text)
        return true
      } catch (clipboardError) {
        // If clipboard API fails due to permissions, try the fallback
        console.warn('Clipboard API failed, trying fallback method:', clipboardError)
      }
    }
    
    // Fallback method for older browsers or permission issues
    const textArea = document.createElement("textarea")
    textArea.value = text
    textArea.style.position = "fixed"
    textArea.style.left = "-999999px"
    textArea.style.top = "-999999px"
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    try {
      const successful = document.execCommand("copy")
      document.body.removeChild(textArea)
      return successful
    } catch (error) {
      document.body.removeChild(textArea)
      return false
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}

/**
 * Type guard to check if value is not null or undefined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

/**
 * Omits specified keys from an object
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj }
  keys.forEach(key => delete result[key])
  return result
}

/**
 * Picks specified keys from an object
 */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key]
    }
  })
  return result
}