/** RFC 5545 calendar file for one event (pure). Times are UTC, so every calendar shows local time. */
export type IcsEvent = {
  uid: string;
  title: string;
  description: string;
  location: string | null;
  url: string;
  startsAt: Date;
  endsAt: Date;
  updatedAt: Date;
};

function stamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** Escapes text values (backslash, semicolon, comma, newline). */
export function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Folds lines longer than 75 octets, as the spec requires. */
function fold(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 75) {
    let cut = 75;
    while (Buffer.byteLength(rest.slice(0, cut)) > 75) cut -= 1;
    parts.push(rest.slice(0, cut));
    rest = ` ${rest.slice(cut)}`;
  }
  parts.push(rest);
  return parts.join("\r\n");
}

export function buildIcs(event: IcsEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Expats in Business//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${stamp(event.updatedAt)}`,
    `DTSTART:${stamp(event.startsAt)}`,
    `DTEND:${stamp(event.endsAt)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(`${event.description}\n\n${event.url}`)}`,
    ...(event.location ? [`LOCATION:${escapeIcs(event.location)}`] : []),
    `URL:${event.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}

export type IcsTask = {
  uid: string;
  title: string;
  description: string;
  url: string;
  date: Date;
  stamp: Date;
};

function dateValue(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

/** Calendar with one all-day event per task (roadmap deadlines). Same escaping and folding rules. */
export function buildTaskCalendar(name: string, tasks: readonly IcsTask[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Expats in Business//Roadmap//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(name)}`,
  ];
  for (const task of tasks) {
    const next = new Date(task.date.getTime() + 86_400_000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${task.uid}`,
      `DTSTAMP:${stamp(task.stamp)}`,
      `DTSTART;VALUE=DATE:${dateValue(task.date)}`,
      `DTEND;VALUE=DATE:${dateValue(next)}`,
      `SUMMARY:${escapeIcs(task.title)}`,
      `DESCRIPTION:${escapeIcs(`${task.description}\n\n${task.url}`)}`,
      `URL:${task.url}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
