// -*- mode: javascript; indent-tabs-mode: nil; c-basic-offset: 8 -*-
"use strict";

// Define our global variables
var EditAircraftDialog = null;
var OLMap = null;
var StaticFeatures = new ol.Collection();
var SiteCircleFeatures = new ol.Collection();
var PlaneIconFeatures = new ol.Collection();
var PlaneTrailFeatures = new ol.Collection();
var Planes = {};
var PlanesOrdered = [];
var SelectedPlane = null;
var SelectedAllPlanes = false;
var FollowSelected = false;
var infoBoxOriginalPosition = {};
var customAltitudeColors = true;

// Set the name of the hidden property and the change event for visibility
var hidden;
if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support
    hidden = "hidden";
} else if (typeof document.msHidden !== "undefined") {
    hidden = "msHidden";
} else if (typeof document.webkitHidden !== "undefined") {
    hidden = "webkitHidden";
}

var SpecialSquawks = {
    '7500': {cssClass: 'squawk7500', markerColor: 'rgb(255, 85, 85)', text: 'Aircraft Hijacking'},
    '7600': {cssClass: 'squawk7600', markerColor: 'rgb(0, 255, 255)', text: 'Radio Failure'},
    '7700': {cssClass: 'squawk7700', markerColor: 'rgb(255, 255, 0)', text: 'General Emergency'},
    '0020': {cssClass: 'squawkSpecialDE', markerColor: 'rgb(227, 200, 0)', text: 'Rettungshubschrauber'},
    '0023': {cssClass: 'squawkSpecialDE', markerColor: 'rgb(0, 80, 239)', text: 'Bundespolizei'},
    '0025': {cssClass: 'squawkSpecialDE', markerColor: 'rgb(243, 156, 18)', text: 'Absetzluftfahrzeug'},
    '0027': {cssClass: 'squawkSpecialDE', markerColor: 'rgb(243, 156, 18)', text: 'Kunstflug'},
    '0030': {cssClass: 'squawkSpecialDE', markerColor: 'rgb(243, 156, 18)', text: 'Vermessung'},
    '0031': {cssClass: 'squawkSpecialDE', markerColor: 'rgb(243, 156, 18)', text: 'Open Skies'},
    '0033': {cssClass: 'squawkSpecialDE', markerColor: 'rgb(0, 138, 0)', text: 'VFR Militär 550ftAGL <FL100'},
    '0034': {cssClass: 'squawkSpecialDE', markerColor: 'rgb(243, 156, 18)', text: 'SAR Einsatz'},
    '0036': {cssClass: 'squawkSpecialDE', markerColor: 'rgb(0, 80, 239)', text: 'Polizei Einsatz'},
    '0037': {cssClass: 'squawkSpecialDE', markerColor: 'rgb(0, 80, 239)', text: 'Polizei BIV'},
    '1600': {cssClass: 'squawkSpecialDE', markerColor: 'rgb(0, 138, 0)', text: 'Militär Tieflug <500ft'}
};

// Current map settings
var MapSettings = {
    CenterLat: DefaultCenterLat,
    CenterLon: DefaultCenterLon,
    ZoomLvl: DefaultZoomLvl,
    MapType: 'osm',
    VisibleLayers: {
        'layer_site_pos': true,
        'layer_ac_trail': true,
        'layer_ac_positions': true
    },
    DisplayUnits: DefaultDisplayUnits,
    AltitudeChart: true
};

var Dump1090Version = "unknown version";
var RefreshInterval = 1000;

var PlaneRowTemplate = null;

var TrackedAircraft = 0;
var TrackedAircraftPositions = 0;
var TrackedAircraftUnknown = 0;
var TrackedHistorySize = 0;

var SitePosition = null;

var ReceiverClock = null;

var LastReceiverTimestamp = 0;
var StaleReceiverCount = 0;
var FetchPending = null;

var MessageCountHistory = [];
var MessageRate = 0;

var NBSP = '\u00a0';

var layers;

// piaware vs flightfeeder
var isFlightFeeder = false;

function processReceiverUpdate(data) {
    // Loop through all the planes in the data packet
    var now = data.now;
    var acs = data.aircraft;

    // Detect stats reset
    if (MessageCountHistory.length > 0 && MessageCountHistory[MessageCountHistory.length - 1].messages > data.messages) {
        MessageCountHistory = [{'time': MessageCountHistory[MessageCountHistory.length - 1].time,
                'messages': 0}];
    }

    // Note the message count in the history
    MessageCountHistory.push({'time': now, 'messages': data.messages});
    // .. and clean up any old values
    if ((now - MessageCountHistory[0].time) > 30)
        MessageCountHistory.shift();

    for (var j = 0; j < acs.length; j++) {
        var ac = acs[j];
        var hex = ac.hex;
        var squawk = ac.squawk;
        var plane = null;

        if (hex === "000000")
            continue; // Skip invalid ICAO24

        // Do we already have this plane object in Planes?
        // If not make it.

        if (Planes[hex]) {
            plane = Planes[hex];
        } else {
            plane = new PlaneObject(hex);
            plane.tr = PlaneRowTemplate.cloneNode(true);

            if (hex[0] === '~') {
                // Non-ICAO address
                plane.tr.cells[0].textContent = hex.substring(1);
                $(plane.tr).css('font-style', 'italic');
            } else {
                plane.tr.cells[0].textContent = hex;
            }

            // set flag image if available
            if (ShowFlags && plane.icaorange.flag_image !== null) {
                $('img', plane.tr.cells[1]).attr('src', FlagPath + plane.icaorange.flag_image);
                $('img', plane.tr.cells[1]).attr('title', plane.icaorange.country);
            } else {
                $('img', plane.tr.cells[1]).css('display', 'none');
            }

            plane.tr.addEventListener('click', function (h, evt) {
                if (evt.srcElement instanceof HTMLAnchorElement) {
                    evt.stopPropagation();
                    return;
                }

                if (!$("#map_container").is(":visible")) {
                    showMap();
                }
                selectPlaneByHex(h, false);
                adjustSelectedInfoBlockPosition();
                evt.preventDefault();
            }.bind(undefined, hex));

            plane.tr.addEventListener('dblclick', function (h, evt) {
                if (!$("#map_container").is(":visible")) {
                    showMap();
                }
                selectPlaneByHex(h, true);
                adjustSelectedInfoBlockPosition();
                evt.preventDefault();
            }.bind(undefined, hex));

            Planes[hex] = plane;
            PlanesOrdered.push(plane);
        }

        // Call the function update
        plane.updateData(now, ac);
    }
}

function fetchData() {

    if (FetchPending !== null && FetchPending.state() === 'pending') {
        // don't double up on fetches, let the last one resolve
        return;
    }

    FetchPending = $.ajax({url: 'data/aircraft.json',
        timeout: 5000,
        cache: false,
        dataType: 'json'});
    FetchPending.done(function (data) {
        var now = data.now;

        processReceiverUpdate(data);

        // update timestamps, visibility, history track for all planes - not only those updated
        for (var i = 0; i < PlanesOrdered.length; ++i) {
            var plane = PlanesOrdered[i];
            plane.updateTick(now, LastReceiverTimestamp);
        }

        selectNewPlanes();
        refreshTableInfo();
        refreshSelected();

        // Check for stale receiver data
        if (LastReceiverTimestamp === now) {
            StaleReceiverCount++;
            if (StaleReceiverCount > 5) {
                $("#update_error_detail").text("The data from dump1090 hasn't been updated in a while. Maybe dump1090 is no longer running?");
                $("#update_error").css('display', 'block');
            }
        } else {
            StaleReceiverCount = 0;
            LastReceiverTimestamp = now;
            $("#update_error").css('display', 'none');
        }
    });

    FetchPending.fail(function (jqxhr, status, error) {
        $("#update_error_detail").text("AJAX call failed (" + status + (error ? (": " + error) : "") + "). Maybe dump1090 is no longer running?");
        $("#update_error").css('display', 'block');
    });
}

