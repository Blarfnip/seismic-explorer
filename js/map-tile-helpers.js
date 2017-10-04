// Functions based on:
// http://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#ECMAScript_.28JavaScript.2FActionScript.2C_etc..29
export function lng2tilePos (lng, zoom) {
  return (lng + 180) / 360 * Math.pow(2, zoom)
}

export function lat2tilePos (lat, zoom) {
  return (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)
}

export function lng2tile (lng, zoom) {
  return Math.floor(lng2tilePos(lng, zoom))
}

export function lat2tile (lat, zoom) {
  return Math.floor(lat2tilePos(lat, zoom))
}

export function tile2lng (x, zoom) {
  return (x / Math.pow(2, zoom) * 360 - 180)
}

export function tile2lat (y, zoom) {
  const n = Math.PI - 2 * Math.PI * y / Math.pow(2, zoom)
  return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))))
}

export function tileYOutOfBounds (tile) {
  const maxVal = Math.pow(2, tile.zoom) - 1
  return tile.y < 0 || tile.y > maxVal
}

export function wrapTileX (tile) {
  const maxVal = Math.pow(2, tile.zoom)
  // ((x % maxVal) + maxVal) % maxVal handles both positive and negative values. E.g.:
  // x = -1, maxVal = 16 => ((-1 % 16) + 16) % 16 = 15
  // x = 1, maxVal = 16  => ((1 % 16) + 16) % 16 = 1
  return {x: ((tile.x % maxVal) + maxVal) % maxVal, y: tile.y, zoom: tile.zoom}
}

export function lngDiff (tile1, tile2) {
  return tile2lng(tile1.x, tile1.zoom) - tile2lng(tile2.x, tile2.zoom)
}

export function tile2LatLngBounds (tile) {
  return {
    minLng: tile2lng(tile.x, tile.zoom),
    maxLng: tile2lng(tile.x + 1, tile.zoom),
    maxLat: tile2lat(tile.y, tile.zoom),
    minLat: tile2lat(tile.y + 1, tile.zoom)
  }
}

export function tileBoundingBox (bounds, zoom) {
  return {
    top: lat2tile(bounds.maxLat, zoom),
    bottom: lat2tile(bounds.minLat, zoom),
    left: lng2tile(bounds.minLng, zoom),
    right: lng2tile(bounds.maxLng, zoom)
  }
}

// bounds is an object with minLng, minLat, maxLng and maxLat properties.
export function tilesListByRow (bounds, zoom) {
  const tileBBox = tileBoundingBox(bounds, zoom)
  const tiles = []
  for (let y = tileBBox.top; y <= tileBBox.bottom; y++) {
    const row = []
    tiles.push(row)
    for (let x = tileBBox.left; x <= tileBBox.right; x++) {
      row.push({x, y, zoom})
    }
  }
  return tiles
}

// bounds is an object with minLng, minLat, maxLng and maxLat properties.
export function tilesList (bounds, zoom) {
  // Flatten array of arrays, so we return all the tiles in one array.
  return [].concat.apply([], tilesListByRow(bounds, zoom))
}
