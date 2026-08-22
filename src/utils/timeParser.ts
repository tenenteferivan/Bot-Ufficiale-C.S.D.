export function parseDuration(input: string): number | null {
  if (!input) return null;

  const regex = /(\d+)\s*(y|d|h|m|min|s)/g;
  let matches;
  let totalMs = 0;
  let matchFound = false;

  while ((matches = regex.exec(input.toLowerCase())) !== null) {
    matchFound = true;
    const value = parseInt(matches[1], 10);
    const unit = matches[2];

    switch (unit) {
      case 'y':
        totalMs += value * 365 * 24 * 60 * 60 * 1000;
        break;
      case 'd':
        totalMs += value * 24 * 60 * 60 * 1000;
        break;
      case 'h':
        totalMs += value * 60 * 60 * 1000;
        break;
      case 'm':
      case 'min':
        totalMs += value * 60 * 1000;
        break;
      case 's':
        totalMs += value * 1000;
        break;
    }
  }

  return matchFound ? totalMs : null;
}