var PositionHistorySize = 0;
function initialize() {
    // Set page basics
    document.title = PageName;
	$("#infoblock_name").text(PageName);

    PlaneRowTemplate = document.getElementById("plane_row_template");

    $("#loader").removeClass("hidden");

    // Set up map/sidebar splitter
    $("#sidebar_container").resizable({handles: {w: '#splitter'}});

    // Set up aircraft information panel
    $("#selected_infoblock").draggable({containment: "parent"});

    // Set up event handlers for buttons
    $("#show_map_button").click(showMap);

    // Set initial element visibility
    $("#show_map_button").hide();
    setColumnVisibility();

    // Force map to redraw if sidebar container is resized - use a timer to debounce
    var mapResizeTimeout;
    $("#sidebar_container").on("resize", function () {
        clearTimeout(mapResizeTimeout);
        mapResizeTimeout = setTimeout(updateMapSize, 10);
    });

    // check if the altitude color values are default to enable the altitude filter
    if (ColorByAlt.air.h.length === 3 && ColorByAlt.air.h[0].alt === 2000 && ColorByAlt.air.h[0].val === 20 && ColorByAlt.air.h[1].alt === 10000 && ColorByAlt.air.h[1].val === 140 && ColorByAlt.air.h[2].alt === 40000 && ColorByAlt.air.h[2].val === 300) {
        customAltitudeColors = false;
    }

    // Get receiver metadata, reconfigure using it, then continue
    // with initialization
    $.ajax({url: 'data/receiver.json',
        timeout: 5000,
        cache: false,
        dataType: 'json'})

            .done(function (data) {
                if (typeof data.lat !== "undefined") {
                    SiteShow = true;
                    SiteLat = data.lat;
                    SiteLon = data.lon;
                    DefaultCenterLat = data.lat;
                    DefaultCenterLon = data.lon;
                }

                Dump1090Version = data.version;
                RefreshInterval = data.refresh;
                PositionHistorySize = data.history;
            })

            .always(function () {
                Dump1090DB.indexedDB.getSetting("MapSettings")
                    .done(function (result) {
                        if (result.CenterLat !== null && result.CenterLat !== undefined)
                            MapSettings.CenterLat = result.CenterLat;
                        if (result.CenterLon !== null && result.CenterLon !== undefined)
                            MapSettings.CenterLon = result.CenterLon;
                        if (result.ZoomLvl !== null && result.ZoomLvl !== undefined)
                            MapSettings.ZoomLvl = result.ZoomLvl;
                        if (result.MapType !== null && result.MapType !== undefined)
                            MapSettings.MapType = result.MapType;
                        if (result.VisibleLayers !== null && result.VisibleLayers !== undefined)
                            MapSettings.VisibleLayers = result.VisibleLayers;
                        if (result.DisplayUnits !== null && result.DisplayUnits !== undefined)
                            MapSettings.DisplayUnits = result.DisplayUnits;
                        if (result.AltitudeChart !== null && result.AltitudeChart !== undefined)
                            MapSettings.AltitudeChart = result.AltitudeChart;
                        console.log("MapSettings loaded.");
                    })
                    .fail(function () {
                        MapSettings.CenterLat = DefaultCenterLat;
                        MapSettings.CenterLon = DefaultCenterLon;
                        MapSettings.ZoomLvl = DefaultZoomLvl;
                        MapSettings.MapType = 'osm';
                        MapSettings.VisibleLayers = {
                            'layer_site_pos': true,
                            'layer_ac_trail': true,
                            'layer_ac_positions': true
                        };
                        MapSettings.DisplayUnits = DefaultDisplayUnits;
                        MapSettings.AltitudeChart = true;
                        Dump1090DB.indexedDB.putSetting('MapSettings', MapSettings);
                        console.log("MapSettings initialized.");
                    })
                    .always(function () {
                        /* Do main initialization after we got the map settings from database */
                        initializeUnitsSelector();
                        initializeFilters();
                        initialize_map();
                        start_load_history();
                    });
            });
}

var CurrentHistoryFetch = null;
var PositionHistoryBuffer = [];
function start_load_history() {
    if (PositionHistorySize > 0 && window.location.hash !== '#nohistory') {
        $("#loader_progress").attr('max', PositionHistorySize);
        console.log("Starting to load history (" + PositionHistorySize + " items)");
        load_history_items();
    } else {
        end_load_history();
    }
}

function load_history_items() {
    var loaded = 0;
    for (var i = 0; i < PositionHistorySize; i++) {
        $.ajax({url: 'data/history_' + i + '.json',
            timeout: 5000,
            cache: false,
            dataType: 'json'})
                .done(function (data) {
                    if (loaded < 0)
                        return;
                    PositionHistoryBuffer.push(data); // don't care for order, will sort later
                    loaded++;
                    console.log("Loaded " + loaded + " history chunks");
                    $("#loader_progress").attr('value', loaded);
                    if (loaded >= PositionHistorySize) {
                        loaded = -1;
                        end_load_history();
                    }
                })
                .fail(function (jqxhr, status, error) {
                    if (loaded < 0)
                        return;
                    console.log("Failed to load history chunk");
                    loaded = -1;
                    end_load_history();
                });
    }
}

function end_load_history() {
    $("#loader").addClass("hidden");

    console.log("Done loading history");

    if (PositionHistoryBuffer.length > 0) {
        var now, last = 0;

        // Sort history by timestamp
        console.log("Sorting history");
        PositionHistoryBuffer.sort(function (x, y) {
            return (x.now - y.now);
        });

        // Process history
        for (var h = 0; h < PositionHistoryBuffer.length; ++h) {
            now = PositionHistoryBuffer[h].now;
            console.log("Applying history " + h + "/" + PositionHistoryBuffer.length + " at: " + now);
            processReceiverUpdate(PositionHistoryBuffer[h]);

            // update track
            console.log("Updating tracks at: " + now);
            for (var i = 0; i < PlanesOrdered.length; ++i) {
                var plane = PlanesOrdered[i];
                plane.updateTrack((now - last) + 1);
            }

            last = now;
        }

        // Final pass to update all planes to their latest state
        console.log("Final history cleanup pass");
        for (var i = 0; i < PlanesOrdered.length; ++i) {
            var plane = PlanesOrdered[i];
            plane.updateTick(now, last);
        }

        LastReceiverTimestamp = last;
    }

    PositionHistoryBuffer = null;

    console.log("Completing init");

    restoreSessionFilters();

    refreshTableInfo();
    refreshSelected();
    reaper();

    // Setup our timer to poll from the server.
    window.setInterval(fetchData, RefreshInterval);
    window.setInterval(reaper, 60000);

    // And kick off one refresh immediately.
    fetchData();

}

// Make a LineString with 'points'-number points
// that is a closed circle on the sphere such that the
// great circle distance from 'center' to each point is
// 'radius' meters
function make_geodesic_circle(center, radius, points) {
    var angularDistance = radius / 6378137.0;
    var lon1 = center[0] * Math.PI / 180.0;
    var lat1 = center[1] * Math.PI / 180.0;
    var geom = null;
    for (var i = 0; i <= points; ++i) {
        var bearing = i * 2 * Math.PI / points;

        var lat2 = Math.asin(Math.sin(lat1) * Math.cos(angularDistance) +
                Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing));
        var lon2 = lon1 + Math.atan2(Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
                Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2));

        lat2 = lat2 * 180.0 / Math.PI;
        lon2 = lon2 * 180.0 / Math.PI;
        if(geom === null) {
            geom = new ol.geom.LineString([lon2, lat2],'XY');
        } else {
            geom.appendCoordinate([lon2, lat2]);
        }
    }
    return geom;
}

