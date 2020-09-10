import AuthService from './authentication';
import ItemsService from './items';
import jwt from 'jsonwebtoken';
import { sendInviteMail, sendPasswordResetMail } from '../mail';
import database from '../database';
import argon2 from 'argon2';
import { InvalidPayloadException, ForbiddenException } from '../exceptions';
import { Accountability, PrimaryKey, Item, AbstractServiceOptions } from '../types';
import Knex from 'knex';
import env from '../env';
import cache from '../cache';

export default class UsersService extends ItemsService {
	knex: Knex;
	accountability: Accountability | null;
	service: ItemsService;

	constructor(options?: AbstractServiceOptions) {
		super('directus_users', options);

		this.knex = options?.knex || database;
		this.accountability = options?.accountability || null;
		this.service = new ItemsService('directus_users', options);
	}

	update(data: Partial<Item>, keys: PrimaryKey[]): Promise<PrimaryKey[]>;
	update(data: Partial<Item>, key: PrimaryKey): Promise<PrimaryKey>;
	update(data: Partial<Item>[]): Promise<PrimaryKey[]>;
	async update(
		data: Partial<Item> | Partial<Item>[],
		key?: PrimaryKey | PrimaryKey[]
	): Promise<PrimaryKey | PrimaryKey[]> {
		/**
		 * @NOTE
		 * This is just an extra bit of hardcoded security. We don't want anybody to be able to disable 2fa through
		 * the regular /users endpoint. Period. You should only be able to manage the 2fa status through the /tfa endpoint.
		 */
		const payloads = Array.isArray(data) ? data : [data];

		for (const payload of payloads) {
			if (payload.hasOwnProperty('tfa_secret')) {
				throw new InvalidPayloadException(`You can't change the tfa_secret manually.`);
			}
		}

		if (cache) {
			await cache.clear();
		}

		return this.service.update(data, key as any);
	}

	async inviteUser(email: string, role: string) {
		await this.service.create({ email, role, status: 'invited' });

		const payload = { email, scope: 'invite' };
		const token = jwt.sign(payload, env.SECRET as string, { expiresIn: '7d' });
		const acceptURL = env.PUBLIC_URL + '/admin/accept-invite?token=' + token;

		await sendInviteMail(email, acceptURL);
	}

	async acceptInvite(token: string, password: string) {
		const { email, scope } = jwt.verify(token, env.SECRET as string) as {
			email: string;
			scope: string;
		};

		if (scope !== 'invite') throw new ForbiddenException();

		const user = await this.knex
			.select('id', 'status')
			.from('directus_users')
			.where({ email })
			.first();

		if (!user || user.status !== 'invited') {
			throw new InvalidPayloadException(`Email address ${email} hasn't been invited.`);
		}

		const passwordHashed = await argon2.hash(password);

		await this.knex('directus_users')
			.update({ password: passwordHashed, status: 'active' })
			.where({ id: user.id });

		if (cache) {
			await cache.clear();
		}
	}

	async requestPasswordReset(email: string) {
		const user = await this.knex.select('id').from('directus_users').where({ email }).first();
		if (!user) throw new ForbiddenException();

		const payload = { email, scope: 'password-reset' };
		const token = jwt.sign(payload, env.SECRET as string, { expiresIn: '7d' });
		const acceptURL = env.PUBLIC_URL + '/admin/reset-password?token=' + token;

		await sendPasswordResetMail(email, acceptURL);
	}

	async resetPassword(token: string, password: string) {
		const { email, scope } = jwt.verify(token, env.SECRET as string) as {
			email: string;
			scope: string;
		};

		if (scope !== 'password-reset') throw new ForbiddenException();

		const user = await this.knex
			.select('id', 'status')
			.from('directus_users')
			.where({ email })
			.first();

		if (!user || user.status !== 'active') {
			throw new ForbiddenException();
		}

		const passwordHashed = await argon2.hash(password);

		await this.knex('directus_users')
			.update({ password: passwordHashed, status: 'active' })
			.where({ id: user.id });

		if (cache) {
			await cache.clear();
		}
	}

	async enableTFA(pk: string) {
		const user = await this.knex
			.select('tfa_secret')
			.from('directus_users')
			.where({ id: pk })
			.first();

		if (user?.tfa_secret !== null) {
			throw new InvalidPayloadException('TFA Secret is already set for this user');
		}

		const authService = new AuthService();
		const secret = authService.generateTFASecret();

		await this.knex('directus_users').update({ tfa_secret: secret }).where({ id: pk });

		return {
			secret,
			url: await authService.generateOTPAuthURL(pk, secret),
		};
	}

	async disableTFA(pk: string) {
		await this.knex('directus_users').update({ tfa_secret: null }).where({ id: pk });
	}
}
