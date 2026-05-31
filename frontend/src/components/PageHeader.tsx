// Centered, gradient page header for the inner routes. Compact single line on desktop
// (title • subtitle); stacks cleanly on mobile to avoid horizontal overflow.
export default function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-3 flex flex-col items-center space-y-1 text-center md:mb-6 md:flex-row md:items-center md:justify-center md:space-x-3 md:space-y-0">
      <h1 className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 bg-clip-text text-lg font-bold tracking-tight text-transparent md:text-xl">
        {title}
      </h1>
      <span aria-hidden className="hidden text-slate-600 md:inline">
        •
      </span>
      <p className="max-w-sm text-xs text-slate-400 md:max-w-none">{subtitle}</p>
    </div>
  );
}
