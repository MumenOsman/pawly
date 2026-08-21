/**
 * Button
 *
 * Reusable button with variants matching the design system.
 * Min touch target: 48px (Nordic glove-friendly).
 */
import './Button.css';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  type = 'button',
  onClick,
  className = '',
  id,
  ...props
}) {
  return (
    <button
      type={type}
      className={`btn btn--${variant} btn--${size} ${fullWidth ? 'btn--full' : ''} ${loading ? 'btn--loading' : ''} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      id={id}
      {...props}
    >
      {loading && <span className="btn__spinner" />}
      <span className={`btn__content ${loading ? 'btn__content--hidden' : ''}`}>
        {children}
      </span>
    </button>
  );
}
