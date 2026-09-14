export type ChatItem = {
  id: number;
  quantity: number;
};

export function decodeChatlink(text: string): ChatItem | null {
  const m = String(text).match(/\[&([A-Za-z0-9+/=]+)\]/);
  if (!m?.[1]) return null;
  try {
    const bin = atob(m[1]);
    const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
    if (bytes.length < 5 || bytes[0] !== 2) return null;
    const id =
      (bytes[2] ?? 0) |
      ((bytes[3] ?? 0) << 8) |
      ((bytes[4] ?? 0) << 16) |
      ((bytes[5] ?? 0) << 24);
    const quantity = bytes[1] || 1;
    return id > 0 ? { id, quantity } : null;
  } catch {
    return null;
  }
}

export function encodeChatlink(id: number, quantity = 1): string {
  const qty = Math.min(255, Math.max(1, Math.floor(quantity) || 1));
  const n = Math.floor(id);
  const bytes = new Uint8Array([
    2,
    qty,
    n & 0xff,
    (n >> 8) & 0xff,
    (n >> 16) & 0xff,
    (n >> 24) & 0xff,
  ]);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return `[&${btoa(bin)}]`;
}

export type GameCopy = {
  search: string;
  candidates: string[];
  quantity: number;
  id: number | null;
  fromBrackets: boolean;
};

export function nameCandidates(name: string): string[] {
  const trimmed = name.trim();
  if (!trimmed) return [];
  const out = [trimmed];
  const words = trimmed.split(/\s+/);
  const first = words[0] ?? "";
  const rest = words.slice(1);
  const swap = (head: string) => [head, ...rest].join(" ").trim();

  if (/ies$/i.test(first) && first.length > 4) out.push(swap(first.replace(/ies$/i, "y")));
  else if (/ves$/i.test(first) && first.length > 4) {
    out.push(swap(first.replace(/ves$/i, "f")));
    out.push(swap(first.replace(/ves$/i, "fe")));
  } else if (/oes$/i.test(first) && first.length > 4) out.push(swap(first.replace(/es$/i, "")));
  else if (/s$/i.test(first) && !/ss$/i.test(first) && first.length > 2) {
    out.push(swap(first.replace(/s$/i, "")));
  }

  return [...new Set(out.filter(Boolean))];
}

export function parseGameCopy(raw: string): GameCopy {
  const original = String(raw).trim();
  const chat = decodeChatlink(original);
  if (chat) {
    return {
      search: String(chat.id),
      candidates: [String(chat.id)],
      quantity: chat.quantity,
      id: chat.id,
      fromBrackets: false,
    };
  }

  const fromBrackets = /^\s*\[/.test(original);
  let s = original
    .replace(/#\d*/g, " ")
    .replace(/[\[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (/^\d+$/.test(s)) {
    return { search: s, candidates: [s], quantity: 1, id: Number(s), fromBrackets };
  }

  let quantity = 1;
  if (fromBrackets) {
    const lead = s.match(/^(\d+)\s+(.+)$/);
    if (lead) {
      quantity = Math.min(255, Math.max(1, Number(lead[1])));
      s = lead[2];
    }
  }

  return {
    search: s,
    candidates: nameCandidates(s),
    quantity,
    id: null,
    fromBrackets,
  };
}
