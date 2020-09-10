import { defineInterface } from '@/interfaces/define';
import InterfaceColor from './color.vue';

export default defineInterface(({ i18n }) => ({
	id: 'color',
	name: i18n.t('interfaces.color.color'),
	description: i18n.t('interfaces.color.description'),
	icon: 'palette',
	component: InterfaceColor,
	types: ['string'],
	recommendedDisplays: ['color-dot'],
	options: [
		{
			field: 'presets',
			name: i18n.t('interfaces.color.preset_colors'),
			type: 'string',
			meta: {
				width: 'full',
				interface: 'repeater',
				options: {
					placeholder: i18n.t('interfaces.color.preset_colors_placeholder'),
					template: '{{ name }} - {{ color }}',
					fields: [
						{
							field: 'name',
							type: 'string',
							name: i18n.t('name'),
							meta: {
								interface: 'text-input',
								width: 'half',
							},
						},
						{
							field: 'color',
							type: 'string',
							name: i18n.t('color'),
							meta: {
								interface: 'color',
								width: 'half',
							},
						},
					],
				},
			},
		},
	],
}));
