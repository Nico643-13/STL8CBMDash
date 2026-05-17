export function Card({ children, className = '' }) {
  return <div className={`bg-white border border-slate-200 ${className}`}>{children}</div>
}
export function CardHeader({ children, className = '' }) {
  return <div className={`p-4 ${className}`}>{children}</div>
}
export function CardTitle({ children, className = '' }) {
  return <h2 className={`text-xl font-bold text-slate-900 ${className}`}>{children}</h2>
}
export function CardContent({ children, className = '' }) {
  return <div className={`p-4 pt-0 ${className}`}>{children}</div>
}
