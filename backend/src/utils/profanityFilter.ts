/**
 * Filter zabranjenih riječi za komentare – BCS (bosanski/hrvatski/srpski).
 * Normalizuje dijakritike (č→c, š→s, ž→z, đ→d, ć→c) da bi uhvatio
 * i komentare pisane bez dijakritičkih znakova.
 */

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[čć]/g, "c")
    .replace(/š/g, "s")
    .replace(/ž/g, "z")
    .replace(/đ/g, "d")
    .replace(/[^\w\s]/g, " "); // ukloni interpunkciju
}

// Lista zabranjenih korijena/fraza (normalizovane – bez dijakritika)
const FORBIDDEN: string[] = [
  // Seksualni vulgarizmi
  "jebo", "jebe", "jebi", "jebem", "jebete", "jebiga", "jebote", "jebac",
  "picka", "picko", "picke", "picku",
  "kurac", "kurca", "kurcu", "kurcina",
  "kurva", "kurve", "kurvetina", "kurvina",
  "pizda", "pizdu", "pizdun",
  "supak", "supce", "supcina",
  "nabijem", "nabij",
  "drlja",   // drolja bez dijakritika

  // Tjelesne izlučevine (kao uvrede)
  "govno", "govnar", "govnara",
  "sranje", "usrao",

  // Teške uvrede / ponižavanje
  "debil", "debilu", "debilka",
  "kreten", "kretenu", "kretenin",
  "retard",
  "spastin",
  "idijot",
  "tupan",
  "glupan",
  "sljuka",
  "peder", "pederc", "pedercina",
  "lezba",
  "drolja",

  // Govor mržnje – etničke i nacionalne uvrede
  "balija", "balije",
  "siptar", "siptara",
  "ustasko", "ustasa",
  "cetnik", "cetnici",
  "ciganin", "ciganka", "cigane", "cigo",

  // Prijetnje i poticanje na nasilje
  "ubit cu",
  "zakla cu",
  "smrt",        // u kontekstu prijetnji – može biti false positive, ali vrijedi filtrirati
  "ubij se",
  "ubite se",
  "obesite se",

  // Vulgarizmi prema majci/rodbini
  "materina",
  "jebem ti",
  "mamu ti",
  "oca ti",
  "boga ti",    // blasfemija
];

export function containsProfanity(text: string): boolean {
  const normalized = normalize(text);
  return FORBIDDEN.some((word) => normalized.includes(word));
}
