import React from 'react';
import tokens from '@talent-setu/ui-tokens';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  disabled,
  ...rest
}) => {
  const styles: React.CSSProperties = {
    background:
      variant === 'primary' ? tokens.color.lakersGold : variant === 'secondary' ? tokens.color.lakersPurple : 'transparent',
    color: variant === 'primary' ? tokens.color.black : tokens.color.white,
    padding: size === 'sm' ? '6px 10px' : size === 'lg' ? '14px 20px' : '10px 16px',
    borderRadius: tokens.radius.md,
    border: variant === 'ghost' ? `1px solid ${tokens.color.lakersPurple}` : 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
  };

  return (
    <button aria-disabled={disabled} disabled={disabled} style={styles} {...rest}>
      {children}
    </button>
  );
};

export default Button;
