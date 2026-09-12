export function createId(prefix: string) {
  const cryptoObject = globalThis.crypto;
  const id =
    typeof cryptoObject?.randomUUID === "function"
      ? cryptoObject.randomUUID()
      : Math.random().toString(36).slice(2, 12);

  return `${prefix}_${id}`;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
