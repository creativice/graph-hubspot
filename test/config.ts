import * as dotenv from 'dotenv';
import * as path from 'path';
import { IntegrationConfig } from '../src/config';

if (process.env.LOAD_ENV) {
  dotenv.config({
    path: path.join(__dirname, '../.env'),
  });
}
const DEFAULT_OAUTH_ACCESS_TOKEN = 'dummy-access_token';
const DEFAULT_API_URL = 'https://api.hubapi.com';
const DEFAULT_APP_ID = '12494002';

export function createIntegrationConfig(): IntegrationConfig {
  return {
    appId: process.env.APP_ID || DEFAULT_APP_ID,
    oauthAccessToken:
      process.env.OAUTH_ACCESS_TOKEN || DEFAULT_OAUTH_ACCESS_TOKEN,
    apiBaseUrl: process.env.API_BASE_URL || DEFAULT_API_URL,
  };
}
