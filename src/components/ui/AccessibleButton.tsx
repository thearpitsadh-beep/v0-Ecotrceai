import React, { forwardRef } from 'react';
import { generateId } from '../../lib/utils/a11y.utils';
import type { AccessibleComponentProps } from '../../lib/types/utility.types';

interface AccessibleButtonProps
  extends AccessibleComponentProps,
    React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  ariaLabel?: string;
  ariaPressed?: boolean;
  ariaExpanded?: boolean;
  ariaControls?: string;
  ariaDescribedBy?: string;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClasses = {
  primary: 'bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400',
  secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 disabled:bg-gray-100',
  danger: 'bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-400',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export const AccessibleButton = forwardRef<
  HTMLButtonElement,
  AccessibleButtonProps
>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      disabled = false,
      ariaLabel,
      ariaPressed,
      ariaExpanded,
      ariaControls,
      ariaDescribedBy,
      loading = false,
      icon,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const buttonId = id || generateId('button');
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        id={buttonId}
        disabled={isDisabled}
        aria-label={ariaLabel}
        aria-pressed={ariaPressed}
        aria-expanded={ariaExpanded}
        aria-controls={ariaControls}
        aria-describedby={ariaDescribedBy}
        aria-busy={loading}
        className={`
          inline-flex items-center justify-center gap-2
          rounded-md font-medium
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
          disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        {...props}
      >
        {loading && (
          <div
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
        )}
        {icon && <span aria-hidden="true">{icon}</span>}
        <span>{children}</span>
      </button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';
