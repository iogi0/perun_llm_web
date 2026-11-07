const swatches = [
  ["canvas", "bg-canvas"],
  ["sidebar", "bg-sidebar"],
  ["surface", "bg-surface"],
  ["bubble", "bg-bubble"],
  ["code", "bg-code"],
  ["ink", "bg-ink"],
  ["ink-muted", "bg-ink-muted"],
  ["line", "bg-line"],
  ["accent", "bg-accent"],
  ["spark", "bg-spark"],
  ["danger", "bg-danger"],
] as const;

export function App() {
  return (
    <main className="mx-auto max-w-184 p-6">
      <h1 className="text-[28px] font-medium">Perun LLM</h1>
      <ul className="mt-6 grid gap-2">
        {swatches.map(([name, className]) => (
          <li key={name} className="flex items-center gap-3">
            <span className={`size-8 rounded-lg border border-line ${className}`} />
            {name}
          </li>
        ))}
      </ul>
    </main>
  );
}
