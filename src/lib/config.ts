import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

export interface Config {
  litellm: {
    base_url: string;
    timeout: number;
  };
  proxy: {
    forward_headers: boolean;
    forward_response_headers: boolean;
  };
  server: {
    port: number;
    host: string;
  };
}

let configCache: Config | null = null;

export function loadConfig(): Config {
  if (configCache) {
    return configCache;
  }

  const configPath = path.join(process.cwd(), 'config', 'config.yaml');

  try {
    const fileContents = fs.readFileSync(configPath, 'utf8');
    configCache = yaml.load(fileContents) as Config;
    return configCache;
  } catch (error) {
    throw new Error(
      `Failed to load configuration from ${configPath}: ${error}`
    );
  }
}
