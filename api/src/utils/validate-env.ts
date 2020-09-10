import logger from '../logger';
import env from '../env';

export function validateEnv(requiredKeys: string[]) {
	if (env.DB_CLIENT && env.DB_CLIENT === 'sqlite3') {
		requiredKeys.push('DB_FILENAME');
	} else {
		if (env.DB_CLIENT === 'pg') {
			requiredKeys.push('DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USER');
		} else {
			requiredKeys.push('DB_HOST', 'DB_PORT', 'DB_DATABASE', 'DB_USER', 'DB_PASSWORD');
		}
	}

	for (const requiredKey of requiredKeys) {
		if (env.hasOwnProperty(requiredKey) === false) {
			logger.fatal(`Environment is missing the ${requiredKey} key.`);
			process.exit(1);
		}
	}
}
