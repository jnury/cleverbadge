import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Button({ className, variant = 'primary', ...props }) {
    const baseStyles = "px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
        primary: "bg-gradient-to-b from-copper to-copper-dark text-white hover:from-copper-dark hover:to-copper-dark focus:ring-copper-light shadow-md",
        secondary: "bg-primary text-white hover:bg-circuit-blue focus:ring-tech-blue",
        outline: "border-2 border-primary text-primary hover:bg-primary/5 focus:ring-primary"
    };

    return (
        <button
            className={twMerge(baseStyles, variants[variant], className)}
            {...props}
        />
    );
}
