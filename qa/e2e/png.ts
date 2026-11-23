import { inflateSync } from 'node:zlib'

/** The pixels of a picture, row by row, `channels` bytes per pixel. */
export interface Pixels {
  readonly width: number
  readonly height: number
  readonly channels: number
  readonly data: Buffer
}

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
// Colour type -> bytes per pixel, at 8 bits per sample: truecolour, truecolour with alpha.
const CHANNELS: ReadonlyMap<number, number> = new Map([
  [2, 3],
  [6, 4],
])

interface Header {
  readonly width: number
  readonly height: number
  readonly channels: number
}

function readHeader(chunk: Buffer): Header {
  const bitDepth = chunk.readUInt8(8)
  const channels = CHANNELS.get(chunk.readUInt8(9))
  const interlaced = chunk.readUInt8(12) !== 0
  if (bitDepth !== 8 || channels === undefined || interlaced) {
    throw new Error('Only non-interlaced 8-bit RGB and RGBA pictures are supported.')
  }
  return { width: chunk.readUInt32BE(0), height: chunk.readUInt32BE(4), channels }
}

function paeth(left: number, up: number, upLeft: number): number {
  const estimate = left + up - upLeft
  const toLeft = Math.abs(estimate - left)
  const toUp = Math.abs(estimate - up)
  const toUpLeft = Math.abs(estimate - upLeft)
  if (toLeft <= toUp && toLeft <= toUpLeft) return left
  return toUp <= toUpLeft ? up : upLeft
}

function predict(filter: number, left: number, up: number, upLeft: number): number {
  switch (filter) {
    case 0:
      return 0
    case 1:
      return left
    case 2:
      return up
    case 3:
      return Math.floor((left + up) / 2)
    case 4:
      return paeth(left, up, upLeft)
    default:
      throw new Error(`Unknown PNG filter ${filter}.`)
  }
}

function unfilter(filtered: Buffer, { width, height, channels }: Header): Buffer {
  const stride = width * channels
  const out = Buffer.alloc(height * stride)
  for (let row = 0; row < height; row++) {
    const filter = filtered.readUInt8(row * (stride + 1))
    const source = row * (stride + 1) + 1
    const target = row * stride
    for (let i = 0; i < stride; i++) {
      const left = i >= channels ? out.readUInt8(target + i - channels) : 0
      const up = row > 0 ? out.readUInt8(target - stride + i) : 0
      const upLeft = row > 0 && i >= channels ? out.readUInt8(target - stride + i - channels) : 0
      out.writeUInt8((filtered.readUInt8(source + i) + predict(filter, left, up, upLeft)) & 0xff, target + i)
    }
  }
  return out
}

/** Decodes a PNG picture, such as a Playwright screenshot. */
export function decodePng(png: Buffer): Pixels {
  if (!png.subarray(0, SIGNATURE.length).equals(SIGNATURE)) throw new Error('Not a PNG picture.')
  let header: Header | undefined
  const imageData: Buffer[] = []
  for (let offset = SIGNATURE.length; offset < png.length; ) {
    const length = png.readUInt32BE(offset)
    const type = png.toString('ascii', offset + 4, offset + 8)
    const chunk = png.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') header = readHeader(chunk)
    if (type === 'IDAT') imageData.push(chunk)
    offset += 12 + length
  }
  if (header === undefined) throw new Error('The PNG picture has no header.')
  return { ...header, data: unfilter(inflateSync(Buffer.concat(imageData)), header) }
}
