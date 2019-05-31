"use strict";

var MarkerLayer;
var NextLon = 0;
var NextLat = 0;

function setup_markers_test() {
    var Marker;
        MarkerLayer = new ol.layer.Vector({
                source: new ol.source.Vector(),
        });

        var map = new ol.Map({
                target: 'map_canvas',
                layers: [
                        MarkerLayer
                ],
                view: new ol.View({
                        center: ol.proj.fromLonLat([5, 0]),
                        zoom: 7
                }),
                controls: [new ol.control.Zoom(),
                           new ol.control.Rotate()],
                loadTilesWhileAnimating: true,
                loadTilesWhileInteracting: true
        });

        for (var type in TypeDesignatorIcons) {
                Marker = getBaseMarker(null, type, null, null);
                add_marker(type, Marker);
        }

        for (var type in TypeDescriptionIcons) {
                if ( type.length === 5 ) {
                    var types = type.substr(0, 3);
                    var wtc = type.substr(4, 1);
                    Marker = getBaseMarker(null, null, types, wtc);
                } else
                    Marker = getBaseMarker(null, null, type, null);
                add_marker(type, Marker);
        }

        for (var category in CategoryIcons) {
                Marker = getBaseMarker(category, null, null, null);
                add_marker("Cat " + category, Marker);
        }


        map.getView().setCenter(ol.proj.fromLonLat([5, NextLat/2]));
}

function add_marker(title, baseMarker) {
        var icon = new ol.style.Icon({
                anchor: [0.5, 0.5],
                anchorXUnits: 'pixels',
                anchorYUnits: 'pixels',
                scale: 1.2,
//                imgSize: baseMarker.size,
                src: svgPathToURI(baseMarker.svg, '#000000', '#00C000', 'stroke="#00C000" stroke-width="1px"'),
                rotation: 0,
                opacity: 1.0,
                rotateWithView: (baseMarker.noRotate ? false : true)
        });

        var markerStyle = new ol.style.Style({
                image: icon,
                text: new ol.style.Text({
                        textAlign: 'center',
                        textBaseline: 'top',
                        offsetY: 30,
                        text: title,
                        scale: 1.5
                })
        });

        var pos = [NextLon, NextLat];
        var marker = new ol.Feature(new ol.geom.Point(ol.proj.fromLonLat(pos)));
        marker.setStyle(markerStyle);
        MarkerLayer.getSource().addFeature(marker);

        NextLon += 1;
        if (NextLon >= 10) {
                NextLon -= 10;
                NextLat -= 1;
        }
}
