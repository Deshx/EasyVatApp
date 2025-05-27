"use client"

import { useEffect, useState } from "react"
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react"

export type ToastType = "success" | "error" | "info" | "warning"

interface ToastProps {
  message: string
  type: ToastType
  isVisible: boolean
  onClose: () => void
  duration?: number // Auto-dismiss duration in milliseconds
}

export function Toast({ 
  message, 
  type, 
  isVisible, 
  onClose, 
  duration = 5000 
}: ToastProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setShow(true)
      
      // Auto-dismiss after duration
      if (duration > 0) {
        const timer = setTimeout(() => {
          setShow(false)
          setTimeout(onClose, 300) // Wait for animation to complete
        }, duration)
        
        return () => clearTimeout(timer)
      }
    } else {
      setShow(false)
    }
  }, [isVisible, duration, onClose])

  if (!isVisible) return null

  const getToastStyles = () => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200 text-green-800"
      case "error":
        return "bg-red-50 border-red-200 text-red-800"
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-800"
      case "info":
        return "bg-blue-50 border-blue-200 text-blue-800"
      default:
        return "bg-gray-50 border-gray-200 text-gray-800"
    }
  }

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case "info":
        return <Info className="h-5 w-5 text-blue-600" />
      default:
        return <Info className="h-5 w-5 text-gray-600" />
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`
          max-w-sm w-full border rounded-lg shadow-lg p-4 
          transform transition-all duration-300 ease-in-out
          ${show ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
          ${getToastStyles()}
        `}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium capitalize">{type}</p>
            <p className="text-sm mt-1 leading-relaxed">{message}</p>
          </div>
          <button
            onClick={() => {
              setShow(false)
              setTimeout(onClose, 300)
            }}
            className="flex-shrink-0 ml-2 p-1 rounded-md hover:bg-black hover:bg-opacity-10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Hook for managing toast state
export function useToast() {
  const [toast, setToast] = useState<{
    message: string
    type: ToastType
    isVisible: boolean
  }>({
    message: "",
    type: "info",
    isVisible: false,
  })

  const showToast = (message: string, type: ToastType = "info") => {
    setToast({ message, type, isVisible: true })
  }

  const hideToast = () => {
    setToast(prev => ({ ...prev, isVisible: false }))
  }

  const ToastComponent = () => (
    <Toast
      message={toast.message}
      type={toast.type}
      isVisible={toast.isVisible}
      onClose={hideToast}
    />
  )

  return {
    showToast,
    hideToast,
    ToastComponent,
  }
}
