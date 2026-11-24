// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PlaceSearch from './PlaceSearch.vue'

const EMPTY = {
  text: '',
  disabled: false,
  hint: 'Rechercher un lieu ou une adresse',
  expanded: false,
  options: [],
  activeOptionId: undefined,
  message: undefined,
  canClear: false,
}

const SUGGESTIONS = {
  ...EMPTY,
  text: 'Gre',
  expanded: true,
  canClear: true,
  options: [
    { id: 'place-suggestions-1', name: 'Grenoble', type: 'Ville', context: 'Auvergne-Rhône-Alpes, France', active: false },
    { id: 'place-suggestions-2', name: 'Grèce', type: 'Pays', context: '', active: true },
  ],
  activeOptionId: 'place-suggestions-2',
}

describe('PlaceSearch', () => {
  it('is a combobox named "Rechercher un lieu ou une adresse" that shows the hint while empty', () => {
    const field = mount(PlaceSearch, { props: EMPTY }).find('input')

    expect(field.attributes('role')).toBe('combobox')
    expect(field.attributes('aria-label')).toBe('Rechercher un lieu ou une adresse')
    expect(field.attributes('placeholder')).toBe('Rechercher un lieu ou une adresse')
    expect(field.attributes('aria-expanded')).toBe('false')
    expect(field.attributes('disabled')).toBeUndefined()
  })

  it('is disabled and shows its hint when the search is not configured', () => {
    const field = mount(PlaceSearch, { props: { ...EMPTY, disabled: true, hint: 'Recherche non configurée' } }).find('input')

    expect(field.attributes('disabled')).toBeDefined()
    expect(field.attributes('placeholder')).toBe('Recherche non configurée')
  })

  it('shows the text the application holds, and hands it each change', async () => {
    const search = mount(PlaceSearch, { props: { ...EMPTY, text: 'Gr' } })
    const field = search.find('input')

    expect(field.element.value).toBe('Gr')
    await field.setValue('Gre')
    expect(search.emitted('type')).toEqual([['Gre']])
  })

  it('names the listbox it controls and its active option, and marks that option selected', () => {
    const search = mount(PlaceSearch, { props: SUGGESTIONS })
    const field = search.find('input')
    const listbox = search.find('[role="listbox"]')
    const options = search.findAll('[role="option"]')

    expect(field.attributes('aria-expanded')).toBe('true')
    expect(field.attributes('aria-controls')).toBe(listbox.attributes('id'))
    expect(field.attributes('aria-activedescendant')).toBe('place-suggestions-2')
    expect(options.map((option) => option.attributes('id'))).toEqual(['place-suggestions-1', 'place-suggestions-2'])
    expect(options.map((option) => option.attributes('aria-selected'))).toEqual(['false', 'true'])
  })

  it('reads each suggestion as its name, its type, and its context', () => {
    const options = mount(PlaceSearch, { props: SUGGESTIONS }).findAll('[role="option"]')

    const parts = options.map((option) =>
      option
        .findAll('span')
        .filter((part) => part.findAll('span').length === 0)
        .map((part) => part.text()),
    )
    expect(parts).toEqual([
      ['Grenoble', 'Ville', 'Auvergne-Rhône-Alpes, France'],
      ['Grèce', 'Pays'],
    ])
  })

  it('hands on the arrow keys, Enter, and Escape pressed in the field', async () => {
    const search = mount(PlaceSearch, { props: SUGGESTIONS })
    const field = search.find('input')

    await field.trigger('keydown', { key: 'ArrowDown' })
    await field.trigger('keydown', { key: 'ArrowUp' })
    await field.trigger('keydown', { key: 'Enter' })
    await field.trigger('keydown', { key: 'Escape' })

    expect([search.emitted('next'), search.emitted('previous'), search.emitted('chooseActive'), search.emitted('close')]).toEqual([
      [[]],
      [[]],
      [[]],
      [[]],
    ])
  })

  it('keeps Escape pressed in the field to itself, away from the drawing mode of the map', async () => {
    const heard: string[] = []
    const hear = (event: KeyboardEvent): void => {
      heard.push(event.key)
    }
    window.addEventListener('keydown', hear)
    const search = mount(PlaceSearch, { props: SUGGESTIONS, attachTo: document.body })

    await search.find('input').trigger('keydown', { key: 'Escape' })
    await search.find('input').trigger('keydown', { key: 'ArrowDown' })
    const closed = search.emitted('close')
    window.removeEventListener('keydown', hear)
    search.unmount()

    expect(closed).toEqual([[]])
    expect(heard).toEqual(['ArrowDown'])
  })

  it('chooses the suggestion clicked', async () => {
    const search = mount(PlaceSearch, { props: SUGGESTIONS })

    await search.findAll('[role="option"]')[1]?.trigger('click')

    expect(search.emitted('choose')).toEqual([[1]])
  })

  it('shows the message in a status', () => {
    const search = mount(PlaceSearch, { props: { ...EMPTY, text: 'Gre', message: 'Recherche indisponible' } })

    expect(search.find('[role="status"]').text()).toBe('Recherche indisponible')
  })

  it('offers "Effacer" only while the field holds text, and hands on a click on it', async () => {
    const empty = mount(PlaceSearch, { props: EMPTY })
    const search = mount(PlaceSearch, { props: SUGGESTIONS })
    const clear = search.findAll('button').find((button) => button.text() === 'Effacer')

    await clear?.trigger('click')

    expect(empty.findAll('button')).toEqual([])
    expect(search.emitted('clear')).toEqual([[]])
  })
})
