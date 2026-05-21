export function Button({ children, className = '', variant = 'default', size = 'default', ...props }) {
  const variantClass = variant === 'destructive'
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : variant === 'outline'
      ? 'border border-slate-300 bg-white hover:bg-slate-50 text-slate-900'
      : 'bg-slate-900 hover:bg-slate-800 text-white';
  const sizeClass = size === 'icon' ? 'h-8 w-8 p-0 inline-flex items-center justify-center' : 'px-4 py-2';
  return <button className={`rounded-lg font-medium transition disabled:opacity-50 ${variantClass} ${sizeClass} ${className}`} {...props}>{children}</button>
}
