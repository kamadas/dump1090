import {
  TypeDesignatorIcons,
  TypeDescriptionIcons,
  CategoryIcons,
  GetBaseMarker,
  SvgPathToUri,
} from '../markers.js';
import '../ol3/ol.js';

let MarkerLayer;
let NextLon = 0;
let NextLat = 0;

window.onload = SetupMarkersTest;

function SetupMarkersTest() {
  let Marker;
  MarkerLayer = new ol.layer.Vector({
    source: new ol.source.Vector(),
  });

  const Map = new ol.Map({
    target: 'map_canvas',
    layers: [ MarkerLayer ],
    view: new ol.View({
      center: ol.proj.fromLonLat([5, 0]),
        zoom: 7
    }),
    controls: [new ol.control.Zoom(),
               new ol.control.Rotate()],
    loadTilesWhileAnimating: true,
    loadTilesWhileInteracting: true
  });

  for (let type in TypeDesignatorIcons) {
    Marker = GetBaseMarker(null, type, null, null);
    AddMarker(type, Marker);
  }

  for (let type in TypeDescriptionIcons) {
    if ( type.length === 5 ) {
      let types = type.substr(0, 3);
      let wtc = type.substr(4, 1);
      Marker = GetBaseMarker(null, null, types, wtc);
    } else
      Marker = GetBaseMarker(null, null, type, null);
    AddMarker(type, Marker);
  }

  Marker = GetBaseMarker(null, null, null, null);
  AddMarker("Default", Marker);

  for (let category in CategoryIcons) {
    Marker = GetBaseMarker(category, null, null, null);
    AddMarker("Cat " + category, Marker);
  }

  Map.getView().setCenter(ol.proj.fromLonLat([5, NextLat/2]));
}

function AddMarker(title, baseMarker) {
  const icon = new ol.style.Icon({
    anchor: [0.5, 0.5],
    anchorXUnits: 'pixels',
    anchorYUnits: 'pixels',
    scale: 1.2,
    src: SvgPathToUri(baseMarker.svg, '#000000', '#00C000', 'stroke="#00C000" stroke-width="1px"'),
    rotation: 0,
    opacity: 1.0,
    rotateWithView: (baseMarker.noRotate ? false : true)
  });

  const markerStyle = new ol.style.Style({
    image: icon,
    text: new ol.style.Text({
      textAlign: 'center',
      textBaseline: 'top',
      offsetY: 30,
      text: title,
      scale: 1.5
    })
  });

  const pos = [NextLon, NextLat];
  let marker = new ol.Feature(new ol.geom.Point(ol.proj.fromLonLat(pos)));
  marker.setStyle(markerStyle);
  MarkerLayer.getSource().addFeature(marker);

  NextLon += 1;
  if (NextLon >= 10) {
    NextLon -= 10;
    NextLat -= 1;
  }
}
