import { describe, expect, it } from 'vitest'

import { parseFeature } from './ir'

describe('parseFeature', () => {
  it('reads the background, the scenarios, their steps, and their examples', () => {
    const feature = parseFeature({
      name: 'Base map',
      background: [{ keyword: 'Given', text: 'the application is open' }],
      scenarios: [
        {
          name: 'Zooming',
          steps: [{ keyword: 'When', text: 'the user zooms to <zoom>', parameters: ['zoom'] }],
          examples: [{ zoom: '6' }, { zoom: '7' }],
        },
      ],
    })

    expect(feature).toEqual({
      name: 'Base map',
      background: [{ keyword: 'Given', text: 'the application is open' }],
      scenarios: [
        {
          name: 'Zooming',
          steps: [{ keyword: 'When', text: 'the user zooms to <zoom>' }],
          examples: [{ zoom: '6' }, { zoom: '7' }],
        },
      ],
    })
  })

  it('treats a missing background as no background steps', () => {
    const feature = parseFeature({ name: 'Base map', scenarios: [] })

    expect(feature).toEqual({ name: 'Base map', background: [], scenarios: [] })
  })

  it.each([
    ['a feature that is not an object', ['Base map'], 'feature must be an object'],
    ['a feature without a name', { scenarios: [] }, 'feature.name must be a string'],
    ['a feature without scenarios', { name: 'Base map' }, 'feature.scenarios must be an array'],
    [
      'a background that is not a list',
      { name: 'Base map', background: {}, scenarios: [] },
      'feature.background must be an array',
    ],
    [
      'a scenario without steps',
      { name: 'Base map', scenarios: [{ name: 'Zooming', examples: [] }] },
      'feature.scenarios[0].steps must be an array',
    ],
    [
      'a scenario without examples',
      { name: 'Base map', scenarios: [{ name: 'Zooming', steps: [] }] },
      'feature.scenarios[0].examples must be an array',
    ],
    [
      'a step without text',
      { name: 'Base map', scenarios: [{ name: 'Zooming', steps: [{ keyword: 'When' }], examples: [] }] },
      'feature.scenarios[0].steps[0].text must be a string',
    ],
    [
      'a step without a keyword',
      { name: 'Base map', background: [{ text: 'the application is open' }], scenarios: [] },
      'feature.background[0].keyword must be a string',
    ],
    [
      'an example value that is not a string',
      { name: 'Base map', scenarios: [{ name: 'Zooming', steps: [], examples: [{ zoom: '6' }, { zoom: 7 }] }] },
      'feature.scenarios[0].examples[1].zoom must be a string',
    ],
  ])('rejects %s', (_case, json, message) => {
    expect(() => parseFeature(json)).toThrow(`Malformed feature IR: ${message}`)
  })
})