// Initalizes the map and starts up our timers to call various functions
function initialize_map() {
    // Set SitePosition, initialize sorting
    if (SiteShow && (typeof SiteLat !== 'undefined') && (typeof SiteLon !== 'undefined')) {
        SitePosition = [SiteLon, SiteLat];
        sortByDistance();
    } else {
        SitePosition = null;
        PlaneRowTemplate.cells[10].style.display = 'none'; // hide distance column
        document.getElementById("distance").style.display = 'none'; // hide distance header
        sortByAltitude();
    }

    // Maybe hide flag info
    if (!ShowFlags) {
        PlaneRowTemplate.cells[1].style.display = 'none'; // hide flag column
        document.getElementById("flag").style.display = 'none'; // hide flag header
        document.getElementById("infoblock_country").style.display = 'none'; // hide country row
    }

    $("#alt_chart_checkbox").checkboxradio({ icon: false });
    $("#alt_chart_checkbox").prop('checked', MapSettings.AltitudeChart).checkboxradio("refresh");
    $("#alt_chart_checkbox").on("change", function(){
        var showAltChart = $(this).prop('checked');
        MapSettings.AltitudeChart = showAltChart;
        Dump1090DB.indexedDB.putSetting('MapSettings', MapSettings);
        // if you're using custom colors always hide the chart
        if (customAltitudeColors === true) {
            showAltChart = false;
            $('#altitude_chart_checkbox').hide();
        }
	if (showAltChart) {
		$('#altitude_chart').show();
	} else {
		$('#altitude_chart').hide();
	}
    });
    $("#alt_chart_checkbox").trigger("change");

    // Initialize OL3

    layers = createBaseLayers();

    var iconsLayer = new ol.layer.Vector({
        name: 'ac_positions',
        type: 'overlay',
        title: 'Aircraft positions',
        source: new ol.source.Vector({
            features: PlaneIconFeatures,
        })
    });

    layers.push(new ol.layer.Group({
        title: 'Overlays',
        layers: [
            new ol.layer.Vector({
                name: 'site_pos',
                type: 'overlay',
                title: 'Site position and range rings',
                source: new ol.source.Vector({
                    features: StaticFeatures,
                })
            }),

            new ol.layer.Vector({
                name: 'ac_trail',
                type: 'overlay',
                title: 'Selected aircraft trail',
                source: new ol.source.Vector({
                    features: PlaneTrailFeatures,
                })
            }),

            iconsLayer
        ]
    }));

    var foundType = false;

    layers.forEach(function (layergroup, index) {
        ol.control.LayerSwitcher.forEachRecursive(layergroup, function (lyr) {
            if (!lyr.get('name'))
                return;

            if (lyr.get('type') === 'base') {
                if (MapSettings.MapType === lyr.get('name')) {
                    foundType = true;
                    lyr.setVisible(true);
                } else {
                    lyr.setVisible(false);
                }

                lyr.on('change:visible', function (evt) {
                    if (evt.target.getVisible()) {
                        MapSettings.MapType = evt.target.get('name');
                        Dump1090DB.indexedDB.putSetting('MapSettings', MapSettings);
                    }
                });
            } else if (lyr.get('type') === 'overlay') {
                var n = 'layer_' + lyr.get('name');
                var visible = MapSettings.VisibleLayers[n];
                if (visible !== undefined) {
                    // javascript, why must you taunt me with gratuitous type problems
                    lyr.setVisible(visible);
                }

                lyr.on('change:visible', function (evt) {
                    var n = 'layer_' + evt.target.get('name');
                    MapSettings.VisibleLayers[n] = evt.target.getVisible();
                    Dump1090DB.indexedDB.putSetting('MapSettings', MapSettings);
                });
            }
        });
    });

    if (!foundType) {
        layers.forEach(function (layergroup, index) {
            ol.control.LayerSwitcher.forEachRecursive(layergroup, function (lyr) {
                if (foundType)
                    return;
                if (lyr.get('type') === 'base') {
                    lyr.setVisible(true);
                    foundType = true;
                }
            });
        });
    }

    OLMap = new ol.Map({
        target: 'map_canvas',
        layers: layers,
        view: new ol.View({
            center: ol.proj.fromLonLat([MapSettings.CenterLon, MapSettings.CenterLat]),
            zoom: MapSettings.ZoomLvl
        }),
        controls: [new ol.control.Zoom(),
            new ol.control.Rotate(),
            new ol.control.Attribution({collapsed: false}),
            new ol.control.ScaleLine({units: MapSettings.DisplayUnits}),
            new ol.control.LayerSwitcher(),
            new MapControls()
        ],
        loadTilesWhileAnimating: true,
        loadTilesWhileInteracting: true
    });

    // Listeners for newly created Map
    OLMap.getView().on('change:center', function (event) {
        var center = ol.proj.toLonLat(OLMap.getView().getCenter(), OLMap.getView().getProjection());
        MapSettings.CenterLon = center[0];
        MapSettings.CenterLat = center[1];
        Dump1090DB.indexedDB.putSetting('MapSettings', MapSettings);

        if (FollowSelected) {
            // On manual navigation, disable follow
            var selected = Planes[SelectedPlane];
            if (typeof selected === 'undefined' ||
                    (Math.abs(center[0] - selected.position[0]) > 0.0001 &&
                            Math.abs(center[1] - selected.position[1]) > 0.0001)) {
                FollowSelected = false;
                refreshSelected();
            }
        }
    });

    OLMap.getView().on('change:resolution', function (event) {
        MapSettings.ZoomLvl = OLMap.getView().getZoom();
        Dump1090DB.indexedDB.putSetting('MapSettings', MapSettings);
        for (var plane in Planes) {
            Planes[plane].updateMarker(false);
        }
        ;
    });

    OLMap.on(['click', 'dblclick'], function (evt) {
        var hex = evt.map.forEachFeatureAtPixel(evt.pixel,
                function (feature, layer) {
                    return feature.hex;
                },
                {hitTolerance: 3},
                function (layer) {
                    return (layer === iconsLayer);
                },
                null);
        if (hex) {
            selectPlaneByHex(hex, (evt.type === 'dblclick'));
            adjustSelectedInfoBlockPosition();
            evt.stopPropagation();
        } else {
            deselectAllPlanes();
            evt.stopPropagation();
        }
    });

    if (ShowHoverOverLabels)  {
        var overlay = new ol.Overlay({
            element: document.getElementById('popinfo'),
            positioning: 'bottom-left'
        });
        overlay.setMap(OLMap);

        // trap mouse moving over
        OLMap.on('pointermove', function (evt) {
            var feature = OLMap.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
                overlay.setPosition(evt.coordinate);
                var popname = feature.get('name');
                if (popname === '~') {
                    var vsi = '';
                    if (Planes[feature.hex].vert_rate > 256) {
                        vsi = 'climbing';
                    } else {
                        if (Planes[feature.hex].vert_rate < -256) {
                            vsi = 'descending';
                        } else
                            vsi = 'level';
                    }
                    ;

                    var alt_text = Math.round(convert_altitude(Planes[feature.hex].altitude, MapSettings.DisplayUnits)) + NBSP + get_unit_label("altitude", MapSettings.DisplayUnits);

                    if (ShowAdditionalData) {
                        popname = (Planes[feature.hex].typeDescription ? Planes[feature.hex].typeDescription : 'Unknown aircraft type');
                        popname = popname + ' [' + (Planes[feature.hex].species ? Planes[feature.hex].species : '?') + ']';

                        popname = popname + '\n(' + (Planes[feature.hex].flight ? Planes[feature.hex].flight.trim() : 'No Call') + ')';
                        popname = popname + ' #' + feature.hex.toUpperCase();

                        popname = popname + '\n' + (Planes[feature.hex].altitude ? alt_text : '?');
                        popname = popname + ' and ' + vsi;

                        popname = popname + ' ' + (Planes[feature.hex].operator ? Planes[feature.hex].operator : '');
                    } else {
                        popname = 'ICAO: ' + Planes[feature.hex].icao;
                        popname = popname + '\nFlt:  ' + (Planes[feature.hex].flight ? Planes[feature.hex].flight : '?');
                        popname = popname + '\nType: ' + (Planes[feature.hex].icaotype ? Planes[feature.hex].icaotype : '?');
                        popname = popname + '\nReg:  ' + (Planes[feature.hex].registration ? Planes[feature.hex].registration : '?');
                        popname = popname + '\nAlt:  ' + (Planes[feature.hex].altitude ? alt_text : '?');
                    }
                    overlay.getElement().innerHTML = (popname ? popname : '');
                    return feature;
                } else
                    return null;
            }, {hitTolerance: 3}, function (layer) {
                //return (layer == iconsLayer) ;
                return (layer === iconsLayer);
            });

            overlay.getElement().style.display = feature ? '' : 'none'; // EAK--> Needs GMAP/INDEX.HTML
            document.body.style.cursor = feature ? 'pointer' : '';
        });
    } else {
        var overlay = new ol.Overlay({
            element: document.getElementById('popinfo'),
            positioning: 'bottom-left'
        });
        overlay.setMap(OLMap);
    }

    // Add home marker if requested
    if (SitePosition) {
        var markerStyle = new ol.style.Style({
            image: new ol.style.Circle({
                radius: 7,
                snapToPixel: false,
                fill: new ol.style.Fill({color: 'black'}),
                stroke: new ol.style.Stroke({
                    color: 'white', width: 2
                })
            })
        });

        var feature = new ol.Feature(new ol.geom.Point(ol.proj.fromLonLat(SitePosition)));
        feature.setStyle(markerStyle);
        StaticFeatures.push(feature);

        if (SiteCircles) {
            createSiteCircleFeatures();
        }
    }

    // Add terrain-limit rings. To enable this:
    //
    //  create a panorama for your receiver location on heywhatsthat.com
    //
    //  note the "view" value from the URL at the top of the panorama
    //    i.e. the XXXX in http://www.heywhatsthat.com/?view=XXXX
    //
    // fetch a json file from the API for the altitudes you want to see:
    //
    //  wget -O /usr/share/dump1090-mutability/html/upintheair.json \
    //    'http://www.heywhatsthat.com/api/upintheair.json?id=XXXX&refraction=0.25&alts=3048,9144'
    //
    // NB: altitudes are in _meters_, you can specify a list of altitudes

    // kick off an ajax request that will add the rings when it's done
    var request = $.ajax({url: 'upintheair.json',
        timeout: 5000,
        cache: true,
        dataType: 'json'});
    request.done(function (data) {
        var ringStyle = new ol.style.Style({
            fill: null,
            stroke: new ol.style.Stroke({
                color: '#000000',
                width: 1
            })
        });

        for (var i = 0; i < data.rings.length; ++i) {
            var geom = new ol.geom.LineString();
            var points = data.rings[i].points;
            if (points.length > 0) {
                for (var j = 0; j < points.length; ++j) {
                    geom.appendCoordinate([points[j][1], points[j][0]]);
                }
                geom.appendCoordinate([points[0][1], points[0][0]]);
                geom.transform('EPSG:4326', 'EPSG:3857');

                var feature = new ol.Feature(geom);
                feature.setStyle(ringStyle);
                StaticFeatures.push(feature);
            }
        }
    });

    request.fail(function (jqxhr, status, error) {
        // no rings available, do nothing
    });
}

