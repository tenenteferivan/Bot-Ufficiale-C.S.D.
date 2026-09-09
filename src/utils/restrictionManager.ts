import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(
  process.cwd(),
  'data'
);

const RESTRICTIONS_FILE = path.join(
  DATA_DIR,
  'restrictions.json'
);

export interface UserRestriction {
  userId: string;
  userTag: string;
  motivo: string;
  durata: string;
  expiresAt: number;
  operatorId: string;
  operatorTag: string;
  createdAt: number;
}

interface RestrictionsData {
  restrictions: UserRestriction[];
}

/*
 * ============================================================
 * UTILITÀ
 * ============================================================
 */

function ensureDataDirectory(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {
      recursive: true,
    });
  }
}

/*
 * ============================================================
 * CARICAMENTO
 * ============================================================
 */

export function loadRestrictions(): RestrictionsData {
  ensureDataDirectory();

  if (!fs.existsSync(RESTRICTIONS_FILE)) {
    const emptyData = {
      restrictions: [],
    };
    saveRestrictions(emptyData);
    return emptyData;
  }

  try {
    const content = fs.readFileSync(
      RESTRICTIONS_FILE,
      'utf8'
    );

    const data = JSON.parse(content);

    if (
      !data ||
      !Array.isArray(data.restrictions)
    ) {
      throw new Error(
        'Formato di restrictions.json non valido.'
      );
    }

    const restrictions = data.restrictions.map((restriction: unknown): UserRestriction => {
          if (
            !restriction ||
            typeof restriction !== 'object'
          ) {
            throw new Error('Una restrizione non è valida.');
          }

          const record =
            restriction as Record<string, unknown>;

          if (!(
            typeof record.userId === 'string' &&
            /^\d{17,20}$/.test(record.userId) &&
            typeof record.userTag === 'string' &&
            typeof record.motivo === 'string' &&
            typeof record.durata === 'string' &&
            typeof record.expiresAt === 'number' &&
            Number.isFinite(record.expiresAt) &&
            typeof record.operatorId === 'string' &&
            typeof record.operatorTag === 'string' &&
            typeof record.createdAt === 'number' &&
            Number.isFinite(record.createdAt)
          )) {
            throw new Error('Una restrizione non è valida.');
          }
          return record as unknown as UserRestriction;
        });

    return { restrictions };
  } catch (error) {
    console.error(
      '[RESTRICTION] Impossibile leggere restrictions.json:',
      error
    );

    throw new Error(
      'Impossibile leggere il database delle restrizioni.'
    );
  }
}

/*
 * ============================================================
 * SALVATAGGIO
 * ============================================================
 */

export function saveRestrictions(
  data: RestrictionsData
): void {
  ensureDataDirectory();

  const tempFile =
    `${RESTRICTIONS_FILE}.tmp`;

  fs.writeFileSync(
    tempFile,
    JSON.stringify(data, null, 2),
    'utf8'
  );

  fs.renameSync(
    tempFile,
    RESTRICTIONS_FILE
  );
}

/*
 * ============================================================
 * CERCA RESTRIZIONE
 * ============================================================
 */

export function getRestriction(
  userId: string
): UserRestriction | null {
  const data = loadRestrictions();

  const restriction =
    data.restrictions.find(
      (entry) =>
        entry.userId === userId
    );

  if (!restriction) {
    return null;
  }

  /*
   * La restrizione è scaduta.
   *
   * La rimuoviamo automaticamente dal database.
   */

  if (
    restriction.expiresAt <=
    Date.now()
  ) {
    data.restrictions =
      data.restrictions.filter(
        (entry) =>
          entry.userId !== userId
      );

    saveRestrictions(data);

    return null;
  }

  return restriction;
}

/*
 * ============================================================
 * AGGIUNGI / SOSTITUISCI RESTRIZIONE
 * ============================================================
 */

export function setRestriction(
  restriction: UserRestriction
): void {
  const data =
    loadRestrictions();

  data.restrictions =
    data.restrictions.filter(
      (entry) =>
        entry.userId !==
        restriction.userId
    );

  data.restrictions.push(
    restriction
  );

  saveRestrictions(data);
}

/*
 * ============================================================
 * RIMUOVI RESTRIZIONE
 * ============================================================
 */

export function removeRestriction(
  userId: string
): boolean {
  const data =
    loadRestrictions();

  const originalLength =
    data.restrictions.length;

  data.restrictions =
    data.restrictions.filter(
      (entry) =>
        entry.userId !== userId
    );

  if (
    data.restrictions.length ===
    originalLength
  ) {
    return false;
  }

  saveRestrictions(data);

  return true;
}

/*
 * ============================================================
 * DURATA
 * ============================================================
 */

export interface ParsedRestrictionDuration {
  value: number;
  unit: 'min' | 'd' | 'm' | 'y';
  expiresAt: number;
}

export function parseRestrictionDuration(
  input: string
): ParsedRestrictionDuration | null {
  const normalized =
    input
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

  const match =
    normalized.match(
      /^(\d+)\s*(min|mins|minuto|minutos|m|d|day|days|giorno|giorni|month|months|mese|mesi|y|year|years|anno|anni)$/
    );

  if (!match) {
    return null;
  }

  const value =
    Number.parseInt(
      match[1],
      10
    );

  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    return null;
  }

  const unitInput =
    match[2];

  let unit:
    | 'min'
    | 'd'
    | 'm'
    | 'y';

  if (
    unitInput === 'min' ||
    unitInput === 'mins' ||
    unitInput === 'minuto' ||
    unitInput === 'minutos'
  ) {
    unit = 'min';
  } else if (
    unitInput === 'd' ||
    unitInput === 'day' ||
    unitInput === 'days' ||
    unitInput === 'giorno' ||
    unitInput === 'giorni'
  ) {
    unit = 'd';
  } else if (
    unitInput === 'm' ||
    unitInput === 'month' ||
    unitInput === 'months' ||
    unitInput === 'mese' ||
    unitInput === 'mesi'
  ) {
    unit = 'm';
  } else {
    unit = 'y';
  }

  const now =
    new Date();

  /*
   * MINUTI
   */

  if (unit === 'min') {
    return {
      value,
      unit,
      expiresAt:
        now.getTime() +
        value * 60 * 1000,
    };
  }

  /*
   * GIORNI
   */

  if (unit === 'd') {
    return {
      value,
      unit,
      expiresAt:
        now.getTime() +
        value *
          24 *
          60 *
          60 *
          1000,
    };
  }

  /*
   * MESI / ANNI
   */

  const expirationDate =
    new Date(now);

  if (unit === 'm') {
    expirationDate.setMonth(
      expirationDate.getMonth() +
        value
    );
  } else {
    expirationDate.setFullYear(
      expirationDate.getFullYear() +
        value
    );
  }

  return {
    value,
    unit,
    expiresAt:
      expirationDate.getTime(),
  };
}

/*
 * ============================================================
 * FORMAT DURATA
 * ============================================================
 */

export function formatRestrictionDuration(
  parsed: ParsedRestrictionDuration
): string {
  if (parsed.unit === 'min') {
    return `${parsed.value} minuto${parsed.value === 1 ? '' : 'i'}`;
  }

  if (parsed.unit === 'd') {
    return `${parsed.value} giorno${parsed.value === 1 ? '' : 'i'}`;
  }

  if (parsed.unit === 'm') {
    return `${parsed.value} mese${parsed.value === 1 ? '' : 'i'}`;
  }

  return `${parsed.value} anno${parsed.value === 1 ? '' : 'i'}`;
}