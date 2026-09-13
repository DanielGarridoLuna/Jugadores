import React, { useEffect } from 'react'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger',
  isLoading = false,
  showCancel = true
}) {
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const getIcon = () => {
    if (type === 'danger') {
      return <AlertTriangle className="w-6 h-6 text-red-400" />
    }
    if (type === 'success') {
      return <CheckCircle2 className="w-6 h-6 text-green-400" />
    }
    if (type === 'blue') {
      return <Info className="w-6 h-6 text-[color:var(--neon-cyan)]" />
    }
    return <Info className="w-6 h-6 text-amber-400" />
  }

  const getColors = () => {
    if (type === 'danger') {
      return 'bg-red-500/10 border border-red-500/40'
    }
    if (type === 'success') {
      return 'bg-green-500/10 border border-green-500/40'
    }
    if (type === 'blue') {
      return 'bg-[color:var(--neon-cyan)]/10 border border-[color:var(--border-neon)]'
    }
    return 'bg-amber-500/10 border border-amber-500/40'
  }

  const getButtonColors = () => {
    if (type === 'danger') {
      return 'bg-red-600 hover:bg-red-700 border border-red-400 shadow-[0_0_14px_rgba(244,67,54,0.6)]'
    }
    if (type === 'success') {
      return 'bg-green-600 hover:bg-green-700 border border-green-400 shadow-[0_0_14px_rgba(76,175,80,0.6)]'
    }
    if (type === 'blue') {
      return 'bg-[color:var(--neon-cyan)] hover:bg-[color:var(--neon-cyan)]/80 text-[#05010F] border border-[color:var(--neon-cyan)] shadow-[0_0_18px_rgba(0,229,255,0.8)]'
    }
    return 'bg-amber-600 hover:bg-amber-700 border border-amber-400 shadow-[0_0_14px_rgba(255,152,0,0.6)]'
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity"
        onClick={!isLoading ? onClose : undefined}
      />

      <div className="surface-strong relative max-w-sm w-full p-6 z-10">
        <div className="flex flex-col items-center text-center">
          
          <div className={`w-12 h-12 rounded-full ${getColors()} flex items-center justify-center mb-4`}>
            {getIcon()}
          </div>

          <h3 className="text-lg font-bold text-neon mb-2 tracking-wide">
            {title}
          </h3>
          <div className="text-sm text-[color:var(--text-main)] mb-6 w-full">
            {message}
          </div>

          <div className="flex gap-3 w-full">
            {showCancel && (
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 rounded-md text-sm font-semibold uppercase tracking-widest text-[color:var(--text-main)] bg-white/5 hover:bg-white/10 border border-[color:var(--border-neon-soft)] transition-colors disabled:opacity-50"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 px-4 py-2.5 rounded-md text-sm font-bold uppercase tracking-widest transition-colors flex items-center justify-center disabled:opacity-50 ${getButtonColors()}`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}