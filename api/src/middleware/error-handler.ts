import { ErrorRequestHandler } from 'express';
import { BaseException } from '../exceptions';
import logger from '../logger';
import env from '../env';

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
	let payload: any = {
		errors: [],
	};

	const errors = Array.isArray(err) ? err : [err];

	if (errors.some((err) => err instanceof BaseException === false)) {
		res.status(500);
	} else {
		let status = errors[0].status;

		for (const err of errors) {
			if (status !== err.status) {
				// If there's multiple different status codes in the errors, use 500
				status = 500;
				break;
			}
		}

		res.status(status);
	}

	for (const err of errors) {
		if (err instanceof BaseException) {
			if (env.NODE_ENV === 'development') {
				err.extensions = {
					...(err.extensions || {}),
					stack: err.stack,
				};
			}

			logger.debug(err);

			res.status(err.status);

			payload.errors.push({
				message: err.message,
				extensions: {
					...err.extensions,
					code: err.code,
				},
			});
		} else {
			logger.error(err);

			res.status(500);

			payload = {
				errors: [
					{
						message: err.message,
						extensions: {
							code: 'INTERNAL_SERVER_ERROR',
						},
					},
				],
			};
		}
	}

	return res.json(payload);
};

export default errorHandler;
