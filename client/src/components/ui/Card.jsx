import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Card({ className, children, ...props }) {
    return (
        <div
            className={twMerge("bg-white rounded-xl shadow-sm border border-gray-100 p-6", className)}
            {...props}
        >
            {children}
        </div>
    );
}
