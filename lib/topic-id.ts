export function normalizeTopicId(value: unknown) {
  return String(value ?? "")
}

export function toDatabaseTopicId(value: unknown): number | null {
  if (value == null || value === "") return null

  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : null
}
