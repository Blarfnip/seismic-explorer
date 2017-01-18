import THREE from 'three'
import vertexShader from 'raw!./direction-arrow-vertex.glsl'
import fragmentShader from 'raw!./direction-arrow-fragment.glsl'
import Arrow from './direction-arrow'

const MAX_COUNT = 250000

export default class {
  constructor() {
    const positions = new Float32Array(MAX_COUNT * 3)
    const directions = new Float32Array(MAX_COUNT * 3)
    const colors = new Float32Array(MAX_COUNT * 3)
    const sizes = new Float32Array(MAX_COUNT)

    const geometry = new THREE.BufferGeometry()
    geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.addAttribute('direction', new THREE.BufferAttribute(directions, 3))
    geometry.addAttribute('customColor', new THREE.BufferAttribute(colors, 3))
    geometry.addAttribute('size', new THREE.BufferAttribute(sizes, 1))

    // Texture defines base shape.
    this.texture = getTexture()

    var material = new THREE.ShaderMaterial({
      uniforms: {
        color: { type: 'c', value: new THREE.Color(0xffffff) },
        opacity: { type: 'f', value: 0.5 },
        texture: {type: 't', value: this.texture}
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      alphaTest: 0.5,
    })

    this.root = new THREE.Points(geometry, material)

    this._renderedArrows = []
  }

  destroy() {
    this.root.geometry.dispose()
    this.root.material.dispose()
    this.texture.dispose()
  }

  setProps(data, latLngToPoint) {
    this._dataToProcess = data
    this._latLngToPoint = latLngToPoint
  }

  arrowAt(x, y) {
    for (let i = this._renderedArrows.length - 1; i >= 0; i--) {
      if (this._renderedArrows[i].hitTest(x, y)) return this._renderedArrows[i].data
    }
    return null
  }

  update(progress) {
    let transitionInProgress = false
    this._processNewData()
    return transitionInProgress
  }

  invalidatePositions(latLngToPoint) {
    this._latLngToPoint = latLngToPoint
    for (let i = 0, len = this._renderedArrows.length; i < len; i++) {
      const point = this._latLngToPoint(this._currentData[i].position)
      const dir = this._currentData[i].velocity
      this._renderedArrows[i].setPositionAttr(point)
      this._renderedArrows[i].setDirectionAttr(dir)
    }
  }

  _processNewData() {
    if (!this._dataToProcess) return
    let data = this._dataToProcess
    if (data.length > MAX_COUNT) {
      console.warn('Too many arrows! Some arrows will not be displayed.')
      data = data.splice(0, MAX_COUNT)
    }
    const attributes = this.root.geometry.attributes
    for (let i = 0, length = data.length; i < length; i++) {
      const arrowData = data[i]
      if (!this._renderedArrows[i] || this._renderedArrows[i].id !== eqData.id) {
        const point = this._latLngToPoint(arrowData.position)
        const dir = arrowData.velocity
        this._renderedArrows[i] = new Arrow(arrowData, i, attributes)
        this._renderedArrows[i].setPositionAttr(point)
        this._renderedArrows[i].setDirectionAttr(dir)
      }
      this._renderedArrows[i].targetVisibility = arrowData.visible ? 1 : 0
    }
    // Reset old data.
    for (let i = data.length, length = this._renderedArrows.length; i < length; i++) {
      this._renderedArrows[i].destroy()
    }
    this._renderedArrows.length = data.length

    this._currentData = data
    this._dataToProcess = null
  }
}

function getTexture() {
  const size = 128
  const strokeWidth = size * 0.06
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  // arrow
  const headlen = 10;   // length of head in pixels
  const tox = 20
  const toy = 20
  const fromx = 0
  const fromy = 0
    let angle = Math.atan2(toy-fromy,tox-fromx);
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.lineTo(tox-headlen*Math.cos(angle-Math.PI/6),toy-headlen*Math.sin(angle-Math.PI/6));
    ctx.moveTo(tox, toy);
    ctx.lineTo(tox-headlen*Math.cos(angle+Math.PI/6),toy-headlen*Math.sin(angle+Math.PI/6));
  //ctx.arc(size / 2, size / 2, size / 2 - strokeWidth / 2, 0, 2 * Math.PI)
  ctx.fillStyle = '#fff'
  ctx.fill()
  ctx.lineWidth = strokeWidth
  ctx.strokeStyle = '#000'
  ctx.stroke()
  const texture = new THREE.Texture(canvas)
  texture.needsUpdate = true
  return texture
}
function canvas_arrow(ctx, fromx, fromy, tox, toy){
    var headlen = 10;   // length of head in pixels
    var angle = Math.atan2(toy-fromy,tox-fromx);
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.lineTo(tox-headlen*Math.cos(angle-Math.PI/6),toy-headlen*Math.sin(angle-Math.PI/6));
    ctx.moveTo(tox, toy);
    ctx.lineTo(tox-headlen*Math.cos(angle+Math.PI/6),toy-headlen*Math.sin(angle+Math.PI/6));
}
