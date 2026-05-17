export function Input({ className = '', ...props }) {
  return <input className={`w-full rounded-lg border border-slate-300 bg-white p-2 text-sm outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100 ${className}`} {...props} />
}
