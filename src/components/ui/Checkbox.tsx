import { Component, JSX } from 'solid-js';

interface CheckboxProps extends Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    checked: boolean;
    label?: string;
    onChange?: (checked: boolean) => void;
}

export const Checkbox: Component<CheckboxProps> = (props) => {
    return (
        <label class="flex items-center gap-2 cursor-pointer select-none text-xs text-surface-200 hover:text-white transition-colors">
            <div class="relative flex items-center">
                <input
                    type="checkbox"
                    class="peer appearance-none w-3.5 h-3.5 border border-surface-500 rounded bg-surface-800 
                           checked:bg-primary-600 checked:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-500/50
                           transition-colors"
                    checked={props.checked}
                    onChange={(e) => props.onChange?.(e.currentTarget.checked)}
                    {...props}
                />
                <svg
                    class="absolute left-0 top-0 w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <polyline points="20 6 9 17 4 12" />
                </svg>
            </div>
            {props.label && <span>{props.label}</span>}
        </label>
    );
};
