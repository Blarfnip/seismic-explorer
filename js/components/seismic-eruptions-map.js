import React, { PureComponent } from 'react'
import { Map, TileLayer } from 'react-leaflet'
import { Circle } from 'leaflet'
import SpritesLayer from './sprites-layer'
import EarthquakePopup from './earthquake-popup'
import VolcanoPopup from './volcano-popup'
import PlateBoundariesLayer from './plate-boundaries-layer'
import PlateArrowsLayer from './plate-arrows-layer'
import LabelsLayer from './labels-layer'
import PinsLayer from './pins-layer'
import PlateMovementLayer from './plate-movement-layer'
import CrossSectionDrawLayer from './cross-section-draw-layer'
import addTouchSupport from '../custom-leaflet/touch-support'
import { mapLayer } from '../map-layer-tiles'
import log from '../logger'
import plateNames from '../data/plate-names'
import continentOceanNames from '../data/continent-ocean-names'
import config from '../config'

import '../../css/leaflet/leaflet.css'
import '../../css/seismic-eruptions-map.less'

const INITIAL_BOUNDS = [
  [config.minLat, config.minLng],
  [config.maxLat, config.maxLng]
]

// It delays download of earthquakes data on map moveend event, so user can pan or zoom map
// a few times quickly before the download starts.
const BOUNDS_UPDATE_DELAY = 600 // ms

const DEFAULT_MAX_ZOOM = 13

// Leaflet map doesn't support custom touch events by default.
addTouchSupport()

export default class SeismicEruptionsMap extends PureComponent {
  constructor (props) {
    super(props)
    this.state = {
      selectedEarthquake: null,
      selectedVolcano: null
    }
    this.handleEarthquakeClick = this.handleEarthquakeClick.bind(this)
    this.handleEarthquakePopupClose = this.handleEarthquakePopupClose.bind(this)
    this.handleVolcanoClick = this.handleVolcanoClick.bind(this)
    this.handleVolcanoPopupClose = this.handleVolcanoPopupClose.bind(this)
    this.handleMapViewportChanged = this.handleMapViewportChanged.bind(this)
  }

  get map () {
    return this.refs.map.leafletElement
  }

  get mapRegion () {
    const bounds = this.map.getBounds()
    return {
      minLng: bounds.getWest(),
      maxLng: bounds.getEast(),
      minLat: bounds.getSouth(),
      maxLat: bounds.getNorth()
    }
  }

  get mapZoom () {
    return this.map.getZoom()
  }

  get baseLayer () {
    const { layers } = this.props
    return mapLayer(layers.get('base'))
  }

  latLngToPoint (latLng) {
    return this.map.latLngToContainerPoint(latLng)
  }

  componentDidMount () {
    // Make sure that SVG overlay layer exists from the very beginning. It's created dynamically when the first
    // SVG object is added to the map. It solves / simplifies some issues. For example we don't want earthquakes
    // to be clickable when we enter cross-section drawing mode. The simplest solution is to set Canvas z-index
    // lower than SVG z-index, but it won't work if the SVG layer hasn't been created yet.
    createSVGOverlayLayer(this.map)
    // Initially Leaflet always triggers mapmove event, as probably real bounds are a bit different than
    // provided bounds (due to screen size etc.). That is causing mark2DViewModified to be called and reset view icon
    // being shown. This is unwanted, as there has been no user interaction. Mark this view unmodified again.
    const { mark2DViewModified, setMapStatus } = this.props
    mark2DViewModified(false)
    setMapStatus(this.mapRegion, this.mapZoom)

    this.map.on('click', (e) => {
      // TOOD: remove, it can be useful to tweak position of plate arrows.
      console.log('lat:', e.latlng.lat, 'lng:', e.latlng.lng)
    })
  }

  componentDidUpdate () {
    // This maxZoom option is not handled by react-leaftlet as a dynamic react property (it doesn't update after
    // Map component is created), so we need to use raw Leaflet API to dynamically change it.
    this.refs.map.leafletElement.setMaxZoom(this.baseLayer.maxZoom || DEFAULT_MAX_ZOOM)
  }