function createSiteCircleFeatures() {
    // Clear existing circles first
    SiteCircleFeatures.forEach(function (circleFeature) {
        StaticFeatures.remove(circleFeature);
    });
    SiteCircleFeatures.clear();

    var circleStyle = function (distance) {
        return new ol.style.Style({
            fill: null,
            stroke: new ol.style.Stroke({
                color: '#000000',
                width: 1
            }),
            text: new ol.style.Text({
                font: '10px Helvetica Neue, sans-serif',
                fill: new ol.style.Fill({color: '#000'}),
                offsetY: -8,
                text: format_distance_long(distance, MapSettings.DisplayUnits, 0)

            })
        });
    };

    var conversionFactor = 1000.0;
    if (MapSettings.DisplayUnits === "nautical") {
        conversionFactor = 1852.0;
    } else if (MapSettings.DisplayUnits === "imperial") {
        conversionFactor = 1609.0;
    }

    for (var i = 0; i < SiteCirclesDistances.length; ++i) {
        var distance = SiteCirclesDistances[i] * conversionFactor;
        var circle = make_geodesic_circle(SitePosition, distance, 360);
        circle.transform('EPSG:4326', 'EPSG:3857');
        var feature = new ol.Feature(circle);
        feature.setStyle(circleStyle(distance));
        StaticFeatures.push(feature);
        SiteCircleFeatures.push(feature);
    }
}

// This looks for planes to reap out of the master Planes variable
function reaper() {
    //console.log("Reaping started..");

    // Look for planes where we have seen no messages for >300 seconds
    var newPlanes = [];
    for (var i = 0; i < PlanesOrdered.length; ++i) {
        var plane = PlanesOrdered[i];
        if (plane.seen > 300) {
            // Reap it.
            plane.tr.parentNode.removeChild(plane.tr);
            plane.tr = null;
            delete Planes[plane.icao];
            plane.destroy();
        } else {
            // Keep it.
            newPlanes.push(plane);
        }
    };

    PlanesOrdered = newPlanes;
    refreshTableInfo();
    refreshSelected();
}

// Page Title update function
function refreshPageTitle() {
    if (!PlaneCountInTitle && !MessageRateInTitle) {
        document.title = PageName;
        return;
    }

    var subtitle = "";

    if (PlaneCountInTitle) {
        subtitle += TrackedAircraftPositions + '/' + TrackedAircraft;
    }

    if (MessageRateInTitle) {
        if (subtitle)
            subtitle += ' | ';
        subtitle += MessageRate.toFixed(1) + '/s';
    }

    document.title = PageName + ' - ' + subtitle;
}

