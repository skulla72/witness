// Static Bible metadata + a curated verse-of-the-day pool.
// Passage text itself is fetched on demand (see bible.functions.ts).

export interface Book {
  name: string;
  chapters: number;
  testament: "OT" | "NT";
}

export const BOOKS: Book[] = [
  ["Genesis", 50], ["Exodus", 40], ["Leviticus", 27], ["Numbers", 36], ["Deuteronomy", 34],
  ["Joshua", 24], ["Judges", 21], ["Ruth", 4], ["1 Samuel", 31], ["2 Samuel", 24],
  ["1 Kings", 22], ["2 Kings", 25], ["1 Chronicles", 29], ["2 Chronicles", 36], ["Ezra", 10],
  ["Nehemiah", 13], ["Esther", 10], ["Job", 42], ["Psalms", 150], ["Proverbs", 31],
  ["Ecclesiastes", 12], ["Song of Solomon", 8], ["Isaiah", 66], ["Jeremiah", 52],
  ["Lamentations", 5], ["Ezekiel", 48], ["Daniel", 12], ["Hosea", 14], ["Joel", 3],
  ["Amos", 9], ["Obadiah", 1], ["Jonah", 4], ["Micah", 7], ["Nahum", 3], ["Habakkuk", 3],
  ["Zephaniah", 3], ["Haggai", 2], ["Zechariah", 14], ["Malachi", 4],
].map(([name, chapters]): Book => ({ name: name as string, chapters: chapters as number, testament: "OT" }))
  .concat(
    ([
      ["Matthew", 28], ["Mark", 16], ["Luke", 24], ["John", 21], ["Acts", 28], ["Romans", 16],
      ["1 Corinthians", 16], ["2 Corinthians", 13], ["Galatians", 6], ["Ephesians", 6],
      ["Philippians", 4], ["Colossians", 4], ["1 Thessalonians", 5], ["2 Thessalonians", 3],
      ["1 Timothy", 6], ["2 Timothy", 4], ["Titus", 3], ["Philemon", 1], ["Hebrews", 13],
      ["James", 5], ["1 Peter", 5], ["2 Peter", 3], ["1 John", 5], ["2 John", 1], ["3 John", 1],
      ["Jude", 1], ["Revelation", 22],
    ] as Array<[string, number]>).map(([name, chapters]) => ({ name, chapters, testament: "NT" as const })),
  );

export const TRANSLATIONS = [
  { id: "kjv", label: "KJV" },
  { id: "web", label: "WEB" },
  { id: "bbe", label: "Basic English" },
] as const;

export type TranslationId = (typeof TRANSLATIONS)[number]["id"];

/** Curated so the verse of the day never depends on a network call. */
export const VERSE_POOL: Array<{ ref: string; text: string; theme: string }> = [
  { ref: "Psalm 34:18", text: "The Lord is near to the brokenhearted and saves the crushed in spirit.", theme: "grief" },
  { ref: "Isaiah 41:10", text: "Fear not, for I am with you; be not dismayed, for I am your God.", theme: "fear" },
  { ref: "Lamentations 3:22-23", text: "His mercies never come to an end; they are new every morning.", theme: "new mercy" },
  { ref: "Philippians 4:6-7", text: "Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.", theme: "anxiety" },
  { ref: "Romans 8:28", text: "And we know that for those who love God all things work together for good.", theme: "trust" },
  { ref: "Psalm 46:1", text: "God is our refuge and strength, a very present help in trouble.", theme: "refuge" },
  { ref: "Matthew 11:28", text: "Come to me, all who labor and are heavy laden, and I will give you rest.", theme: "rest" },
  { ref: "Joshua 1:9", text: "Be strong and courageous. Do not be frightened, for the Lord your God is with you wherever you go.", theme: "courage" },
  { ref: "2 Corinthians 12:9", text: "My grace is sufficient for you, for my power is made perfect in weakness.", theme: "weakness" },
  { ref: "Proverbs 3:5-6", text: "Trust in the Lord with all your heart, and do not lean on your own understanding.", theme: "guidance" },
  { ref: "Psalm 121:1-2", text: "I lift up my eyes to the hills. From where does my help come? My help comes from the Lord.", theme: "help" },
  { ref: "1 Peter 5:7", text: "Cast all your anxieties on him, because he cares for you.", theme: "care" },
  { ref: "Hebrews 11:1", text: "Now faith is the assurance of things hoped for, the conviction of things not seen.", theme: "faith" },
  { ref: "James 5:16", text: "Pray for one another, that you may be healed. The prayer of a righteous person has great power.", theme: "intercession" },
  { ref: "Psalm 30:5", text: "Weeping may tarry for the night, but joy comes with the morning.", theme: "hope" },
  { ref: "Isaiah 40:31", text: "But they who wait for the Lord shall renew their strength; they shall mount up with wings like eagles.", theme: "waiting" },
  { ref: "1 Thessalonians 5:16-18", text: "Rejoice always, pray without ceasing, give thanks in all circumstances.", theme: "gratitude" },
  { ref: "Psalm 103:2", text: "Bless the Lord, O my soul, and forget not all his benefits.", theme: "gratitude" },
  { ref: "Matthew 6:34", text: "Do not be anxious about tomorrow; today's trouble is enough for today.", theme: "today" },
  { ref: "John 16:33", text: "In the world you will have tribulation. But take heart; I have overcome the world.", theme: "endurance" },
  { ref: "Psalm 62:8", text: "Trust in him at all times, O people; pour out your heart before him.", theme: "honesty" },
  { ref: "Galatians 6:2", text: "Bear one another's burdens, and so fulfill the law of Christ.", theme: "community" },
];

/** Deterministic in UTC so server and client agree — no hydration mismatch. */
export function verseOfDay(now = new Date()) {
  const dayIndex = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86_400_000);
  return VERSE_POOL[dayIndex % VERSE_POOL.length]!;
}
