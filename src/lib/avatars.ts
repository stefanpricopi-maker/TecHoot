export type AvatarKey =
  // Feminine
  | "mary"
  | "esther"
  | "ruth"
  | "sarah"
  | "rebecca"
  | "deborah"
  | "hannah"
  | "mary_magdalene"
  | "elizabeth"
  | "eve"
  // Masculine
  | "jesus"
  | "moses"
  | "david"
  | "abraham"
  | "noah"
  | "solomon"
  | "joseph"
  | "peter"
  | "paul"
  | "daniel";

export const AVATAR_OPTIONS: Array<{
  key: AvatarKey;
  label: string;
  short: string;
  gender: "f" | "m";
  srcWebp: string;
  srcPng: string;
  srcHeif: string;
}> = [
  // Feminine (10)
  { key: "mary", label: "Maria", short: "Ma", gender: "f", srcWebp: "/avatars/mary.webp", srcPng: "/avatars/mary.png", srcHeif: "/avatars/mary.heif" },
  { key: "esther", label: "Estera", short: "Es", gender: "f", srcWebp: "/avatars/esther.webp", srcPng: "/avatars/esther.png", srcHeif: "/avatars/esther.heif" },
  { key: "ruth", label: "Rut", short: "Ru", gender: "f", srcWebp: "/avatars/ruth.webp", srcPng: "/avatars/ruth.png", srcHeif: "/avatars/ruth.heif" },
  { key: "sarah", label: "Sara", short: "Sa", gender: "f", srcWebp: "/avatars/sarah.webp", srcPng: "/avatars/sarah.png", srcHeif: "/avatars/sarah.heif" },
  { key: "rebecca", label: "Rebeca", short: "Re", gender: "f", srcWebp: "/avatars/rebecca.webp", srcPng: "/avatars/rebecca.png", srcHeif: "/avatars/rebecca.heif" },
  { key: "deborah", label: "Debora", short: "De", gender: "f", srcWebp: "/avatars/deborah.webp", srcPng: "/avatars/deborah.png", srcHeif: "/avatars/deborah.heif" },
  { key: "hannah", label: "Ana", short: "An", gender: "f", srcWebp: "/avatars/hannah.webp", srcPng: "/avatars/hannah.png", srcHeif: "/avatars/hannah.heif" },
  { key: "mary_magdalene", label: "Maria Magdalena", short: "MM", gender: "f", srcWebp: "/avatars/mary_magdalene.webp", srcPng: "/avatars/mary_magdalene.png", srcHeif: "/avatars/mary_magdalene.heif" },
  { key: "elizabeth", label: "Elisabeta", short: "El", gender: "f", srcWebp: "/avatars/elizabeth.webp", srcPng: "/avatars/elizabeth.png", srcHeif: "/avatars/elizabeth.heif" },
  { key: "eve", label: "Eva", short: "Ev", gender: "f", srcWebp: "/avatars/eve.webp", srcPng: "/avatars/eve.png", srcHeif: "/avatars/eve.heif" },
  // Masculine (10)
  { key: "jesus", label: "Isus", short: "Is", gender: "m", srcWebp: "/avatars/jesus.webp", srcPng: "/avatars/jesus.png", srcHeif: "/avatars/jesus.heif" },
  { key: "moses", label: "Moise", short: "Mo", gender: "m", srcWebp: "/avatars/moses.webp", srcPng: "/avatars/moses.png", srcHeif: "/avatars/moses.heif" },
  { key: "david", label: "David", short: "Da", gender: "m", srcWebp: "/avatars/david.webp", srcPng: "/avatars/david.png", srcHeif: "/avatars/david.heif" },
  { key: "abraham", label: "Avraam", short: "Av", gender: "m", srcWebp: "/avatars/abraham.webp", srcPng: "/avatars/abraham.png", srcHeif: "/avatars/abraham.heif" },
  { key: "noah", label: "Noe", short: "No", gender: "m", srcWebp: "/avatars/noah.webp", srcPng: "/avatars/noah.png", srcHeif: "/avatars/noah.heif" },
  { key: "solomon", label: "Solomon", short: "So", gender: "m", srcWebp: "/avatars/solomon.webp", srcPng: "/avatars/solomon.png", srcHeif: "/avatars/solomon.heif" },
  { key: "joseph", label: "Iosif", short: "Io", gender: "m", srcWebp: "/avatars/joseph.webp", srcPng: "/avatars/joseph.png", srcHeif: "/avatars/joseph.heif" },
  { key: "peter", label: "Petru", short: "Pe", gender: "m", srcWebp: "/avatars/peter.webp", srcPng: "/avatars/peter.png", srcHeif: "/avatars/peter.heif" },
  { key: "paul", label: "Pavel", short: "Pa", gender: "m", srcWebp: "/avatars/paul.webp", srcPng: "/avatars/paul.png", srcHeif: "/avatars/paul.heif" },
  { key: "daniel", label: "Daniel", short: "Dn", gender: "m", srcWebp: "/avatars/daniel.webp", srcPng: "/avatars/daniel.png", srcHeif: "/avatars/daniel.heif" },
];

export const DEFAULT_AVATAR_KEY: AvatarKey = "mary";

export function isAvatarKey(x: unknown): x is AvatarKey {
  return AVATAR_OPTIONS.some((o) => o.key === x);
}

export function avatarLabel(key: string | null | undefined): string {
  const found = AVATAR_OPTIONS.find((o) => o.key === key);
  return found?.label ?? AVATAR_OPTIONS[0]!.label;
}

export function avatarShort(key: string | null | undefined): string {
  const found = AVATAR_OPTIONS.find((o) => o.key === key);
  return found?.short ?? AVATAR_OPTIONS[0]!.short;
}

export function avatarGender(key: string | null | undefined): "f" | "m" {
  const found = AVATAR_OPTIONS.find((o) => o.key === key);
  return found?.gender ?? AVATAR_OPTIONS[0]!.gender;
}

export function avatarSrcPng(key: string | null | undefined): string {
  const found = AVATAR_OPTIONS.find((o) => o.key === key);
  return found?.srcPng ?? AVATAR_OPTIONS[0]!.srcPng;
}

export function avatarSrcHeif(key: string | null | undefined): string {
  const found = AVATAR_OPTIONS.find((o) => o.key === key);
  return found?.srcHeif ?? AVATAR_OPTIONS[0]!.srcHeif;
}

export function avatarSrcWebp(key: string | null | undefined): string {
  const found = AVATAR_OPTIONS.find((o) => o.key === key);
  return found?.srcWebp ?? AVATAR_OPTIONS[0]!.srcWebp;
}

