import * as path from 'path';

// This resolves to botcssd both from src (tsx) and from dist (node).
export const projectRoot = path.resolve(__dirname, '../..');
export const dataDirectory = path.join(projectRoot, 'data');
export const configDirectory = path.join(projectRoot, 'config');
