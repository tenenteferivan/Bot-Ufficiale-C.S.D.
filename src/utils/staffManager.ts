import fs from 'fs';
import path from 'path';

export interface StaffData {
  operatori: string[];
  dirigenza: string[];
}

const DATA_DIR =
  path.resolve(__dirname, '../../data');

const FILE_PATH =
  path.join(DATA_DIR, 'staff.json');

function ensureDataDirectory(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, {
      recursive: true,
    });
  }
}

function loadStaff(): StaffData {
  ensureDataDirectory();

  if (!fs.existsSync(FILE_PATH)) {
    const data: StaffData = {
      operatori: [],
      dirigenza: [],
    };

    fs.writeFileSync(
      FILE_PATH,
      JSON.stringify(data, null, 2),
      'utf8'
    );

    return data;
  }

  const raw =
    fs.readFileSync(
      FILE_PATH,
      'utf8'
    ).trim();

  if (!raw) {
    return {
      operatori: [],
      dirigenza: [],
    };
  }

  return JSON.parse(raw) as StaffData;
}

function saveStaff(
  data: StaffData
): void {
  ensureDataDirectory();

  fs.writeFileSync(
    FILE_PATH,
    JSON.stringify(data, null, 2),
    'utf8'
  );
}

export function isOperatore(
  userId: string
): boolean {
  const data = loadStaff();

  return data.operatori.includes(
    userId
  );
}

export function isDirigenza(
  userId: string
): boolean {
  const data = loadStaff();

  return data.dirigenza.includes(
    userId
  );
}

export function addOperatore(
  userId: string
): boolean {
  const data = loadStaff();

  if (
    data.operatori.includes(userId)
  ) {
    return false;
  }

  data.operatori.push(userId);

  saveStaff(data);

  return true;
}

export function removeOperatore(
  userId: string
): boolean {
  const data = loadStaff();

  const index =
    data.operatori.indexOf(userId);

  if (index === -1) {
    return false;
  }

  data.operatori.splice(
    index,
    1
  );

  saveStaff(data);

  return true;
}

export function addDirigenza(
  userId: string
): boolean {
  const data = loadStaff();

  if (
    data.dirigenza.includes(userId)
  ) {
    return false;
  }

  data.dirigenza.push(userId);

  saveStaff(data);

  return true;
}

export function removeDirigenza(
  userId: string
): boolean {
  const data = loadStaff();

  const index =
    data.dirigenza.indexOf(userId);

  if (index === -1) {
    return false;
  }

  data.dirigenza.splice(
    index,
    1
  );

  saveStaff(data);

  return true;
}