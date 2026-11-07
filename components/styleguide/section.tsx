type SectionProps = {
  id: string;
  title: string;
  intro?: string;
  children: React.ReactNode;
};

export function StyleguideSection({ id, title, intro, children }: SectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="flex min-w-0 scroll-mt-8 flex-col gap-6">
      <div className="flex flex-col gap-2 border-b border-line pb-3">
        <h2 id={`${id}-title`} className="text-h2">
          {title}
        </h2>
        {intro ? <p className="max-w-3xl text-muted-foreground">{intro}</p> : null}
      </div>
      {children}
    </section>
  );
}