// Refresh the detail window about the plane
function refreshSelected() {
    if (MessageCountHistory.length > 1) {
        var message_time_delta = MessageCountHistory[MessageCountHistory.length - 1].time - MessageCountHistory[0].time;
        var message_count_delta = MessageCountHistory[MessageCountHistory.length - 1].messages - MessageCountHistory[0].messages;
        if (message_time_delta > 0)
            MessageRate = message_count_delta / message_time_delta;
    } else {
        MessageRate = null;
    }

    refreshPageTitle();

    var selected = false;
    if (typeof SelectedPlane !== 'undefined' && SelectedPlane !== "ICAO" && SelectedPlane !== null) {
        selected = Planes[SelectedPlane];
    }

    $('#dump1090_version').text(Dump1090Version);
    $('#dump1090_total_ac').text(TrackedAircraft+'/'+TrackedAircraftUnknown);
    $('#dump1090_total_ac_positions').text(TrackedAircraftPositions);
    $('#dump1090_total_history').text(TrackedHistorySize);

    if (MessageRate !== null) {
        $('#dump1090_message_rate').text(MessageRate.toFixed(1));
    } else {
        $('#dump1090_message_rate').text("n/a");
    }

    setSelectedInfoBlockVisibility();

    if (!selected) {
        return;
    }

    if (selected.flight !== null && selected.flight !== "") {
        $('#selected_flightid').text(selected.flight);
    } else {
        $('#selected_flightid').text('n/a');
    }

    if (selected.operator !== null) {
        $('#selected_operator').text(selected.operator);
        $('#infoblock_operator').removeClass('hidden');
    } else {
        $('#infoblock_operator').addClass('hidden');
    }

    if (selected.callsign !== null && selected.callsign !== "") {
        $('#selected_callsign').text(selected.callsign);
        $('#infoblock_callsign').removeClass('hidden');
    } else {
        $('#infoblock_callsign').addClass('hidden');
    }

    if (selected.registration !== null) {
        $('#selected_registration').text(selected.registration);
    } else {
        $('#selected_registration').text("");
    }

    if (selected.icaotype !== null) {
        $('#selected_icaotype').text(selected.icaotype);
    } else {
        $('#selected_icaotype').text("");
    }

    if (selected.typeDescription !== null) {
        $('#selected_desc').text(selected.typeDescription);
        $('#selected_icaotype').text("");
    } else {
        $('#selected_desc').text("");
    }

    var emerg = document.getElementById('selected_emergency');
    if (selected.squawk in SpecialSquawks) {
        emerg.className = SpecialSquawks[selected.squawk].cssClass;
        emerg.textContent = NBSP + 'Squawking: ' + SpecialSquawks[selected.squawk].text + NBSP;
    } else {
        emerg.className = 'hidden';
    }

    $("#selected_altitude").text(format_altitude_long(selected.altitude, selected.vert_rate, MapSettings.DisplayUnits));

    if (selected.squawk === null || selected.squawk === '0000') {
        $('#selected_squawk').text('n/a');
    } else {
        $('#selected_squawk').text(selected.squawk);
    }

    $('#selected_icao').text(selected.icao.toUpperCase()).attr("href", "https://www.planespotters.net/search?q="+selected.icao);

    $('#selected_speed_gs').text(format_speed_long(selected.gs, MapSettings.DisplayUnits));
    $('#selected_vertical_rate').text(format_vert_rate_long(selected.vert_rate, MapSettings.DisplayUnits));
    $('#airframes_post_icao').attr('value', selected.icao);
    $('#selected_track').text(format_track_long(selected.track));

    if (selected.seen <= 1) {
        $('#selected_seen').text('now');
    } else {
        $('#selected_seen').text(selected.seen.toFixed(1) + 's');
    }

    if (selected.civilmil !== null) {
        if (selected.civilmil === true) {
            $('#selected_civilmil').text("Military");
        } else {
            $('#selected_civilmil').text("Civil");
        }
    } else {
        $('#selected_civilmil').text("Country of");
    }

    if ((selected.interesting !== null && selected.interesting === true) || selected.highlight === true) {
        $('#infoblock_head').addClass('interesting');
    } else {
        $('#infoblock_head').removeClass('interesting');
    }

    $('#selected_country').text(selected.icaorange.country);
    if (ShowFlags && selected.icaorange.flag_image !== null) {
        $('#selected_flag').removeClass('hidden');
        $('#selected_flag img').attr('src', FlagPath + selected.icaorange.flag_image);
        $('#selected_flag img').attr('title', selected.icaorange.country);
    } else {
        $('#selected_flag').addClass('hidden');
    }

    if (selected.position === null) {
        $('#selected_position').text('n/a');
        $('#selected_follow').addClass('hidden');
    } else {

        if (selected.seen_pos > 1) {
            $('#selected_position').text(format_latlng(selected.position));
        } else {
            $('#selected_position').text(format_latlng(selected.position));
        }

        $('#selected_follow').removeClass('hidden');
        if (FollowSelected) {
            $('#selected_follow').css('font-weight', 'bold');
            OLMap.getView().setCenter(ol.proj.fromLonLat(selected.position));
        } else {
            $('#selected_follow').css('font-weight', 'normal');
        }
    }

	$('#selected_source').text(format_data_source(selected.getDataSource()));

    $('#selected_sitedist').text(format_distance_long(selected.sitedist, MapSettings.DisplayUnits));
    $('#selected_rssi').text(selected.rssi.toFixed(1) + ' dBFS');
    $('#selected_message_count').text(selected.messages);

    $('#selected_altitude_geom').text(format_altitude_long(selected.alt_geom, selected.geom_rate, MapSettings.DisplayUnits));
    $('#selected_heading_mag').text(format_track_long(selected.mag_heading));
    $('#selected_heading_true').text(format_track_long(selected.true_heading));
    $('#selected_speed_ias').text(format_speed_long(selected.ias, MapSettings.DisplayUnits));
    $('#selected_speed_tas').text(format_speed_long(selected.tas, MapSettings.DisplayUnits));

    if (selected.mach === null) {
        $('#selected_speed_mach').text('n/a');
    } else {
        $('#selected_speed_mach').text(selected.mach.toFixed(3));
    }

    if (selected.roll === null) {
        $('#selected_roll').text('n/a');
    } else {
        $('#selected_roll').text(selected.roll.toFixed(1));
    }

    if (selected.track_rate === null) {
        $('#selected_track_rate').text('n/a');
    } else {
        $('#selected_track_rate').text(selected.track_rate.toFixed(2));
    }

    $('#selected_geom_rate').text(format_vert_rate_long(selected.geom_rate, MapSettings.DisplayUnits));

    if (selected.nav_qnh === null) {
        $('#selected_nav_qnh').text("n/a");
    } else {
        $('#selected_nav_qnh').text(selected.nav_qnh.toFixed(1) + " hPa");
    }
    $('#selected_nav_altitude').text(format_altitude_long(selected.nav_altitude, 0, MapSettings.DisplayUnits));
    $('#selected_nav_heading').text(format_track_long(selected.nav_heading));
    if (selected.nav_modes === null) {
        $('#selected_nav_modes').text("n/a");
    } else {
        $('#selected_nav_modes').text(selected.nav_modes.join());
    }
    if (selected.nic_baro === null) {
        $('#selected_nicbaro').text("n/a");
    } else {
        if (selected.nic_baro === 1) {
            $('#selected_nicbaro').text("cross-checked");
        } else {
            $('#selected_nicbaro').text("not cross-checked");
        }
    }

    $('#selected_nacp').text(format_nac_p(selected.nac_p));
    $('#selected_nacv').text(format_nac_v(selected.nac_v));
    if (selected.rc === null) {
        $('#selected_rc').text("n/a");
    } else if (selected.rc === 0) {
        $('#selected_rc').text("Unknown");
    } else {
        $('#selected_rc').text(format_distance_short(selected.rc, MapSettings.DisplayUnits));
    }

    if (selected.sil === null || selected.sil_type === null) {
        $('#selected_sil').text("n/a");
    } else {
        var sampleRate = "";
        var silDesc = "";
        if (selected.sil_type === "perhour") {
            sampleRate = " per flight hour";
        } else if (selected.sil_type === "persample") {
            sampleRate = " per sample";
        }

        switch (selected.sil) {
            case 0:
                silDesc = "&gt; 1×10<sup>-3</sup>";
                break;
            case 1:
                silDesc = "≤ 1×10<sup>-3</sup>";
                break;
            case 2:
                silDesc = "≤ 1×10<sup>-5</sup>";
                break;
            case 3:
                silDesc = "≤ 1×10<sup>-7</sup>";
                break;
            default:
                silDesc = "n/a";
                sampleRate = "";
                break;
        }
        $('#selected_sil').html(silDesc + sampleRate);
    }

    if (selected.version === null) {
        $('#selected_adsb_version').text('none');
    } else if (selected.version === 0) {
        $('#selected_adsb_version').text('v0 (DO-260)');
    } else if (selected.version === 1) {
        $('#selected_adsb_version').text('v1 (DO-260A)');
    } else if (selected.version === 2) {
        $('#selected_adsb_version').text('v2 (DO-260B)');
    } else {
        $('#selected_adsb_version').text('v' + selected.version);
    }

    // Wind speed and direction
    if(selected.gs !== null && selected.tas !== null && selected.track !== null && selected.mag_heading !== null) {
        selected.track = (selected.track || 0) * 1 || 0;
        selected.mag_heading = (selected.mag_heading || 0) * 1 || 0;
        selected.tas = (selected.tas || 0) * 1 || 0;
        selected.gs = (selected.gs || 0) * 1 || 0;
        var trk = (Math.PI / 180) * selected.track;
        var hdg = (Math.PI / 180) * selected.mag_heading;
        var ws = Math.round(Math.sqrt(Math.pow(selected.tas - selected.gs, 2) + 4 * selected.tas * selected.gs * Math.pow(Math.sin((hdg - trk) / 2), 2)));
        var wd = trk + Math.atan2(selected.tas * Math.sin(hdg - trk), selected.tas * Math.cos(hdg - trk) - selected.gs);
        if (wd < 0) {
            wd = wd + 2 * Math.PI;
        }
        if (wd > 2 * Math.PI) {
            wd = wd - 2 * Math.PI;
        }
        wd = Math.round((180 / Math.PI) * wd);
        $('#selected_wind_speed').text(format_speed_long(ws, MapSettings.DisplayUnits));
        $('#selected_wind_direction').text(format_track_long(wd));

        $("#wind_arrow").show();
        var C = Math.PI / 180;
        var arrowx1 = 20 - 12 * Math.sin(C * wd);
        var arrowx2 = 20 + 12 * Math.sin(C * wd);
        var arrowy1 = 20 + 12 * Math.cos(C * wd);
        var arrowy2 = 20 - 12 * Math.cos(C * wd);
        $("#wind_arrow").attr('x1', arrowx1);
        $("#wind_arrow").attr('x2', arrowx2);
        $("#wind_arrow").attr('y1', arrowy1);
        $("#wind_arrow").attr('y2', arrowy2);
    } else {
        $("#wind_arrow").hide();
        $('#selected_wind_speed').text('n/a');
        $('#selected_wind_direction').text('n/a');
    }
}

