import { Component, JSX, splitProps } from 'solid-js';

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    active?: boolean;
    icon?: boolean;
}

export const Button: Component<ButtonProps> = (props) => {
    const [local, rest] = splitProps(props, ['variant', 'size', 'active', 'icon', 'class', 'children']);

    const variants = {
        primary: 'bg-primary-600 text-white hover:bg-primary-500 focus:ring-primary-500',
        secondary: 'bg-surface-700 text-surface-100 hover:bg-surface-600 focus:ring-surface-500',
        ghost: 'bg-transparent text-surface-300 hover:bg-surface-700 hover:text-surface-100 focus:ring-surface-500',
        danger: 'bg-red-600 text-white hover:bg-red-500 focus:ring-red-500',
    };

    const sizes = {
        sm: local.icon ? 'p-1.5' : 'px-2 py-1 text-xs',
        md: local.icon ? 'p-2' : 'px-3 py-1.5 text-sm',
        lg: local.icon ? 'p-3' : 'px-4 py-2 text-base',
    };

    const variant = local.variant ?? 'secondary';
    const size = local.size ?? 'md';

    return (
        <button
            class={`
        inline-flex items-center justify-center rounded font-medium
        transition-all duration-150 
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface-900
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${local.active ? 'ring-2 ring-primary-500' : ''}
        ${local.class ?? ''}
      `}
            {...rest}
        >
            {local.children}
        </button>
    );
};
