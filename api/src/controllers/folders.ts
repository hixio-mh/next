import express from 'express';
import asyncHandler from 'express-async-handler';
import FoldersService from '../services/folders';
import MetaService from '../services/meta';

const router = express.Router();

router.post(
	'/',
	asyncHandler(async (req, res, next) => {
		const service = new FoldersService({ accountability: req.accountability });
		const primaryKey = await service.create(req.body);
		const record = await service.readByKey(primaryKey, req.sanitizedQuery);

		res.locals.payload = { data: record || null };
		return next();
	})
);

router.get(
	'/',
	asyncHandler(async (req, res, next) => {
		const service = new FoldersService({ accountability: req.accountability });
		const metaService = new MetaService({ accountability: req.accountability });

		const records = await service.readByQuery(req.sanitizedQuery);
		const meta = await metaService.getMetaForQuery('directus_files', req.sanitizedQuery);

		res.locals.payload = { data: records || null, meta };
		return next();
	})
);

router.get(
	'/:pk',
	asyncHandler(async (req, res, next) => {
		const service = new FoldersService({ accountability: req.accountability });
		const primaryKey = req.params.pk.includes(',') ? req.params.pk.split(',') : req.params.pk;
		const record = await service.readByKey(primaryKey as any, req.sanitizedQuery);

		res.locals.payload = { data: record || null };
		return next();
	})
);

router.patch(
	'/:pk',
	asyncHandler(async (req, res, next) => {
		const service = new FoldersService({ accountability: req.accountability });
		const pk = req.params.pk.includes(',') ? req.params.pk.split(',') : req.params.pk;
		const primaryKey = await service.update(req.body, pk as any);
		const record = await service.readByKey(primaryKey, req.sanitizedQuery);

		res.locals.payload = { data: record || null };
		return next();
	})
);

router.delete(
	'/:pk',
	asyncHandler(async (req, res, next) => {
		const service = new FoldersService({ accountability: req.accountability });
		const primaryKey = req.params.pk.includes(',') ? req.params.pk.split(',') : req.params.pk;
		await service.delete(primaryKey as any);
		return next();
	})
);

export default router;
