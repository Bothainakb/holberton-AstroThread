import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { isAppPath, navigate } from './router'

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }

/** Anchor that switches pages without a full reload for in-app paths. */
function Link({ href, onClick, target, ...props }: LinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event)
    const isModifiedClick = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      isModifiedClick ||
      (target && target !== '_self') ||
      !isAppPath(href)
    ) {
      return
    }
    event.preventDefault()
    navigate(href)
  }

  return <a href={href} target={target} onClick={handleClick} {...props} />
}

export default Link
