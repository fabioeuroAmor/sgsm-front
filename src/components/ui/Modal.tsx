import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-[#2D3A31]/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* panel */}
      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-[#E6E2DA] bg-[#F9F8F4] shadow-[0_25px_50px_-12px_rgba(45,58,49,0.15)]">
        {/* header */}
        <div className="flex items-center justify-between border-b border-[#E6E2DA] px-6 py-4">
          <h3 className="font-serif text-xl font-semibold text-[#2D3A31]">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#8C9A84] transition-colors duration-300 hover:bg-[#DCCFC2] hover:text-[#2D3A31]"
            aria-label="Fechar"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* body */}
        <div className="px-6 py-5">{children}</div>

        {/* footer */}
        {footer && (
          <div className="flex justify-end gap-3 border-t border-[#E6E2DA] px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
