import type { AnchorHTMLAttributes, ReactNode } from 'react'
import Link from '../../router/Link'
import './Button.css'

type ButtonVariant = 'primary' | 'secondary'

interface ButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  variant?: ButtonVariant
  children: ReactNode
}

/** Link styled as a Figma "Primary Button" or "Secondary Button". */
function Button({ variant = 'primary', className, children, ...props }: ButtonProps) {
  const classes = ['button', `button--${variant}`, className].filter(Boolean).join(' ')

  return (
    <Link className={classes} {...props}>
      {children}
    </Link>
  )
}

export default Button