// Refreshes the larger table of all the planes
function refreshTableInfo() {
    TrackedAircraft = 0;
    TrackedAircraftPositions = 0;
    TrackedAircraftUnknown = 0;
    TrackedHistorySize = 0;

    $(".altitudeUnit").text(get_unit_label("altitude", MapSettings.DisplayUnits));
    $(".speedUnit").text(get_unit_label("speed", MapSettings.DisplayUnits));
    $(".distanceUnit").text(get_unit_label("distance", MapSettings.DisplayUnits));
    $(".verticalRateUnit").text(get_unit_label("verticalRate", MapSettings.DisplayUnits));

    for (var i = 0; i < PlanesOrdered.length; ++i) {
        var tableplane = PlanesOrdered[i];
        TrackedHistorySize += tableplane.history_size;
        if (tableplane.seen >= 58 || tableplane.isFiltered()) {
            tableplane.tr.className = "plane_table_row hidden";
        } else {
            TrackedAircraft++;
            if(tableplane.civilmil === null) {
                TrackedAircraftUnknown++;
            }
            var classes = "plane_table_row";

            if (tableplane.position !== null && tableplane.seen_pos < 60) {
                ++TrackedAircraftPositions;
                if (tableplane.position_from_mlat)
                    classes += " mlat";
                else
                    classes += " vPosition";
            }
            if (tableplane.interesting === true || tableplane.highlight === true)
                classes += " interesting";

            if (tableplane.icao === SelectedPlane)
                classes += " selected";

            if (tableplane.squawk in SpecialSquawks) {
                classes = classes + " " + SpecialSquawks[tableplane.squawk].cssClass;
            }

            // ICAO doesn't change
            if (tableplane.flight) {
                tableplane.tr.cells[2].innerHTML = tableplane.flight;
                if (tableplane.operator !== null) {
                    tableplane.tr.cells[2].title = tableplane.operator;
                }
            } else {
                tableplane.tr.cells[2].innerHTML = "";
            }

			var v = '';
			if (tableplane.version === 0) {
				v = ' v0 (DO-260)';
			} else if (tableplane.version === 1) {
				v = ' v1 (DO-260A)';
			} else if (tableplane.version === 2) {
				v = ' v2 (DO-260B)';
			}

            tableplane.tr.cells[3].textContent = (tableplane.registration !== null ? tableplane.registration : "");
            tableplane.tr.cells[4].textContent = (tableplane.civilmil !== null ? (tableplane.civilmil === true ? "Mil" : "Civ") : "");
            tableplane.tr.cells[5].textContent = (tableplane.icaotype !== null ? tableplane.icaotype : "");
            tableplane.tr.cells[6].textContent = (tableplane.squawk !== null ? tableplane.squawk : "");
            tableplane.tr.cells[7].innerHTML = format_altitude_brief(tableplane.altitude, tableplane.vert_rate, MapSettings.DisplayUnits);
            tableplane.tr.cells[8].textContent = format_speed_brief(tableplane.speed, MapSettings.DisplayUnits);
            tableplane.tr.cells[9].textContent = format_vert_rate_brief(tableplane.vert_rate, MapSettings.DisplayUnits);
            tableplane.tr.cells[10].textContent = format_distance_brief(tableplane.sitedist, MapSettings.DisplayUnits);
            tableplane.tr.cells[11].textContent = format_track_brief(tableplane.track);
            tableplane.tr.cells[12].textContent = tableplane.messages;
            tableplane.tr.cells[13].textContent = tableplane.seen.toFixed(0);
            tableplane.tr.cells[14].textContent = (tableplane.rssi !== null ? tableplane.rssi : "");
            tableplane.tr.cells[15].textContent = (tableplane.position !== null ? tableplane.position[1].toFixed(4) : "");
            tableplane.tr.cells[16].textContent = (tableplane.position !== null ? tableplane.position[0].toFixed(4) : "");
            tableplane.tr.cells[17].textContent = format_data_source(tableplane.getDataSource()) + v;
            tableplane.tr.className = classes;
        }
    }
    resortTable();
}

//
// ---- table sorting ----
//

function compareAlpha(xa, ya) {
    if (xa === ya)
        return 0;
    if (xa < ya)
        return -1;
    return 1;
}

function compareNumeric(xf, yf) {
    if (Math.abs(xf - yf) < 1e-9)
        return 0;

    return xf - yf;
}

function sortByICAO() {
    sortBy('icao', compareAlpha, function (x) {
        return x.icao;
    });
}
function sortByFlight() {
    sortBy('flight', compareAlpha, function (x) {
        return x.flight;
    });
}
function sortByRegistration() {
    sortBy('registration', compareAlpha, function (x) {
        return x.registration;
    });
}
function sortByAircraftType() {
    sortBy('icaotype', compareAlpha, function (x) {
        return x.icaotype;
    });
}
function sortBySquawk() {
    sortBy('squawk', compareAlpha, function (x) {
        return x.squawk;
    });
}
function sortByAltitude() {
    sortBy('altitude', compareNumeric, function (x) {
        return (x.altitude === "ground" ? -1e9 : x.altitude);
    });
}
function sortBySpeed() {
    sortBy('speed', compareNumeric, function (x) {
        return x.speed;
    });
}
function sortByVerticalRate() {
    sortBy('vert_rate', compareNumeric, function (x) {
        return x.vert_rate;
    });
}
function sortByDistance() {
    sortBy('sitedist', compareNumeric, function (x) {
        return x.sitedist;
    });
}
function sortByTrack() {
    sortBy('track', compareNumeric, function (x) {
        return x.track;
    });
}
function sortByMsgs() {
    sortBy('msgs', compareNumeric, function (x) {
        return x.messages;
    });
}
function sortBySeen() {
    sortBy('seen', compareNumeric, function (x) {
        return x.seen;
    });
}
function sortByCountry() {
    sortBy('country', compareAlpha, function (x) {
        return x.icaorange.country;
    });
}
function sortByRssi() {
    sortBy('rssi', compareNumeric, function (x) {
        return x.rssi;
    });
}
function sortByLatitude() {
    sortBy('lat', compareNumeric, function (x) {
        return (x.position !== null ? x.position[1] : null);
    });
}
function sortByLongitude() {
    sortBy('lon', compareNumeric, function (x) {
        return (x.position !== null ? x.position[0] : null);
    });
}
function sortByDataSource() {
    sortBy('data_source', compareAlpha, function (x) {
        return x.getDataSource();
    });
}
function sortByCivilMil() {
    sortBy('civilmil', compareAlpha, function (x) {
        return x.civilmil;
    });
}

var sortId = '';
var sortCompare = null;
var sortExtract = null;
var sortAscending = true;

function sortFunction(x, y) {
    var xv = x._sort_value;
    var yv = y._sort_value;

    // Put aircrafts marked interesting always on top of the list
    if (x.interesting === true)
        return -1;
    if (y.interesting === true)
        return 1;

    // Put aircrafts with special squawks on to of the list
    if (x.squawk in SpecialSquawks)
        return -1;
    if (y.squawk in SpecialSquawks)
        return 1;

    // always sort missing values at the end, regardless of
    // ascending/descending sort
    if (xv === null && yv === null)
        return x._sort_pos - y._sort_pos;
    if (xv === null)
        return 1;
    if (yv === null)
        return -1;

    var c = sortAscending ? sortCompare(xv, yv) : sortCompare(yv, xv);
    if (c !== 0)
        return c;

    return x._sort_pos - y._sort_pos;
}

