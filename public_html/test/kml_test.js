var layers = [];
var center_lon = 5.0890591;
var center_lat = 52.085624;

var kml_url = 'radar.kml';
var initZoom = 7;
var MinZoom = 6;
var MaxZoom = 15;

var initPrecision = 8;
var initOpacity = 1.0;
var gMaxOpacity = 1.0;
var gMinOpacity = 0.0;

function init_map() {
//    var view = new ol.View({maxZoom: MaxZoom, minZoom: MinZoom});
    layers = createBaseLayers();

    layers.push(new ol.layer.Group({
        title: 'overlays',
        layers: [
            new ol.layer.Vector({
                name: 'kml',
                type: 'overray',
                title: 'kml',
                source: new ol.source.Vector({
                    url: kml_url,
                    format: new ol.format.KML()
                })
            })
        ]
    }));

    var map = new ol.Map({
        target: 'map_canvas',
        layers: layers,
        view: new ol.View({
            center: ol.proj.fromLonLat([center_lon, center_lat]),
            zoom: initZoom
        }),
//        controls: new ol.control.Zoom(),
        loadTilesWhileAnimating: true,
        loadTilesWhileInteracting: true
    });

//    view.setCenter(ol.proj.transform([center_lon, center_lat], "EPSG:4326", "EPSG:3857"));

//    view.setZoom(initZoom);
}
