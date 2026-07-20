const maxDescriptionLength = 160;
const minimumPreferredBoundary = 80;

function trimUnsafeTail(value) {
  let safe = value.trimEnd();

  if ((safe.match(/`/g)?.length ?? 0) % 2 === 1) {
    safe = safe.slice(0, safe.lastIndexOf('`')).trimEnd();
  }

  const lastOpenBrace = safe.lastIndexOf('{');
  const lastCloseBrace = safe.lastIndexOf('}');
  if (lastOpenBrace > lastCloseBrace) {
    const tokenBoundary = safe.lastIndexOf(' ', lastOpenBrace);
    safe = safe.slice(0, tokenBoundary >= 0 ? tokenBoundary : lastOpenBrace).trimEnd();
  }

  const wordBoundary = safe.lastIndexOf(' ');
  if (wordBoundary >= minimumPreferredBoundary) {
    safe = safe.slice(0, wordBoundary).trimEnd();
  }

  return safe
    .replace(/\s+(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|as|via|using|to)$/i, '')
    .trimEnd();
}

export function toSeoDescription(value) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxDescriptionLength) return normalized;

  const candidate = normalized.slice(0, maxDescriptionLength - 1);
  const sentenceEnd = Math.max(
    candidate.lastIndexOf('. '),
    candidate.lastIndexOf('。'),
    candidate.lastIndexOf('！'),
    candidate.lastIndexOf('？'),
  );
  if (sentenceEnd >= minimumPreferredBoundary) {
    return candidate.slice(0, sentenceEnd + 1).trim();
  }

  return `${trimUnsafeTail(candidate)}…`;
}
