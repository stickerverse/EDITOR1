"use client"

// Enhanced toast system with better type safety and production features
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

// Configuration constants
const TOAST_LIMIT = 5 // Increased from 1 to allow multiple toasts
const TOAST_REMOVE_DELAY = 5000 // Reduced from 1000000ms to 5 seconds
const TOAST_DURATION_DEFAULT = 4000 // Default duration for auto-dismiss

// Toast variants for different use cases
export type ToastVariant = "default" | "destructive" | "success" | "warning" | "info"

// Enhanced ToasterToast type with additional properties
export type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  duration?: number
  variant?: ToastVariant
  createdAt?: Date
  persistent?: boolean
  onDismiss?: () => void
}

// Action types as const for type safety
const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
  CLEAR_ALL: "CLEAR_ALL",
} as const

// ID generation with better uniqueness
let count = 0
const sessionId = Math.random().toString(36).substring(2, 9)

function genId(): string {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return `${sessionId}-${count}-${Date.now()}`
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast> & { id: string }
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["CLEAR_ALL"]
    }

interface State {
  toasts: ToasterToast[]
  pausedAt?: number | null
}

// Improved timeout management with pause/resume capability
class ToastTimerManager {
  private timers = new Map<string, {
    timeout: ReturnType<typeof setTimeout>
    remaining: number
    createdAt: number
  }>()
  
  add(toastId: string, duration: number, callback: () => void) {
    this.clear(toastId)
    
    const timeout = setTimeout(callback, duration)
    this.timers.set(toastId, {
      timeout,
      remaining: duration,
      createdAt: Date.now()
    })
  }
  
  clear(toastId: string) {
    const timer = this.timers.get(toastId)
    if (timer) {
      clearTimeout(timer.timeout)
      this.timers.delete(toastId)
    }
  }
  
  pause(toastId: string) {
    const timer = this.timers.get(toastId)
    if (timer) {
      clearTimeout(timer.timeout)
      const elapsed = Date.now() - timer.createdAt
      timer.remaining = Math.max(0, timer.remaining - elapsed)
    }
  }
  
  resume(toastId: string, callback: () => void) {
    const timer = this.timers.get(toastId)
    if (timer && timer.remaining > 0) {
      const timeout = setTimeout(callback, timer.remaining)
      timer.timeout = timeout
      timer.createdAt = Date.now()
    }
  }
  
  clearAll() {
    this.timers.forEach(({ timeout }) => clearTimeout(timeout))
    this.timers.clear()
  }
}

const toastTimers = new ToastTimerManager()

// Add toast to removal queue with duration support
const addToRemoveQueue = (toastId: string, duration: number = TOAST_REMOVE_DELAY) => {
  toastTimers.add(toastId, duration, () => {
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  })
}

