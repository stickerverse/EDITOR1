"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, createdAt, persistent, onDismiss, ...props }) {
        // Note: We destructure createdAt, persistent, and onDismiss here but don't pass them to props
        // This prevents React warnings about unknown DOM properties
        return (
          <Toast 
            key={id} 
            variant={variant}
            createdAt={createdAt}
            persistent={persistent}
            onDismiss={onDismiss}
            {...props}
          >
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}