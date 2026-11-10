type SectionHeadingProps = {
  id: string;
  title: string;
  lead?: string;
  action?: React.ReactNode;
  tone?: "light" | "dark";
};

/** Shared heading row for homepage sections: title, optional lead and a link on the right. */
export function SectionHeading({ id, title, lead, action, tone = "light" }: SectionHeadingProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex max-w-2xl flex-col gap-2">
        <h2 id={id} className={tone === "dark" ? "text-h2 text-on-dark" : "text-h2"}>
          {title}
        </h2>
        {lead ? (
          <p className={tone === "dark" ? "text-on-dark-muted" : "text-muted-foreground"}>{lead}</p>
        ) : null}
      </div>
      {action ? <div className="self-start md:self-auto">{action}</div> : null}
    </div>
  );
}