// Enhanced reducer with additional actions
export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST": {
      const newToast = {
        ...action.toast,
        createdAt: action.toast.createdAt || new Date()
      }
      
      // Remove oldest toast if limit exceeded
      let toasts = [newToast, ...state.toasts]
      if (toasts.length > TOAST_LIMIT) {
        const removedToasts = toasts.slice(TOAST_LIMIT)
        removedToasts.forEach(toast => {
          toastTimers.clear(toast.id)
          if (toast.onDismiss) {
            toast.onDismiss()
          }
        })
        toasts = toasts.slice(0, TOAST_LIMIT)
      }
      
      return {
        ...state,
        toasts,
      }
    }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      if (toastId) {
        const toast = state.toasts.find(t => t.id === toastId)
        if (toast && !toast.persistent) {
          addToRemoveQueue(toastId, TOAST_REMOVE_DELAY)
          if (toast.onDismiss) {
            toast.onDismiss()
          }
        }
      } else {
        // Dismiss all non-persistent toasts
        state.toasts.forEach((toast) => {
          if (!toast.persistent) {
            addToRemoveQueue(toast.id, TOAST_REMOVE_DELAY)
            if (toast.onDismiss) {
              toast.onDismiss()
            }
          }
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || (toastId === undefined && !t.persistent)
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: state.toasts.filter(t => t.persistent),
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
      
    case "CLEAR_ALL":
      toastTimers.clearAll()
      state.toasts.forEach(toast => {
        if (toast.onDismiss) {
          toast.onDismiss()
        }
      })
      return {
        ...state,
        toasts: [],
      }
      
    default:
      return state
  }
}

// State listeners with improved type safety
const listeners = new Set<(state: State) => void>()

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

// Toast input type
type Toast = Omit<ToasterToast, "id" | "createdAt">

// Enhanced toast function with promise support
function toast(props: Toast & { promise?: Promise<any> }) {
  const id = genId()
  
  // Handle promise-based toasts
  if (props.promise) {
    const { promise, ...toastProps } = props
    
    // Show loading toast
    dispatch({
      type: "ADD_TOAST",
      toast: {
        ...toastProps,
        id,
        title: toastProps.title || "Loading...",
        description: toastProps.description || "Please wait...",
        variant: "default",
        persistent: true,
        open: true,
      },
    })
    
    // Handle promise resolution/rejection
    promise
      .then((data) => {
        dispatch({
          type: "UPDATE_TOAST",
          toast: {
            id,
            title: "Success!",
            description: toastProps.description || "Operation completed successfully",
            variant: "success",
            persistent: false,
          },
        })
        
        // Auto-dismiss success toast
        if (!toastProps.persistent) {
          const duration = toastProps.duration || TOAST_DURATION_DEFAULT
          addToRemoveQueue(id, duration)
        }
      })
      .catch((error) => {
        dispatch({
          type: "UPDATE_TOAST",
          toast: {
            id,
            title: "Error",
            description: error?.message || "Something went wrong",
            variant: "destructive",
            persistent: false,
          },
        })
        
        // Auto-dismiss error toast with longer duration
        if (!toastProps.persistent) {
          const duration = (toastProps.duration || TOAST_DURATION_DEFAULT) * 1.5
          addToRemoveQueue(id, duration)
        }
      })
    
    return { id }
  }

  const update = (props: Partial<ToasterToast>) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
    
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })
  
  // Auto-dismiss non-persistent toasts
  if (!props.persistent) {
    const duration = props.duration || TOAST_DURATION_DEFAULT
    addToRemoveQueue(id, duration)
  }

  return {
    id,
    dismiss,
    update,
  }
}

// Helper functions for common toast types
toast.success = (message: string, options?: Partial<Toast>) => 
  toast({
    title: "Success",
    description: message,
    variant: "success",
    ...options,
  })

toast.error = (message: string, options?: Partial<Toast>) => 
  toast({
    title: "Error",
    description: message,
    variant: "destructive",
    ...options,
  })

toast.warning = (message: string, options?: Partial<Toast>) => 
  toast({
    title: "Warning",
    description: message,
    variant: "warning",
    ...options,
  })

toast.info = (message: string, options?: Partial<Toast>) => 
  toast({
    title: "Info",
    description: message,
    variant: "info",
    ...options,
  })

toast.loading = (message: string, options?: Partial<Toast>) => 
  toast({
    title: "Loading",
    description: message,
    variant: "default",
    persistent: true,
    ...options,
  })

// Enhanced useToast hook with additional features
function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.add(setState)
    return () => {
      listeners.delete(setState)
    }
  }, [])

  return {
    toasts: state.toasts,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
    clearAll: () => dispatch({ type: "CLEAR_ALL" }),
    update: (toastId: string, props: Partial<ToasterToast>) => 
      dispatch({ type: "UPDATE_TOAST", toast: { ...props, id: toastId } }),
    // Helper to check if any toasts are active
    hasActiveToasts: state.toasts.length > 0,
    // Helper to get toasts by variant
    getToastsByVariant: (variant: ToastVariant) => 
      state.toasts.filter(t => t.variant === variant),
  }
}

// Export everything needed
export { useToast, toast, toastTimers }
export type { Toast }