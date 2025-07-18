"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { Slot } from "@radix-ui/react-slot"
import {
  Controller,
  FormProvider,
  useFormContext,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  type FieldError,
  type FieldErrors,
} from "react-hook-form"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

// Re-export for convenience
export { useForm, useFieldArray, useWatch } from "react-hook-form"
export type { UseFormReturn, FieldErrors } from "react-hook-form"

const Form = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
)

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  )
}

/**
 * Custom hook to access form field state and utilities
 * Must be used within a FormField component
 */
const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext)
  const itemContext = React.useContext(FormItemContext)
  const { getFieldState, formState } = useFormContext()

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>")
  }

  const fieldState = getFieldState(fieldContext.name, formState)
  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

type FormItemContextValue = {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
)

interface FormItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Override the default spacing between form elements
   */
  spacing?: "none" | "sm" | "md" | "lg"
}

const FormItem = React.forwardRef<HTMLDivElement, FormItemProps>(
  ({ className, spacing = "md", ...props }, ref) => {
    const id = React.useId()

    const spacingClasses = {
      none: "",
      sm: "space-y-1",
      md: "space-y-2",
      lg: "space-y-3",
    }

    return (
      <FormItemContext.Provider value={{ id }}>
        <div 
          ref={ref} 
          className={cn(spacingClasses[spacing], className)} 
          {...props} 
        />
      </FormItemContext.Provider>
    )
  }
)
FormItem.displayName = "FormItem"

interface FormLabelProps extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  /**
   * Show required indicator
   */
  required?: boolean
  /**
   * Custom required indicator
   */
  requiredIndicator?: React.ReactNode
}

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  FormLabelProps
>(({ className, children, required, requiredIndicator = "*", ...props }, ref) => {
  const { error, formItemId } = useFormField()

  return (
    <Label
      ref={ref}
      className={cn(error && "text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-1 text-destructive" aria-label="required">
          {requiredIndicator}
        </span>
      )}
    </Label>
  )
})
FormLabel.displayName = "FormLabel"

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField()

  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={
        !error
          ? formDescriptionId
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      aria-required={props["aria-required"]}
      {...props}
    />
  )
})
FormControl.displayName = "FormControl"

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField()

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
})
FormDescription.displayName = "FormDescription"

interface FormMessageProps extends React.HTMLAttributes<HTMLParagraphElement> {
  /**
   * Override the error message from form validation
   */
  message?: string
  /**
   * Show error icon
   */
  showIcon?: boolean
}

const FormMessage = React.forwardRef<HTMLParagraphElement, FormMessageProps>(
  ({ className, children, message, showIcon = false, ...props }, ref) => {
    const { error, formMessageId } = useFormField()
    const body = message || (error ? String(error?.message ?? "") : children)

    if (!body) {
      return null
    }

    return (
      <p
        ref={ref}
        id={formMessageId}
        className={cn("text-sm font-medium text-destructive", className)}
        role="alert"
        aria-live="polite"
        {...props}
      >
        {showIcon && (
          <svg
            className="inline-block w-4 h-4 mr-1"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        )}
        {body}
      </p>
    )
  }
)
FormMessage.displayName = "FormMessage"

/**
 * Wrapper component for form sections
 */
interface FormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
}

const FormSection = React.forwardRef<HTMLDivElement, FormSectionProps>(
  ({ className, title, description, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("space-y-4", className)}
        {...props}
      >
        {(title || description) && (
          <div className="space-y-1">
            {title && (
              <h3 className="text-lg font-medium leading-none tracking-tight">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    )
  }
)
FormSection.displayName = "FormSection"

/**
 * Helper component for form field arrays
 */
interface FormFieldArrayProps {
  children: React.ReactNode
  className?: string
}

const FormFieldArray = React.forwardRef<HTMLDivElement, FormFieldArrayProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("space-y-2", className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
FormFieldArray.displayName = "FormFieldArray"

/**
 * Utility function to get error message from nested field errors
 */
export function getNestedError(
  errors: FieldErrors,
  name: string
): FieldError | undefined {
  const keys = name.split('.')
  let current: any = errors

  for (const key of keys) {
    if (current[key] === undefined) return undefined
    current = current[key]
  }

  return current as FieldError
}

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
  FormSection,
  FormFieldArray,
}