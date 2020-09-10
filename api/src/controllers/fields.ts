import { Router } from 'express';
import asyncHandler from 'express-async-handler';
import FieldsService from '../services/fields';
import validateCollection from '../middleware/collection-exists';
import { schemaInspector } from '../database';
import { InvalidPayloadException, ForbiddenException } from '../exceptions';
import Joi from 'joi';
import { Field } from '../types/field';
import { types } from '../types';

const router = Router();

router.get(
	'/',
	asyncHandler(async (req, res, next) => {
		const service = new FieldsService({ accountability: req.accountability });
		const fields = await service.readAll();

		res.locals.payload = { data: fields || null };
		return next();
	}),
);

router.get(
	'/:collection',
	validateCollection,
	asyncHandler(async (req, res, next) => {
		const service = new FieldsService({ accountability: req.accountability });
		const fields = await service.readAll(req.params.collection);

		res.locals.payload = { data: fields || null };
		return next();
	}),
);

router.get(
	'/:collection/:field',
	validateCollection,
	asyncHandler(async (req, res, next) => {
		const service = new FieldsService({ accountability: req.accountability });

		const exists = await schemaInspector.hasColumn(req.params.collection, req.params.field);
		if (exists === false) throw new ForbiddenException();

		const field = await service.readOne(req.params.collection, req.params.field);

		res.locals.payload = { data: field || null };
		return next();
	}),
);

const newFieldSchema = Joi.object({
	collection: Joi.string().optional(),
	field: Joi.string().required(),
	type: Joi.string().valid(...types),
	schema: Joi.object({
		comment: Joi.string().allow(null),
		default_value: Joi.any(),
		max_length: [Joi.number(), Joi.string()],
		is_nullable: Joi.bool(),
	}).unknown(),
	/** @todo base this on default validation */
	meta: Joi.any(),
});

router.post(
	'/:collection',
	validateCollection,
	asyncHandler(async (req, res, next) => {
		const service = new FieldsService({ accountability: req.accountability });

		const { error } = newFieldSchema.validate(req.body);

		if (error) {
			throw new InvalidPayloadException(error.message);
		}

		const field: Partial<Field> & { field: string; type: typeof types[number] } = req.body;

		await service.createField(req.params.collection, field);

		const createdField = await service.readOne(req.params.collection, field.field);

		res.locals.payload = { data: createdField || null };
		return next();
	}),
);

router.patch(
	'/:collection',
	validateCollection,
	asyncHandler(async (req, res, next) => {
		const service = new FieldsService({ accountability: req.accountability });

		if (Array.isArray(req.body) === false)
			throw new InvalidPayloadException('Submitted body has to be an array.');

		let results: any = [];

		for (const field of req.body) {
			await service.updateField(req.params.collection, field);

			const updatedField = await service.readOne(req.params.collection, field.field);

			results.push(updatedField);
		}

		res.locals.payload = { data: results || null };
		return next();
	}),
);

router.patch(
	'/:collection/:field',
	validateCollection,
	// @todo: validate field
	asyncHandler(async (req, res, next) => {
		const service = new FieldsService({ accountability: req.accountability });
		const fieldData: Partial<Field> & { field: string; type: typeof types[number] } = req.body;

		if (!fieldData.field) fieldData.field = req.params.field;

		await service.updateField(req.params.collection, fieldData);

		const updatedField = await service.readOne(req.params.collection, req.params.field);

		res.locals.payload = { data: updatedField || null };
		return next();
	}),
);

router.delete(
	'/:collection/:field',
	validateCollection,
	asyncHandler(async (req, res, next) => {
		const service = new FieldsService({ accountability: req.accountability });
		await service.deleteField(req.params.collection, req.params.field);
		return next();
	}),
);

export default router;