function resortTable() {
    // number the existing rows so we can do a stable sort
    // regardless of whether sort() is stable or not.
    // Also extract the sort comparison value.
    for (var i = 0; i < PlanesOrdered.length; ++i) {
        PlanesOrdered[i]._sort_pos = i;
        PlanesOrdered[i]._sort_value = sortExtract(PlanesOrdered[i]);
    }

    PlanesOrdered.sort(sortFunction);

    var tbody = document.getElementById('tableinfo').tBodies[0];
    for (var i = 0; i < PlanesOrdered.length; ++i) {
        tbody.appendChild(PlanesOrdered[i].tr);
    }
}

function sortBy(id, sc, se) {
    if (id !== 'data_source') {
        $('#grouptype_checkbox').removeClass('settingsCheckboxChecked');
    } else {
        $('#grouptype_checkbox').addClass('settingsCheckboxChecked');
    }
    if (id === sortId) {
        sortAscending = !sortAscending;
        PlanesOrdered.reverse(); // this correctly flips the order of rows that compare equal
    } else {
        sortAscending = true;
    }

    sortId = id;
    sortCompare = sc;
    sortExtract = se;

    resortTable();
}

function selectPlaneByHex(hex, autofollow) {
    //console.log("select: " + hex);
    // If SelectedPlane has something in it, clear out the selected
    if (SelectedAllPlanes) {
        deselectAllPlanes();
    }

    if (SelectedPlane !== null) {
        Planes[SelectedPlane].selected = false;
        Planes[SelectedPlane].clearLines();
        Planes[SelectedPlane].updateMarker(false);
        $(Planes[SelectedPlane].tr).removeClass("selected");
    }

    // If we are clicking the same plane, we are deselecting it.
    // (unless it was a doubleclick..)
    if (SelectedPlane === hex && !autofollow) {
        hex = null;
    }

    if (hex !== null) {
        // Assign the new selected
        SelectedPlane = hex;
        Planes[SelectedPlane].selected = true;
        Planes[SelectedPlane].updateLines();
        Planes[SelectedPlane].updateMarker(false);
        $(Planes[SelectedPlane].tr).addClass("selected");
    } else {
        SelectedPlane = null;
    }

    if (SelectedPlane !== null && autofollow) {
        FollowSelected = true;
        if (OLMap.getView().getZoom() < 8)
            OLMap.getView().setZoom(8);
    } else {
        FollowSelected = false;
    }

    refreshSelected();
}

// loop through the planes and mark them as selected to show the paths for all planes
function selectAllPlanes() {
    // if all planes are already selected, deselect them all
    if (SelectedAllPlanes) {
        deselectAllPlanes();
    } else {
        // If SelectedPlane has something in it, clear out the selected
        if (SelectedPlane !== null) {
            Planes[SelectedPlane].selected = false;
            Planes[SelectedPlane].clearLines();
            Planes[SelectedPlane].updateMarker(false);
            $(Planes[SelectedPlane].tr).removeClass("selected");
        }

        SelectedPlane = null;
        SelectedAllPlanes = true;

        for (var key in Planes) {
            if (Planes[key].visible && !Planes[key].isFiltered()) {
                Planes[key].selected = true;
                Planes[key].updateLines();
                Planes[key].updateMarker(false);
            }
        }
    }

    $('#selectall_checkbox').addClass('settingsCheckboxChecked');

    refreshSelected();
}

// on refreshes, try to find new planes and mark them as selected
function selectNewPlanes() {
    if (SelectedAllPlanes) {
        for (var key in Planes) {
            if (!Planes[key].visible || Planes[key].isFiltered()) {
                Planes[key].selected = false;
                Planes[key].clearLines();
                Planes[key].updateMarker(false);
            } else {
                if (Planes[key].selected !== true) {
                    Planes[key].selected = true;
                    Planes[key].updateLines();
                    Planes[key].updateMarker(false);
                }
            }
        }
    }
}

// deselect all the planes
function deselectAllPlanes() {
    for (var key in Planes) {
        Planes[key].selected = false;
        Planes[key].clearLines();
        Planes[key].updateMarker(false);
        $(Planes[key].tr).removeClass("selected");
    }
    $('#selectall_checkbox').removeClass('settingsCheckboxChecked');
    SelectedPlane = null;
    SelectedAllPlanes = false;
    refreshSelected();
}

function toggleFollowSelected() {
    FollowSelected = !FollowSelected;
    if (FollowSelected && OLMap.getView().getZoom() < 8)
        OLMap.getView().setZoom(8);
    refreshSelected();
}

function resetMap() {
    // Reset map settings
    MapSettings.CenterLat = DefaultCenterLat;
    MapSettings.CenterLon = DefaultCenterLon;
    MapSettings.ZoomLvl = DefaultZoomLvl;
    Dump1090DB.indexedDB.putSetting('MapSettings', MapSettings);

    // Set and refresh
    OLMap.getView().setZoom(MapSettings.ZoomLvl);
    OLMap.getView().setCenter(ol.proj.fromLonLat([MapSettings.CenterLon, MapSettings.CenterLat]));

    selectPlaneByHex(null, false);
}

function updateMapSize() {
    OLMap.updateSize();
}

function toggleSidebarVisibility(e) {
    e.preventDefault();
    $("#sidebar_container").hide();
    $("#toggle_sidebar_button").removeClass("show_sidebar");
    $("#toggle_sidebar_button").addClass("hide_sidebar");
    updateMapSize();
}

function expandSidebar(e) {
    e.preventDefault();
    if ($("#sidebar_container").is(":visible") === false) {
        $("#sidebar_container").show();
        $("#toggle_sidebar_button").addClass("show_sidebar");
        $("#toggle_sidebar_button").removeClass("hide_sidebar");
        updateMapSize();
        return;
    }

    $("#map_container").hide();
    $("#toggle_sidebar_control").hide();
    $("#splitter").hide();
    $("#show_map_button").show();
    $("#accordion").accordion("option", "active", 0);
    $("#sidebar_container").width("100%");
    setColumnVisibility();
    setSelectedInfoBlockVisibility();
    updateMapSize();
}

function showMap() {
    $("#map_container").show();
    $("#toggle_sidebar_control").show();
    $("#splitter").show();
    $("#show_map_button").hide();
    $("#sidebar_container").width("500px");
    $("#accordion").accordion("option", "active", false);
    setColumnVisibility();
    setSelectedInfoBlockVisibility();
    updateMapSize();
}

function showColumn(table, columnId, visible) {
    var index = $(columnId).index();
    if (index >= 0) {
        var cells = $(table).find("td:nth-child(" + (index + 1).toString() + ")");
        if (visible) {
            cells.show();
        } else {
            cells.hide();
        }
    }
}

function setColumnVisibility() {
    var mapIsVisible = $("#map_container").is(":visible");
    var infoTable = $("#tableinfo");

    showColumn(infoTable, "#registration", !mapIsVisible);
    showColumn(infoTable, "#aircraft_type", !mapIsVisible);
    showColumn(infoTable, "#vert_rate", !mapIsVisible);
    showColumn(infoTable, "#rssi", !mapIsVisible);
    showColumn(infoTable, "#lat", !mapIsVisible);
    showColumn(infoTable, "#lon", !mapIsVisible);
    showColumn(infoTable, "#data_source", !mapIsVisible);
}

function setSelectedInfoBlockVisibility() {
    var mapIsVisible = $("#map_container").is(":visible");
    var planeSelected = (typeof SelectedPlane !== 'undefined' && SelectedPlane !== null && SelectedPlane !== "ICAO");

    if (planeSelected && mapIsVisible) {
        $('#selected_infoblock').show();
    } else {
        $('#selected_infoblock').hide();
    }
}

