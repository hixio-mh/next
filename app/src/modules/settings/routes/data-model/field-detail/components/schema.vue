<template>
	<div>
		<h2 class="type-title">{{ $t('schema_setup_title') }}</h2>

		<div class="form">
			<div class="field">
				<div class="label type-label">
					{{ $t('key') }}
					<v-icon class="required" sup name="star" />
				</div>
				<v-input
					:disabled="isExisting"
					autofocus
					class="monospace"
					v-model="fieldData.field"
					db-safe
					:placeholder="$t('a_unique_column_name')"
				/>
			</div>

			<div class="field">
				<div class="label type-label">
					{{ $t('type') }}
					<v-icon class="required" sup name="star" />
				</div>
				<v-input v-if="!fieldData.schema" :value="$t('alias')" disabled />
				<v-select
					v-else
					:disabled="typeDisabled || isExisting"
					:value="fieldData.type"
					:items="typesWithLabels"
					:placeholder="typePlaceholder"
					@input="fieldData.type = $event"
				/>
			</div>

			<div class="field full">
				<div class="label type-label">{{ $t('note') }}</div>
				<v-input v-model="fieldData.meta.note" :placeholder="$t('add_note')" />
			</div>

			<!-- @todo base default value field type on selected type -->
			<div class="field full" v-if="fieldData.schema">
				<div class="label type-label">{{ $t('default_value') }}</div>
				<v-input
					v-if="['string', 'uuid'].includes(fieldData.type)"
					class="monospace"
					v-model="defaultValue"
					:placeholder="$t('add_a_default_value')"
				/>
				<v-textarea
					v-else-if="['text', 'json'].includes(fieldData.type)"
					class="monospace"
					v-model="defaultValue"
					:placeholder="$t('add_a_default_value')"
				/>
				<v-input
					v-else-if="['integer', 'bigInteger', 'float', 'decimal'].includes(fieldData.type)"
					type="number"
					class="monospace"
					v-model="defaultValue"
					:placeholder="$t('add_a_default_value')"
				/>
				<v-input
					v-else-if="['timestamp', 'datetime', 'date', 'time'].includes(fieldData.type)"
					class="monospace"
					v-model="defaultValue"
					:placeholder="$t('add_a_default_value')"
				/>
				<v-checkbox
					v-else-if="fieldData.type === 'boolean'"
					class="monospace"
					v-model="defaultValue"
					:label="defaultValue ? $t('true') : $t('false')"
					block
				/>
				<v-input
					v-else
					class="monospace"
					v-model="defaultValue"
					disabled
					:placeholder="$t('add_a_default_value')"
				/>
			</div>

			<div class="field" v-if="fieldData.schema">
				<div class="label type-label">{{ $t('length') }}</div>
				<v-input
					type="number"
					:placeholder="fieldData.type !== 'string' ? $t('not_available_for_type') : '255'"
					:disabled="isExisting || fieldData.type !== 'string'"
					v-model="fieldData.schema.max_length"
				/>
			</div>

			<div class="field" v-if="fieldData.schema">
				<div class="label type-label">{{ $t('allow_null') }}</div>
				<v-checkbox v-model="fieldData.schema.is_nullable" :label="$t('allow_null_label')" block />
			</div>

			<div class="field full">
				<div class="label type-label">{{ $t('translation') }}</div>
				<interface-repeater
					v-model="fieldData.meta.translation"
					:template="'{{ translation }} ({{ locale }})'"
					:fields="[
						{
							field: 'locale',
							type: 'string',
							name: $t('language'),
							meta: {
								interface: 'system-language',
								width: 'half',
							},
							schema: {
								default_value: 'en-US',
							},
						},
						{
							field: 'translation',
							type: 'string',
							name: $t('translation'),
							meta: {
								interface: 'text-input',
								width: 'half',
								options: {
									placeholder: 'Enter a translation...',
								},
							},
						},
					]"
				/>
			</div>

			<!--
			@todo add unique when the API supports it

			<div class="field">
				<div class="label type-label">{{ $t('unique') }}</div>
				<v-input v-model="fieldData.schema.unique" />
			</div> -->
		</div>
	</div>
</template>

<script lang="ts">
import { defineComponent, computed } from '@vue/composition-api';
import useSync from '@/composables/use-sync';
import { types } from '@/types';
import i18n from '@/lang';
import { state } from '../store';

export default defineComponent({
	props: {
		isExisting: {
			type: Boolean,
			required: true,
		},
		type: {
			type: String,
			required: true,
		},
	},
	setup(props, { emit }) {
		const typesWithLabels = computed(() => {
			return [
				{
					text: i18n.t('string'),
					value: 'string',
				},
				{
					text: i18n.t('text'),
					value: 'text',
				},
				{ divider: true },
				{
					text: i18n.t('boolean'),
					value: 'boolean',
				},
				{ divider: true },
				{
					text: i18n.t('integer'),
					value: 'integer',
				},
				{
					text: i18n.t('bigInteger'),
					value: 'bigInteger',
				},
				{
					text: i18n.t('float'),
					value: 'float',
				},
				{
					text: i18n.t('decimal'),
					value: 'decimal',
				},
				{ divider: true },
				{
					text: i18n.t('timestamp'),
					value: 'timestamp',
				},
				{
					text: i18n.t('datetime'),
					value: 'dateTime',
				},
				{
					text: i18n.t('date'),
					value: 'date',
				},
				{
					text: i18n.t('time'),
					value: 'time',
				},
				{ divider: true },
				{
					text: i18n.t('json'),
					value: 'json',
				},
				{
					text: i18n.t('csv'),
					value: 'csv',
				},
				{
					text: i18n.t('uuid'),
					value: 'uuid',
				},
			];
		});

		const typeDisabled = computed(() => {
			return ['file', 'files', 'o2m', 'm2m', 'm2o'].includes(props.type);
		});

		const typePlaceholder = computed(() => {
			if (props.type === 'm2o') {
				return i18n.t('determined_by_relationship');
			}

			return i18n.t('choose_a_type');
		});

		const defaultValue = computed({
			get() {
				return state.fieldData.schema.default_value;
			},
			set(newVal: any) {
				state.fieldData.schema.default_value = newVal;
			},
		});

		return {
			fieldData: state.fieldData,
			typesWithLabels,
			typeDisabled,
			typePlaceholder,
			defaultValue,
		};
	},
});
</script>

<style lang="scss" scoped>
@import '@/styles/mixins/breakpoint';

.type-title {
	margin-bottom: 32px;
}

.form {
	display: grid;
	grid-gap: 32px;
	grid-template-columns: 1fr 1fr;
}

.field {
	grid-column: 1 / span 2;

	@include breakpoint(small) {
		grid-column: auto;
	}
}

.full {
	grid-column: 1 / span 2;

	@include breakpoint(small) {
		grid-column: 1 / span 2;
	}
}

.label {
	margin-bottom: 8px;
}

.monospace {
	--v-input-font-family: var(--family-monospace);
}

.required {
	--v-icon-color: var(--primary);
}
</style>
