/**
 * This is a "local store" meant to make the field data shareable between the different panes
 * and components within the field setup modal flow.
 *
 * It's reset every time the modal opens and shouldn't be used outside of the field-detail flow.
 */

import { useFieldsStore, useRelationsStore } from '@/stores/';
import { reactive, watch, computed, ComputedRef } from '@vue/composition-api';
import { clone } from 'lodash';
import { getInterfaces } from '@/interfaces';
import { getDisplays } from '@/displays';
import { InterfaceConfig } from '@/interfaces/types';
import { DisplayConfig } from '@/displays/types';

const fieldsStore = useFieldsStore();
const relationsStore = useRelationsStore();

let state: any;
let availableInterfaces: ComputedRef<InterfaceConfig[]>;
let availableDisplays: ComputedRef<DisplayConfig[]>;

export { state, availableInterfaces, availableDisplays, initLocalStore, clearLocalStore };

function initLocalStore(
	collection: string,
	field: string,
	type: 'standard' | 'file' | 'files' | 'm2o' | 'o2m' | 'm2m' | 'presentation'
) {
	const interfaces = getInterfaces();
	const displays = getDisplays();

	state = reactive<any>({
		fieldData: {
			field: '',
			type: '',
			schema: {
				default_value: undefined,
				max_length: undefined,
				is_nullable: true,
			},
			meta: {
				hidden: false,
				interface: undefined,
				options: undefined,
				display: undefined,
				display_options: undefined,
				readonly: false,
				special: undefined,
				note: undefined,
			},
		},
		relations: [],
		newFields: [],
	});

	availableInterfaces = computed<InterfaceConfig[]>(() => {
		return interfaces.value
			.filter((inter) => {
				// Filter out all system interfaces
				if (inter.system !== undefined && inter.system === true) return false;

				const matchesType = inter.types.includes(state.fieldData?.type || 'alias');
				let matchesRelation = false;

				if (type === 'standard' || type === 'presentation') {
					matchesRelation = inter.relationship === null || inter.relationship === undefined;
				} else if (type === 'file') {
					matchesRelation = inter.relationship === 'm2o';
				} else if (type === 'files') {
					matchesRelation = inter.relationship === 'm2m';
				} else {
					matchesRelation = inter.relationship === type;
				}

				return matchesType && matchesRelation;
			})
			.sort((a, b) => (a.name > b.name ? 1 : -1));
	});

	availableDisplays = computed(() =>
		displays.value.filter((display) => {
			const matchesType = display.types.includes(state.fieldData?.type || 'alias');
			const matchesRelation = true;
			return matchesType && matchesRelation;
		})
	);

	const isExisting = field !== '+';

	if (isExisting) {
		const existingField = clone(fieldsStore.getField(collection, field));

		state.fieldData.field = existingField.field;
		state.fieldData.type = existingField.type;
		state.fieldData.schema = existingField.schema;
		state.fieldData.meta = existingField.meta;

		state.relations = relationsStore.getRelationsForField(collection, field);
	} else {
		watch(
			() => availableInterfaces.value,
			() => {
				if (availableInterfaces.value.length === 1) {
					state.fieldData.meta.interface = availableInterfaces.value[0].id;
				}
			}
		);

		watch(
			() => availableDisplays.value,
			() => {
				if (availableDisplays.value.length === 1) {
					state.fieldData.meta.display = availableDisplays.value[0].id;
				}
			}
		);
	}

	if (type === 'file') {
		if (!isExisting) {
			state.fieldData.type = 'uuid';

			state.relations = [
				{
					many_collection: collection,
					many_field: '',
					many_primary: fieldsStore.getPrimaryKeyFieldForCollection(collection)?.field,
					one_collection: 'directus_files',
					one_primary: fieldsStore.getPrimaryKeyFieldForCollection('directus_files')?.field,
				},
			];
		}

		watch(
			() => state.fieldData.field,
			() => {
				state.relations[0].many_field = state.fieldData.field;
			}
		);
	}

	if (type === 'm2o') {
		if (!isExisting) {
			state.relations = [
				{
					many_collection: collection,
					many_field: '',
					many_primary: fieldsStore.getPrimaryKeyFieldForCollection(collection)?.field,
					one_collection: '',
					one_primary: '',
				},
			];
		}

		watch(
			() => state.fieldData.field,
			() => {
				state.relations[0].many_field = state.fieldData.field;
			}
		);

		// Make sure to keep the current m2o field type in sync with the primary key of the
		// selected related collection
		watch(
			() => state.relations[0].one_collection,
			() => {
				const field = fieldsStore.getPrimaryKeyFieldForCollection(state.relations[0].one_collection);
				state.fieldData.type = field.type;
				state.relations[0].one_primary = field.field;
			}
		);

		// Sync the "auto generate related o2m"
		watch(
			() => state.relations[0].one_collection,
			() => {
				if (state.newFields.length > 0) {
					state.newFields[0].collection = state.relations[0].one_collection;
				}
			}
		);
	}

	if (type === 'o2m') {
		delete state.fieldData.schema;
		delete state.fieldData.type;

		if (!isExisting) {
			state.fieldData.meta.special = 'o2m';

			state.relations = [
				{
					many_collection: '',
					many_field: '',
					many_primary: '',

					one_collection: collection,
					one_field: state.fieldData.field,
					one_primary: fieldsStore.getPrimaryKeyFieldForCollection(collection)?.field,
				},
			];
		}

		watch(
			() => state.fieldData.field,
			() => {
				state.relations[0].one_field = state.fieldData.field;
			}
		);

		watch(
			() => state.relations[0].many_collection,
			() => {
				state.relations[0].many_primary = fieldsStore.getPrimaryKeyFieldForCollection(
					state.relations[0].many_collection
				).field;
			}
		);
	}

	if (type === 'm2m' || type === 'files') {
		delete state.fieldData.schema;
		delete state.fieldData.type;

		if (!isExisting) {
			state.fieldData.meta.special = 'm2m';

			state.relations = [
				{
					many_collection: '',
					many_field: '',
					many_primary: '',
					one_collection: collection,
					one_field: state.fieldData.field,
					one_primary: fieldsStore.getPrimaryKeyFieldForCollection(collection)?.field,
				},
				{
					many_collection: '',
					many_field: '',
					many_primary: '',
					one_collection: type === 'files' ? 'directus_files' : '',
					one_field: null,
					one_primary: type === 'files' ? 'id' : '',
				},
			];
		}

		watch(
			() => state.fieldData.field,
			() => {
				state.relations[0].one_field = state.fieldData.field;
			}
		);

		watch(
			() => state.relations[0].many_collection,
			() => {
				const pkField = fieldsStore.getPrimaryKeyFieldForCollection(state.relations[0].many_collection)?.field;
				state.relations[0].many_primary = pkField;
				state.relations[1].many_primary = pkField;
			}
		);

		watch(
			() => state.relations[0].many_field,
			() => {
				state.relations[1].junction_field = state.relations[0].many_field;
			}
		);

		watch(
			() => state.relations[1].many_field,
			() => {
				state.relations[0].junction_field = state.relations[1].many_field;
			}
		);

		watch(
			() => state.relations[1].one_collection,
			() => {
				state.relations[1].one_primary = fieldsStore.getPrimaryKeyFieldForCollection(
					state.relations[1].one_collection
				)?.field;
			}
		);
	}

	if (type === 'presentation') {
		delete state.fieldData.schema;
		delete state.fieldData.type;
		state.fieldData.meta.special = 'alias';
	}

	if (type === 'standard') {
		watch(
			() => state.fieldData.type,
			() => {
				state.fieldData.meta.interface = null;
				state.fieldData.meta.options = null;
				state.fieldData.meta.display = null;
				state.fieldData.meta.display_options = null;
				state.fieldData.meta.special = null;
				state.fieldData.schema.default_value = undefined;

				switch (state.fieldData.type) {
					case 'uuid':
						state.fieldData.meta.special = 'uuid';
						break;
					case 'json':
						state.fieldData.meta.special = 'json';
						break;
					case 'boolean':
						state.fieldData.meta.special = 'boolean';
						state.fieldData.schema.is_nullable = false;
						state.fieldData.schema.default_value = false;
						break;
				}
			}
		);
	}
}

function clearLocalStore() {
	state = null;
}
