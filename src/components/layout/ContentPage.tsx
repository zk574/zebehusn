export function ContentPage({ eyebrow, title, intro, sections }: { eyebrow: string; title: string; intro?: string; sections: { h: string; p: React.ReactNode }[] }) {
  return (
    <article className="container-lux max-w-3xl pt-12 md:pt-20">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="h-display mt-3 text-5xl md:text-7xl">{title}</h1>
      {intro && <p className="mt-6 text-lg text-ivory/75 leading-relaxed">{intro}</p>}
      <div className="hairline my-12" />
      <div className="space-y-10">
        {sections.map((s) => (
          <section key={s.h}>
            <h2 className="font-display text-3xl">{s.h}</h2>
            <div className="mt-3 text-ivory/75 leading-relaxed">{s.p}</div>
          </section>
        ))}
      </div>
    </article>
  );
}
