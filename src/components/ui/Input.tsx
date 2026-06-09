import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="text-xs uppercase tracking-widest text-[#8C9A84] font-sans"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          {...props}
          className={[
            'w-full rounded-2xl bg-[#F2F0EB] px-4 py-3 text-[#2D3A31] text-sm font-sans',
            'border border-[#E6E2DA] outline-none',
            'transition-all duration-300',
            'placeholder:text-[#8C9A84]/60',
            'focus:border-[#8C9A84] focus:bg-white',
            'disabled:opacity-40',
            error ? 'border-[#C27B66]' : '',
            className,
          ].join(' ')}
        />
        {error && (
          <span className="text-xs text-[#C27B66] font-sans">{error}</span>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'
