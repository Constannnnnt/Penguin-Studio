import { toast as sonnerToast } from "sonner"

export interface ToastOptions {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

export const useToast = () => {
  const toast = ({ title, description, variant = "default" }: ToastOptions) => {
    const message = title || description || ""
    const descriptionText = title && description ? description : undefined

    if (variant === "destructive") {
      sonnerToast.error(message, {
        description: descriptionText,
      })
    } else {
      sonnerToast.success(message, {
        description: descriptionText,
      })
    }
  }

  return { toast }
}

export { sonnerToast as toast }
