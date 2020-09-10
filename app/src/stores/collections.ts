import { createStore } from 'pinia';
import api from '@/api';
import { Collection, CollectionRaw } from '@/types';
import i18n from '@/lang/';
import { notEmpty } from '@/utils/is-empty/';
import VueI18n from 'vue-i18n';
import formatTitle from '@directus/format-title';
import notify from '@/utils/notify';

export const useCollectionsStore = createStore({
	id: 'collectionsStore',
	state: () => ({
		collections: [] as Collection[],
	}),
	getters: {
		visibleCollections: (state) => {
			return state.collections
				.filter(({ collection }) => collection.startsWith('directus_') === false)
				.filter((collection) => collection.meta?.hidden !== true);
		},
	},
	actions: {
		async hydrate() {
			const response = await api.get(`/collections`);

			const collections: CollectionRaw[] = response.data.data;

			this.state.collections = collections.map((collection: CollectionRaw) => {
				let name: string | VueI18n.TranslateResult;
				const icon = collection.meta?.icon || 'label';

				if (collection.meta && notEmpty(collection.meta.translation)) {
					for (let i = 0; i < collection.meta.translation.length; i++) {
						const { locale, translation } = collection.meta.translation[i];

						i18n.mergeLocaleMessage(locale, {
							collection_names: {
								[collection.collection]: translation,
							},
						});
					}

					name = i18n.t(`collection_names.${collection.collection}`);
				} else {
					name = formatTitle(collection.collection);
				}

				return {
					...collection,
					name,
					icon,
				};
			});
		},
		async dehydrate() {
			this.reset();
		},
		async updateCollection(collection: string, updates: Partial<Collection>) {
			try {
				await api.patch(`/collections/${collection}`, updates);
				await this.hydrate();
				notify({
					type: 'success',
					title: i18n.t('update_collection_success'),
					text: collection,
				});
			} catch (error) {
				notify({
					type: 'error',
					title: i18n.t('update_collection_failed'),
					text: collection,
				});
				throw error;
			}
		},
		async deleteCollection(collection: string) {
			try {
				await api.delete(`/collections/${collection}`);
				await this.hydrate();
				notify({
					type: 'success',
					title: i18n.t('delete_collection_success'),
					text: collection,
				});
			} catch (error) {
				notify({
					type: 'error',
					title: i18n.t('delete_collection_failed'),
					text: collection,
				});
				throw error;
			}
		},
		getCollection(collectionKey: string): Collection | null {
			return this.state.collections.find((collection) => collection.collection === collectionKey) || null;
		},
	},
});
