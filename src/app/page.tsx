import Link from "next/link";

const links = [
  { href: "/display", label: "Página de Projeção" },
  { href: "/control", label: "Painel de Controlo" }
];

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <header className="text-center">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">Gestão de cronómetros</p>
        <h1 className="mt-2 text-4xl font-semibold">Escolha um modo</h1>
      </header>
      <div className="flex flex-wrap items-center justify-center gap-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg border border-border px-6 py-4 text-lg font-medium transition hover:bg-muted"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </main>
  );
}
