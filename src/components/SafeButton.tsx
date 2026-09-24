'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

export interface SafeButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onAsyncClick?: () => Promise<void> | Promise<any>;
  loadingText?: string;
  spinnerClassName?: string;
  children: React.ReactNode;
}

/**
 * SafeButton prevents concurrent/duplicate double-click form submissions.
 * When onAsyncClick is supplied, the button enters an internal busy state,
 * applies aria-busy, disables clicks, and renders an animated spinner.
 */
export function SafeButton({
  onAsyncClick,
  loadingText,
  spinnerClassName = 'w-4 h-4 animate-spin',
  children,
  className = '',
  disabled,
  onClick,
  ...props
}: SafeButtonProps) {
  const [busy, setBusy] = useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (busy || disabled) {
      e.preventDefault();
      return;
    }

    if (onAsyncClick) {
      e.preventDefault();
      setBusy(true);
      try {
        await onAsyncClick();
      } finally {
        setBusy(false);
      }
    } else if (onClick) {
      onClick(e);
    }
  };

  const isDisabled = Boolean(disabled || busy);

  return (
    <button
      {...props}
      disabled={isDisabled}
      aria-busy={busy}
      onClick={handleClick}
      className={`${className} ${isDisabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}
    >
      {busy ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Loader2 className={spinnerClassName} />
          {loadingText ? <span>{loadingText}</span> : children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export default SafeButton;
