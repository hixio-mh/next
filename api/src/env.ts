/**
 * @NOTE
 * See example.env for all possible keys
 */

import dotenv from 'dotenv';
import { clone } from 'lodash';

dotenv.config();

const defaults: Record<string, any> = {
	PORT: 41201,
	PUBLIC_URL: 'http://localhost:41201',

	STORAGE_LOCATIONS: 'local',
	STORAGE_LOCAL_PUBLIC_URL: 'http://localhost:41201/uploads',
	STORAGE_LOCAL_DRIVER: 'local',
	STORAGE_LOCAL_ROOT: './uploads',

	RATE_LIMITER_ENABLED: true,
	RATE_LIMITER_POINTS: 25,
	RATE_LIMITER_DURATION: 1,
	RATE_LIMITER_STORE: 'memory',

	ACCESS_TOKEN_TTL: '15m',
	REFRESH_TOKEN_TTL: '7d',
	REFRESH_TOKEN_COOKIE_SECURE: false,
	REFRESH_TOKEN_COOKIE_SAME_SITE: 'lax',

	CORS_ENABLED: false,

	CACHE_ENABLED: false,
	CACHE_STORE: false,
	CACHE_TTL: '30m',
	CACHE_NAMESPACE: 'system-cache',

	OAUTH_PROVIDERS: '',

	EXTENSIONS_PATH: './extensions',

	EMAIL_FROM: 'no-reply@directus.io',
	EMAIL_TRANSPORT: 'sendmail',
	EMAIL_SENDMAIL_NEW_LINE: 'unix',
	EMAIL_SENDMAIL_PATH: '/usr/sbin/sendmail',
};

let env: Record<string, any> = {
	...defaults,
	...process.env,
};

env = processValues(env);

export default env;

function processValues(env: Record<string, any>) {
	env = clone(env);

	for (const [key, value] of Object.entries(env)) {
		if (value === 'true') env[key] = true;
		if (value === 'false') env[key] = false;
		if (value === 'null') env[key] = null;
	}

	return env;
}