// Reposition selected plane info box if it overlaps plane marker
function adjustSelectedInfoBlockPosition() {
    if (typeof Planes === 'undefined' || typeof SelectedPlane === 'undefined' || Planes === null) {
        return;
    }

    var selectedPlane = Planes[SelectedPlane];

    if (selectedPlane === undefined || selectedPlane === null || selectedPlane.marker === undefined || selectedPlane.marker === null) {
        return;
    }

    try {
        // Get marker position
        var marker = selectedPlane.marker;
        var markerCoordinates = selectedPlane.marker.getGeometry().getCoordinates();
        var markerPosition = OLMap.getPixelFromCoordinate(markerCoordinates);

        // Get info box position and size
        var infoBox = $('#selected_infoblock');
        var infoBoxPosition = infoBox.position();
        if (typeof infoBoxOriginalPosition.top === 'undefined') {
            infoBoxOriginalPosition.top = infoBoxPosition.top;
            infoBoxOriginalPosition.left = infoBoxPosition.left;
        } else {
            infoBox.css("left", infoBoxOriginalPosition.left);
            infoBox.css("top", infoBoxOriginalPosition.top);
            infoBoxPosition = infoBox.position();
        }
        var infoBoxExtent = getExtent(infoBoxPosition.left, infoBoxPosition.top, infoBox.outerWidth(), infoBox.outerHeight());

        // Get map size
        var mapCanvas = $('#map_canvas');
        var mapExtent = getExtent(0, 0, mapCanvas.width(), mapCanvas.height());

        // Check for overlap
        if (isPointInsideExtent(markerPosition[0], markerPosition[1], infoBoxExtent)) {
            // Array of possible new positions for info box
            var candidatePositions = [];
            candidatePositions.push({x: 40, y: 60});
            candidatePositions.push({x: 40, y: markerPosition[1] + 80});

            // Find new position
            for (var i = 0; i < candidatePositions.length; i++) {
                var candidatePosition = candidatePositions[i];
                var candidateExtent = getExtent(candidatePosition.x, candidatePosition.y, infoBox.outerWidth(), infoBox.outerHeight());

                if (!isPointInsideExtent(markerPosition[0], markerPosition[1], candidateExtent) && isPointInsideExtent(candidatePosition.x, candidatePosition.y, mapExtent)) {
                    // Found a new position that doesn't overlap marker - move box to that position
                    infoBox.css("left", candidatePosition.x);
                    infoBox.css("top", candidatePosition.y);
                    return;
                }
            }
        }
    } catch (e) {
    }
}

function getExtent(x, y, width, height) {
    return {
        xMin: x,
        yMin: y,
        xMax: x + width - 1,
        yMax: y + height - 1
    };
}

function isPointInsideExtent(x, y, extent) {
    return x >= extent.xMin && x <= extent.xMax && y >= extent.yMin && y <= extent.yMax;
}

function initializeUnitsSelector() {
    // Get display unit preferences from local storage
    if (MapSettings.DisplayUnits === null) {
        MapSettings.DisplayUnits = "nautical";
        Dump1090DB.indexedDB.putSetting('MapSettings', MapSettings);
    }

    // Initialize drop-down
    var unitsSelector = $("#units_selector");
    unitsSelector.selectmenu({
        width: 150
    });
    unitsSelector.val(MapSettings.DisplayUnits);
    unitsSelector.selectmenu("refresh");
    unitsSelector.on("selectmenuclose", onDisplayUnitsChanged);

    if (MapSettings.DisplayUnits === 'metric') {
        $('#altitude_chart_button').addClass('altitudeMeters');
    } else {
        $('#altitude_chart_button').removeClass('altitudeMeters');
    }
}

function onDisplayUnitsChanged(e) {
    var displayUnits = e.target.value;
    MapSettings.DisplayUnits = displayUnits;
    Dump1090DB.indexedDB.putSetting('MapSettings', MapSettings);

    // Refresh filter list
    refreshFilterList();

    // Refresh data
    refreshTableInfo();
    refreshSelected();

    // Redraw range rings
    if (SitePosition !== null && SitePosition !== undefined && SiteCircles) {
        createSiteCircleFeatures();
    }

    // Reset map scale line units
    OLMap.getControls().forEach(function (control) {
        if (control instanceof ol.control.ScaleLine) {
            control.setUnits(displayUnits);
        }
    });

    if (displayUnits === 'metric') {
        $('#altitude_chart_button').addClass('altitudeMeters');
    } else {
        $('#altitude_chart_button').removeClass('altitudeMeters');
    }
}

function getFlightAwareIdentLink(ident, linkText) {
    if (ident !== null && ident !== "") {
        if (!linkText) {
            linkText = ident;
        }
        return "<a target=\"_blank\" href=\"https://flightaware.com/live/flight/" + ident.trim() + "\">" + linkText + "</a>";
    }

    return "";
}

function getEditAircraftData() {
    if (SelectedPlane === null || SelectedPlane === undefined)
        return;
    var selected = Planes[SelectedPlane];
    $("#edit_icao24").val(selected.icao.toUpperCase());

    if (selected.registration !== null) {
        if (selected.registration.startsWith('#')) {
            $("#edit_reg").val(selected.registration.substr(2).toUpperCase());
        } else {
            $("#edit_reg").val(selected.registration.toUpperCase());
        }
    }

    if (selected.icaotype !== null) {
        $("#edit_type").val(selected.icaotype.toUpperCase());
    }
    if (selected.typeDescription !== null) {
        $("#edit_desc").val(selected.typeDescription);
    }

    if (selected.interesting !== null && selected.interesting) {
        $("#edit_interesting").prop('checked', true);
    } else {
        $("#edit_interesting").prop('checked', false);
    }

    if (selected.civilmil !== null && selected.civilmil) {
        $("#edit_civilmil").prop('checked', true);
    } else {
        $("#edit_civilmil").prop('checked', false);
    }
}

function editAircraftData() {
    var i24 = $("#edit_icao24").val().trim().substr(0, 6).toUpperCase();
    var r = $("#edit_reg").val().trim().substr(0, 10).toUpperCase();
    var t = $("#edit_type").val().trim().substr(0, 4).toUpperCase();
    var d = $("#edit_desc").val().trim().substr(0, 50);
    var civ = $("#edit_civilmil").prop('checked');
    var int = $("#edit_interesting").prop('checked');

    var f = "00";
    if (civ && !int)
        f = "10";
    if (!civ && int)
        f = "01";
    if (civ && int)
        f = "11";

    var entry = {
        "icao24": i24,
        "reg": r,
        "type": t,
        "flags": f,
        "desc": d
    };
    Dump1090DB.indexedDB.putAircraftData(entry);
    EditAircraftDialog.dialog("close");
    Dump1090DB.indexedDB.getAircraftData(Planes[SelectedPlane]);
    refreshTableInfo();
    refreshSelected();
}

// Initilize web application GUI
$(function () {
    $("#accordion").accordion({
        collapsible: true,
        active: 0,
        heightStyle: "content"
    });
    $("#filter_selector").selectmenu({
        width: 150
    });
    $("#filter_add_button").button();
    $(document).tooltip({
        position: {my: "right center", at: "left center"}
    });

    var dc = $("#dialog-confirm").dialog({
        autoOpen: false,
        modal: true,
        buttons: {
            Ok: function () {
                $(this).dialog("close");
                $("#edit_icao24").attr("readonly", false);
                $("#edit_icao24").focus();
            }
        }
    });

    $("#edit_icao24").on("click", function () {
        dc.dialog("open");
    });

    EditAircraftDialog = $("#editdialog_form").dialog({
        autoOpen: false,
        height: 400,
        width: 350,
        modal: true,
        buttons: {
            "Save changes": editAircraftData,
            Cancel: function () {
                EditAircraftDialog.dialog("close");
            }
        },
        close: function () {
            form[0].reset();
            $("#edit_icao24").attr("readonly", true);
        }
    });

    var form = EditAircraftDialog.find("form").on("submit", function (event) {
        event.preventDefault();
        editAircraftData();
    });

    $("#edit-aircraft-button").on("click", function () {
        getEditAircraftData();
        EditAircraftDialog.dialog("open");
        $("#edit_reg").focus();
    });

    $("#exportDbButton").on("click", function (event) {
        event.preventDefault();
        Dump1090DB.indexedDB.exportDB();
    });

    $("#importDbButton").on("change", function (event) {
        event.preventDefault();
        Dump1090DB.indexedDB.importDB(event.target.files);
        this.value = null;
    });

    // Start web application
    DatabaseInit();
});
