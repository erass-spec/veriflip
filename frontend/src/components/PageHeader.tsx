// Centered, gradient page header for the inner routes — gives each page a welcoming title
// and one line of context above the main cards.
export default function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center">
      <h1 className="mb-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 bg-clip-text text-xl font-bold tracking-tight text-transparent md:text-2xl">
        {title}
      </h1>
      <p className="mx-auto mb-6 max-w-sm text-center text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}
