import dotenv from 'dotenv';
import * as path from 'path';
import { deployCommands } from './deploycommands';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

deployCommands().catch((error) => {
  console.error('Deploy dei comandi non riuscito:', error);
  process.exitCode = 1;
});
