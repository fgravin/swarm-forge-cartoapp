// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import BboxPanel from './BboxPanel.vue'

const NO_BBOX = { drawingMode: false, bboxText: 'Aucune emprise', canClear: false }
const WITH_BBOX = { drawingMode: false, bboxText: '5.71234, 45.12345, 6.01234, 45.56789', canClear: true }

function buttonNamed(panel: ReturnType<typeof mount>, name: string) {
  return panel.findAll('button').find((button) => button.text() === name)
}

describe('BboxPanel', () => {
  it('shows the drawing button as pressed only while the drawing mode is on', () => {
    const off = mount(BboxPanel, { props: NO_BBOX })
    const on = mount(BboxPanel, { props: { ...NO_BBOX, drawingMode: true } })

    expect(buttonNamed(off, 'Dessiner une emprise')?.attributes('aria-pressed')).toBe('false')
    expect(buttonNamed(on, 'Dessiner une emprise')?.attributes('aria-pressed')).toBe('true')
  })

  it('asks to toggle the drawing mode when the drawing button is pressed', async () => {
    const panel = mount(BboxPanel, { props: NO_BBOX })

    await buttonNamed(panel, 'Dessiner une emprise')?.trigger('click')

    expect(panel.emitted('toggleDrawing')).toEqual([[]])
  })

  it('shows the bbox text in a region titled "Emprise"', () => {
    const panel = mount(BboxPanel, { props: WITH_BBOX })

    const region = panel.find('section')
    const title = region.find('h2')
    expect(region.attributes('aria-labelledby')).toBe(title.attributes('id'))
    expect(title.text()).toBe('Emprise')
    expect(region.find('output').text()).toBe('5.71234, 45.12345, 6.01234, 45.56789')
  })

  it('offers to clear the bbox only when there is one, and asks to clear it when pressed', async () => {
    const empty = mount(BboxPanel, { props: NO_BBOX })
    const panel = mount(BboxPanel, { props: WITH_BBOX })

    await buttonNamed(panel, "Effacer l'emprise")?.trigger('click')

    expect(buttonNamed(empty, "Effacer l'emprise")).toBeUndefined()
    expect(panel.emitted('clear')).toEqual([[]])
  })
})
