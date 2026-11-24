import { expect, test, type Page } from '@playwright/test'

import {
  expectColourAtC,
  expectGetMapOf,
  expectMixAtC,
  expectOpacity,
  openLayers,
  showLayers,
  type LayerEntry,
} from './layers'
import { boxOf } from './mapScreen'
import {
  colourAt,
  expectMapLooksDifferent,
  expectMapLooksLike,
  takeSettledMapPicture,
} from './pictures'
import { mapCentre } from './pointer'
import { BLUE, LAYERS, RED } from './wms'

// Executable form of qa/procedures/layer-opacity.md.

async function press(page: Page, key: string, times: number): Promise<void> {
  for (let pressed = 0; pressed < times; pressed++) await page.keyboard.press(key)
}

/** "Press the left arrow `times` times on the opacity slider of `layer`." */
async function pressOn(page: Page, layer: LayerEntry, key: string, times: number): Promise<void> {
  await layer.slider.focus()
  await press(page, key, times)
}

test('layer-opacity 1: every layer is fully opaque when the application starts', async ({ page }) => {
  const { panel } = await openLayers(page)

  for (const layer of LAYERS) await expectOpacity(panel.at(layer.position), '100 %')
})

const OPACITY_TEXT = /^(\d+) %$/

test('layer-opacity 2: the slider sets the opacity by steps of 5 %, from 0 to 100 %', async ({ page }) => {
  const { screen, panel } = await openLayers(page)
  const c = await mapCentre(screen)
  const hidden = await takeSettledMapPicture(page, c)
  const basemap = colourAt(hidden)
  await showLayers(panel, 1)
  await expectColourAtC(page, c, BLUE)
  const opaque = await takeSettledMapPicture(page, c)
  const corine = panel.at(1)

  await pressOn(page, corine, 'ArrowLeft', 1)
  await expectOpacity(corine, '95 %')

  await press(page, 'ArrowLeft', 12)
  await expectOpacity(corine, '35 %')
  await expectMixAtC(page, c, basemap, BLUE)
  await expectMapLooksDifferent(page, hidden)
  await expectMapLooksDifferent(page, opaque)

  await press(page, 'ArrowLeft', 8)
  await expectOpacity(corine, '0 %')
  await expectMapLooksLike(page, hidden)

  await press(page, 'ArrowRight', 2)
  await expectOpacity(corine, '10 %')
  await page.keyboard.press('End')
  await expectOpacity(corine, '100 %')
  await expectMapLooksLike(page, opaque)
  await page.keyboard.press('ArrowRight')
  await expectOpacity(corine, '100 %')

  // Drag the thumb from the right end of the slider to its left end, reading the value at each move.
  const slider = await boxOf(corine.slider)
  const y = slider.y + slider.height / 2
  await page.mouse.move(slider.x + slider.width - 4, y)
  await page.mouse.down()
  const read = new Set<string>()
  for (let x = slider.x + slider.width - 4; x >= slider.x; x -= 3) {
    await page.mouse.move(x, y)
    read.add((await corine.slider.getAttribute('aria-valuetext')) ?? '')
  }
  await page.mouse.up()
  expect(read.size, `the values read: ${[...read].join(', ')}`).toBeGreaterThan(5)
  for (const text of read) {
    const percent = Number(OPACITY_TEXT.exec(text)?.[1])
    expect(percent % 5, `"${text}" is a multiple of 5 %`).toBe(0)
  }
  const shown = await corine.slider.getAttribute('aria-valuetext')
  await expectOpacity(corine, shown ?? '')
})

test('layer-opacity 3: the opacity is kept when the layer is hidden and shown again', async ({ page }) => {
  const { screen, panel } = await openLayers(page)
  const c = await mapCentre(screen)
  await showLayers(panel, 3)
  const parks = panel.at(3)

  await pressOn(page, parks, 'ArrowLeft', 12)
  await expectOpacity(parks, '40 %')
  const picture = await takeSettledMapPicture(page, c)

  await parks.eye.click()
  await parks.eye.click()
  await takeSettledMapPicture(page, c)

  await expectOpacity(parks, '40 %')
  await expectMapLooksLike(page, picture)
})

test('layer-opacity 4: an opacity set while the layer is hidden applies when it is shown', async ({ page }) => {
  const { screen, panel, wms } = await openLayers(page)
  const c = await mapCentre(screen)
  const picture = await takeSettledMapPicture(page, c)
  const basemap = colourAt(picture)
  const litho = panel.at(2)

  await pressOn(page, litho, 'ArrowLeft', 10)
  await expectOpacity(litho, '50 %')
  await expectMapLooksLike(page, picture)

  await showLayers(panel, 2)
  await expectGetMapOf(wms, 2)

  await expectMixAtC(page, c, basemap, RED)
})