  handleMapViewportChanged () {
    const { mark2DViewModified } = this.props
    mark2DViewModified(true)

    this._mapBeingDragged = false

    clearTimeout(this._boundsUpdateTimeoutID)
    this._boundsUpdateTimeoutID = setTimeout(() => {
      const { layers, setMapStatus } = this.props
      setMapStatus(this.mapRegion, this.mapZoom, layers.get('earthquakes'))

      const bounds = this.map.getBounds()
      log('MapRegionChanged', {
        minLat: bounds.getSouthWest().lat,
        minLng: bounds.getSouthWest().lng,
        maxLat: bounds.getNorthEast().lat,
        maxLng: bounds.getNorthEast().lng,
        zoom: this.mapZoom
      })
    }, BOUNDS_UPDATE_DELAY)
  }

  handleEarthquakeClick (event, earthquake) {
    // Do not open earthquake popup if click was part of the map dragging action.
    if (this._mapBeingDragged) return
    this.setState({selectedEarthquake: earthquake})
    log('EarthquakeClicked', earthquake)
  }

  handleEarthquakePopupClose () {
    this.setState({selectedEarthquake: null})
  }

  handleVolcanoClick (event, volcano) {
    if (this._mapBeingDragged) return
    this.setState({selectedVolcano: volcano})
    log('Volcano Clicked', volcano)
  }

  handleVolcanoPopupClose () {
    this.setState({selectedVolcano: null})
  }

  fitBounds (bounds = INITIAL_BOUNDS) {
    const { mark2DViewModified } = this.props
    this.map.fitBounds(bounds)
    mark2DViewModified(false)
    log('ResetMapClicked')
  }

  render () {
    const { mode, earthquakes, volcanoes, layers, crossSectionPoints, mapStatus, setCrossSectionPoint } = this.props
    const { selectedEarthquake, selectedVolcano } = this.state
    const baseLayer = this.baseLayer
    let url = baseLayer.url
    if (baseLayer.url.indexOf('{c}') > -1) {
      // If screen scaled display has higher than 1 pixel ratio, request scaled tiles, otherwise just request regular tiles
      url = window.devicePixelRatio && window.devicePixelRatio !== 1 ? baseLayer.url.replace('{c}', '@' + Math.round(window.devicePixelRatio) + 'x') : baseLayer.url.replace('{c}', '')
    }
    return (
      <div className={`seismic-eruptions-map mode-${mode}`}>
        <Map ref='map' className='map' onViewportChanged={this.handleMapViewportChanged}
          bounds={INITIAL_BOUNDS} minZoom={2}>
          {/* #key attribute is very important here. #subdomains is not a dynamic property, so we can't reuse the same */}
          {/* component instance when we switch between maps with subdomains and without. */}
          <TileLayer key={baseLayer.type} url={url} subdomains={baseLayer.subdomains} attribution={baseLayer.attribution} />
          {layers.get('plateBoundaries') && <PlateBoundariesLayer mapRegion={mapStatus.get('region')} mapZoom={mapStatus.get('zoom')} />}
          {layers.get('continentOceanNames') && <LabelsLayer mapRegion={mapStatus.get('region')} labels={continentOceanNames} />}
          {layers.get('plateNames') && <LabelsLayer mapRegion={mapStatus.get('region')} labels={plateNames} />}
          {layers.get('plateArrows') && <PlateArrowsLayer mapRegion={mapStatus.get('region')} />}
          {layers.get('plateMovement') && <PlateMovementLayer />}
          {config.pins && config.pins.length > 0 && <PinsLayer mapRegion={mapStatus.get('region')} />}
          {mode !== '3d' &&
            /* Performance optimization. Update of this component is expensive. Remove it when the map is invisible. */
            <SpritesLayer earthquakes={earthquakes} volcanoes={volcanoes}
              onEarthquakeClick={this.handleEarthquakeClick} onVolcanoClick={this.handleVolcanoClick} />
          }
          {mode === '2d' && selectedEarthquake &&
            <EarthquakePopup earthquake={selectedEarthquake} onPopupClose={this.handleEarthquakePopupClose} />
          }
          {mode === '2d' && selectedVolcano &&
            <VolcanoPopup volcano={selectedVolcano} onPopupClose={this.handleVolcanoPopupClose} />
          }
          {mode === 'cross-section' &&
            <CrossSectionDrawLayer crossSectionPoints={crossSectionPoints} setCrossSectionPoint={setCrossSectionPoint} />
          }
        </Map>
      </div>
    )
  }
}

function createSVGOverlayLayer (map) {
  map.addLayer(new Circle([0, 0], 0, {opacity: 0, fillOpacity: 0}))
}
