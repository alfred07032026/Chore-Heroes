let counter = 0;

/** Locally-unique, sortable-ish ID. No network, no device identifiers. */
export function newId(prefix = ''): string {
  counter = (counter + 1) % 1_679_616;
  const time = Date.now().toString(36);
  const seq = counter.toString(36).padStart(4, '0');
  const rand = Math.floor(Math.random() * 1_679_616)
    .toString(36)
    .padStart(4, '0');
  return `${prefix}${time}${seq}${rand}`;
}
