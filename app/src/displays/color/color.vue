<template>
	<div>
		<value-null v-if="value === null" />
		<div class="dot" :style="{'background-color':styles}"></div>
	</div>
</template>

<script lang="ts">
import { defineComponent, computed, PropType } from '@vue/composition-api';
import formatTitle from '@directus/format-title';
import { isHex } from '@/utils/color'

export default defineComponent({
	props: {
		value: {
			type: String,
			default: null,
		},
		defaultColor: {
			type: String,
			default: '#B0BEC5',
			validator: (value: string) => isHex(value),
		},
	},
	setup(props) {

		const displayValue = computed(() => {
			return props.value;
		});

		const styles = computed(() => {
			if(isHex(props.value)) return props.value
			else return props.defaultColor
		});

		return { displayValue, styles };
	},
});
</script>

<style lang="scss" scoped>
.dot {
	display: inline-block;
	flex-shrink: 0;
	width: 12px;
	height: 12px;
	margin: 0 4px;
	vertical-align: middle;
	border-radius: 6px;
}
</style>
