export interface PreferenceRow {
  food_name: string;
  signal: 'like' | 'dislike' | 'avoid' | 'allergy';
  weight: number;
  source: string;
  last_seen: string;
}

export function decayWeight(row: PreferenceRow): number {
  if (row.signal === 'avoid' || row.signal === 'allergy') return row.weight;
  const lastSeen = new Date(row.last_seen);
  const weeksSince = (Date.now() - lastSeen.getTime()) / (7 * 24 * 60 * 60 * 1000);
  const decayed = Math.round(row.weight * Math.pow(0.95, Math.max(0, weeksSince)));
  return Math.max(1, decayed);
}

export interface PreferenceBlock {
  likes: string[];
  dislikes: string[];
  avoids: string[];
  allergies: string[];
}

export function groupPreferences(rows: PreferenceRow[]): PreferenceBlock {
  const likes: string[] = [];
  const dislikes: string[] = [];
  const avoids: string[] = [];
  const allergies: string[] = [];

  const weighted = rows.map((r) => ({ ...r, effectiveWeight: decayWeight(r) }));

  for (const row of weighted) {
    const entry = row.food_name.toLowerCase();
    if (row.signal === 'like') likes.push(entry);
    else if (row.signal === 'dislike') dislikes.push(entry);
    else if (row.signal === 'avoid') avoids.push(entry);
    else if (row.signal === 'allergy') allergies.push(entry);
  }

  return {
    likes: [...new Set(likes)].slice(0, 5),
    dislikes: [...new Set(dislikes)].slice(0, 5),
    avoids: [...new Set(avoids)],
    allergies: [...new Set(allergies)],
  };
}

export function buildPreferenceBlock(rows: PreferenceRow[]): string {
  const grouped = groupPreferences(rows);
  const parts: string[] = [];

  if (grouped.likes.length > 0) {
    parts.push(`Likes: ${grouped.likes.join(', ')}`);
  }
  if (grouped.dislikes.length > 0) {
    parts.push(`Dislikes: ${grouped.dislikes.join(', ')}`);
  }
  if (grouped.avoids.length > 0) {
    parts.push(`Avoid: ${grouped.avoids.join(', ')}`);
  }
  if (grouped.allergies.length > 0) {
    parts.push(`Allergies: ${grouped.allergies.join(', ')}`);
  }

  if (parts.length === 0) return '';

  return `[User Preferences: ${parts.join(' | ')}]`;
}
