import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import styles from './Button.module.css'

type Variant = 'primary' | 'secondary'
type Size = 'md' | 'lg'

interface BaseProps {
  variant?: Variant
  size?: Size
  children: ReactNode
  className?: string
}

type ButtonAsButton = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
    to?: undefined
  }

type ButtonAsLink = BaseProps & {
  /** When set, the button renders as a router link. */
  to: string
}

type ButtonProps = ButtonAsButton | ButtonAsLink

function classesFor(variant: Variant, size: Size, extra?: string) {
  return [styles.button, styles[variant], styles[size], extra]
    .filter(Boolean)
    .join(' ')
}

export function Button(props: ButtonProps) {
  const cls = classesFor(
    props.variant ?? 'primary',
    props.size ?? 'md',
    props.className,
  )

  if (props.to !== undefined) {
    return (
      <Link to={props.to} className={cls}>
        {props.children}
      </Link>
    )
  }

  // Strip non-DOM props before spreading the rest onto <button>.
  const {
    variant: _v,
    size: _s,
    className: _c,
    children,
    to: _t,
    ...rest
  } = props
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  )
}
