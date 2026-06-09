import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

/**
 * Input component - a wrapper around the HTML input element with styling variants
 * @param {React.InputHTMLAttributes<HTMLInputElement>} props - Input props
 * @param {string} props.variant - Variant of the input (default, outline, etc.)
 * @param {string} props.size - Size of the input (default, sm, lg)
 * @param {boolean} props.asChild - If true, renders the slot as a child component
 */
const inputVariants = React.cva(
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:focus:outline-none placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-input bg-background',
        outline: 'border-input bg-background',
        // You can add more variants like filled, etc.
      },
      size: {
        default: 'h-10 py-2 px-3',
        sm: 'h-9 px-2',
        lg: 'h-11 px-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  asChild?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'input';
    return (
      <Comp
        className={cn(inputVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input, inputVariants };