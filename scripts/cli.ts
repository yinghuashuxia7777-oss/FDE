export interface SupportedCliOptions {
  dryRun?: boolean;
  limit?: boolean;
  input?: boolean;
  output?: boolean;
  skipExisting?: boolean;
}

export interface CliOptions {
  dryRun: boolean;
  limit?: number;
  input?: string;
  output?: string;
  skipExisting: boolean;
}

const optionNames = {
  '--dry-run': 'dryRun',
  '--limit': 'limit',
  '--input': 'input',
  '--output': 'output',
  '--skip-existing': 'skipExisting',
} as const;

export function parseCliArgs(
  args: readonly string[],
  supported: SupportedCliOptions,
): CliOptions {
  const result: CliOptions = { dryRun: false, skipExisting: false };
  const seen = new Set<string>();

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const option = optionNames[argument as keyof typeof optionNames];

    if (option === undefined) {
      throw new Error(`Unknown option: ${argument}`);
    }
    if (supported[option] !== true) {
      throw new Error(`Unsupported option: ${argument}`);
    }
    if (seen.has(argument)) {
      throw new Error(`Duplicate option: ${argument}`);
    }
    seen.add(argument);

    if (option === 'dryRun' || option === 'skipExisting') {
      result[option] = true;
      continue;
    }

    const value = args[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`${argument} requires a value`);
    }
    index += 1;

    if (option === 'limit') {
      const limit = Number(value);
      if (!Number.isSafeInteger(limit) || limit < 0) {
        throw new Error('--limit must be a non-negative integer');
      }
      result.limit = limit;
    } else {
      result[option] = value;
    }
  }

  return result;
}
