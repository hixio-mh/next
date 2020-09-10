import ItemsService from './items';
import storage from '../storage';
import sharp from 'sharp';
import { parse as parseICC } from 'icc';
import parseEXIF from 'exif-reader';
import parseIPTC from '../utils/parse-iptc';
import path from 'path';
import { AbstractServiceOptions, File, PrimaryKey } from '../types';
import { clone } from 'lodash';
import cache from '../cache';

export default class FilesService extends ItemsService {
	constructor(options?: AbstractServiceOptions) {
		super('directus_files', options);
	}

	async upload(
		stream: NodeJS.ReadableStream,
		data: Partial<File> & { filename_download: string; storage: string },
		primaryKey?: PrimaryKey
	) {
		const payload = clone(data);

		if (primaryKey !== undefined) {
			// If the file you're uploading already exists, we'll consider this upload a replace. In that case, we'll
			// delete the previously saved file and thumbnails to ensure they're generated fresh
			const disk = storage.disk(payload.storage);

			for await (const file of disk.flatList(String(primaryKey))) {
				await disk.delete(file.path);
			}

			await this.update(payload, primaryKey);
		} else {
			primaryKey = await this.create(payload);
		}

		payload.filename_disk = primaryKey + path.extname(payload.filename_download);

		if (!payload.type) {
			payload.type = 'application/octet-stream';
		}

		if (['image/jpeg', 'image/png', 'image/webp'].includes(payload.type)) {
			const pipeline = sharp();

			pipeline.metadata().then((meta) => {
				payload.width = meta.width;
				payload.height = meta.height;
				payload.filesize = meta.size;
				payload.metadata = {};

				if (meta.icc) {
					payload.metadata.icc = parseICC(meta.icc);
				}

				if (meta.exif) {
					payload.metadata.exif = parseEXIF(meta.exif);
				}

				if (meta.iptc) {
					payload.metadata.iptc = parseIPTC(meta.iptc);

					payload.title = payload.title || payload.metadata.iptc.headline;
					payload.description = payload.description || payload.metadata.iptc.caption;
				}
			});

			await storage.disk(data.storage).put(payload.filename_disk, stream.pipe(pipeline));
		} else {
			await storage.disk(data.storage).put(payload.filename_disk, stream);
			const { size } = await storage.disk(data.storage).getStat(payload.filename_disk);
			payload.filesize = size;
		}

		// We do this in a service without accountability. Even if you don't have update permissions to the file,
		// we still want to be able to set the extracted values from the file on create
		const sudoService = new ItemsService('directus_files');
		await sudoService.update(payload, primaryKey);

		if (cache) {
			await cache.clear();
		}

		return primaryKey;
	}

	delete(key: PrimaryKey): Promise<PrimaryKey>;
	delete(keys: PrimaryKey[]): Promise<PrimaryKey[]>;
	async delete(key: PrimaryKey | PrimaryKey[]): Promise<PrimaryKey | PrimaryKey[]> {
		const keys = Array.isArray(key) ? key : [key];
		const files = await super.readByKey(keys, { fields: ['id', 'storage'] });

		for (const file of files) {
			const disk = storage.disk(file.storage);

			// Delete file + thumbnails
			for await (const { path } of disk.flatList(file.id)) {
				await disk.delete(path);
			}
		}

		await super.delete(keys);

		if (cache) {
			await cache.clear();
		}

		return key;
	}
}
