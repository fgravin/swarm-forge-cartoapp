// @vitest-environment happy-dom
import { mount, type VueWrapper } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import type { LayerItem } from '../application/useLayers'
import LayerPanel from './LayerPanel.vue'

const AVAILABLE: LayerItem = {
  id: 'layer-1',
  title: 'Parcs suisses (Zones)',
  status: undefined,
  disabled: false,
  shown: true,
  eyeLabel: 'Masquer Parcs suisses (Zones)',
  zoomLabel: 'Zoomer sur Parcs suisses (Zones)',
  zoomDisabled: false,
  opacity: 35,
  opacityLabel: 'Opacité de Parcs suisses (Zones)',
  opacityText: '35 %',
  legendUnfolded: true,
  legendImage: { url: 'https://legends.example/parcs.png', description: 'Légende de Parcs suisses (Zones)' },
  legendMessage: undefined,
}

const LOADING: LayerItem = {
  ...AVAILABLE,
  id: 'layer-2',
  title: 'LITHO_1M_SIMPLIFIEE',
  status: 'Chargement…',
  disabled: true,
  shown: false,
  eyeLabel: 'Afficher LITHO_1M_SIMPLIFIEE',
  zoomLabel: 'Zoomer sur LITHO_1M_SIMPLIFIEE',
  zoomDisabled: true,
  opacityLabel: 'Opacité de LITHO_1M_SIMPLIFIEE',
  legendUnfolded: false,
  legendImage: undefined,
}

function groups(panel: VueWrapper) {
  return panel.findAll('[role="group"]')
}

function named(panel: VueWrapper, selector: string, name: string) {
  const found = panel.findAll(selector).find((element) => element.attributes('aria-label') === name)
  if (found === undefined) throw new Error(`no ${selector} named "${name}"`)
  return found
}

describe('LayerPanel', () => {
  it('is a region titled "Couches" with a group per layer, named by its title', () => {
    const panel = mount(LayerPanel, { props: { items: [AVAILABLE, LOADING] } })

    const title = panel.find('h2')
    expect(title.text()).toBe('Couches')
    expect(panel.find('section').attributes('aria-labelledby')).toBe(title.attributes('id'))
    expect(groups(panel).map((group) => group.attributes('aria-label'))).toEqual(['Parcs suisses (Zones)', 'LITHO_1M_SIMPLIFIEE'])
  })

  it('names the controls of a layer after it, and shows its state', () => {
    const panel = mount(LayerPanel, { props: { items: [AVAILABLE] } })

    expect(named(panel, 'button', 'Masquer Parcs suisses (Zones)').attributes('aria-pressed')).toBe('true')
    expect(named(panel, 'button', 'Zoomer sur Parcs suisses (Zones)').attributes('disabled')).toBeUndefined()
    const slider = named(panel, 'input', 'Opacité de Parcs suisses (Zones)')
    expect(slider.attributes()).toMatchObject({ type: 'range', min: '0', max: '100', step: '5' })
    expect(slider.element).toHaveProperty('value', '35')
    expect(groups(panel)[0]?.text()).toContain('35 %')
    expect(panel.findAll('button').find((button) => button.text() === 'Légende')?.attributes('aria-expanded')).toBe('true')
  })

  it('shows the status of a layer that cannot be used, with its controls disabled', () => {
    const panel = mount(LayerPanel, { props: { items: [LOADING] } })

    expect(groups(panel)[0]?.text()).toContain('Chargement…')
    const controls = [...panel.findAll('button'), ...panel.findAll('input')]
    expect(controls).toHaveLength(4)
    expect(controls.map((control) => control.attributes('disabled'))).toEqual(['', '', '', ''])
  })

  it('shows the unfolded legend image, described after the layer, or the message in its place', () => {
    const withImage = mount(LayerPanel, { props: { items: [AVAILABLE] } })
    const withMessage = mount(LayerPanel, {
      props: { items: [{ ...AVAILABLE, legendImage: undefined, legendMessage: 'Légende indisponible' }] },
    })
    const folded = mount(LayerPanel, { props: { items: [LOADING] } })

    expect(withImage.find('img').attributes()).toMatchObject({
      src: 'https://legends.example/parcs.png',
      alt: 'Légende de Parcs suisses (Zones)',
    })
    expect(withMessage.find('img').exists()).toBe(false)
    expect(withMessage.text()).toContain('Légende indisponible')
    expect(folded.find('img').exists()).toBe(false)
  })

  it('hands on what the user does to a layer, with its position in the list', async () => {
    const panel = mount(LayerPanel, { props: { items: [LOADING, AVAILABLE] } })

    await named(panel, 'button', 'Masquer Parcs suisses (Zones)').trigger('click')
    await named(panel, 'button', 'Zoomer sur Parcs suisses (Zones)').trigger('click')
    await named(panel, 'input', 'Opacité de Parcs suisses (Zones)').setValue('40')
    await panel.findAll('button').filter((button) => button.text() === 'Légende')[1]?.trigger('click')
    await panel.find('img').trigger('error')

    expect(panel.emitted()).toMatchObject({
      toggleShown: [[1]],
      zoomTo: [[1]],
      setOpacity: [[1, 40]],
      toggleLegend: [[1]],
      legendFailed: [[1]],
    })
  })
})
