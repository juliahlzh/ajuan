export function parseAttachmentLinks(value: string | null | undefined) {
  if (!value) return [] as string[];
  const trimmed = value.trim();
  if (!trimmed) return [] as string[];

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
      }
    } catch {
      return [value];
    }
  }

  return [value];
}

export function serializeAttachmentLinks(links: string[]) {
  const clean = links.filter(Boolean);
  if (!clean.length) return null;
  if (clean.length === 1) return clean[0];
  return JSON.stringify(clean);
}
