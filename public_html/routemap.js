/* get points data from database */
/*
Dump1090DB.indexedDB.getPoint = function(point) {
    return new Promise(function(resolve,reject) {
        if( point === undefined || point.name === undefined) {
            reject(point);
        } else {

            var db = Dump1090DB.indexedDB.db;
            var trans = db.transaction(["Points"], "readonly");
            var store = trans.objectStore("Points");
            var index = store.index("name");
            var req = index.get(point.name)

            req.onsuccess = function(e) {
                var result = e.target.result;
                if ( result !== undefined ) {
                    if ( "lat" in result ) {
                        point.lat = result.lat;
                    }
                    if ( "lon" in result ) {
                        point.lon = result.lon;
                    }
                }
                resolve(point);
            }

            req.onerror = Dump1090DB.indexedDB.error;
        }
    });
};
*/

function mapmarkers() {
//    $.ajax({url: 'json/pointlist.json',
    $.ajax({url: 'json/points.json',
            cache: false,
            dataType: 'json'})
    .done(function(data) {
        $(data).each(function() {
                var image = 'images/' + this.m + '.png';
                var pow = 0.2;
                var name = this.name;
                var color = '#000000';

                if ( this.d === 1 ) {
                    color = '#c03181';
                }
                if ( this.a === 1 ) {
                    color = '#b8860b';
                }
                if ( this.h === 1 || this.l === 1) {
                    color = '#41b1d3';
                }

                var style = [ new ol.style.Style({
                    image: new ol.style.Icon({
                        anchorXUnits: 'fraction',
                        anchorYUnits: 'fraction',
                        rotation: 0,
                        opacity: 1.0,
                        src: image,
                        scale: pow
                    }),
                    text: new ol.style.Text({
                        text: name,
                        fill: new ol.style.Fill({
                            color: color
                        }),
                        font: '16px, Helvetica, Arial, sans-serif',
                        textAlign: 'left',
                        offsetX: 8,
                        offsetY: 8
                    })
                })];
/*
                var respoint = {
                    name: this.name,
                    lat: null,
                    lon: null
                }
*/
//                Dump1090DB.indexedDB.getPoint(respoint).then( function() {
                var lat = this.ad + ( this.am * 60 + this.as ) / 3600;
                var lon = this.od + ( this.om * 60 + this.os ) / 3600;

                var feature = new ol.Feature({
                    geometry : new ol.geom.Point(
                        ol.proj.fromLonLat([lon, lat]))
//                        ol.proj.fromLonLat([respoint.lon, respoint.lat]))
                });

                feature.setStyle(style);

                if ( this.d === 1 ) {
                    DepartureFeatures.push(feature);
                }
                if ( this.a === 1 ) {
                    ArrivalFeatures.push(feature);
                }
                if ( this.h === 1 ) {
                    RnavWayFeatures.push(feature);
                }
                if ( this.l === 1 ) {
                    LowWayFeatures.push(feature);
                }
//            });
        });
    })
    .fail(function() {
        window.alert('points error');
    });
}

function routes() {
//    $.ajax({ url: 'json/routelist.json',
    $.ajax({ url: 'json/routes.json',
             cashe: false,
             dataType: 'json'})
    .done(function(data) {
        $(data).each(function() {
            var color = '#000000';
            var width;

            if ( this.a === 'dep' ) {
                color = '#c03181';
            }
            if ( this.a === 'arr' ) {
                color = '#b8860b';
            }
            if ( this.a === 'low' ) {
                color = '#823220';
                width = 2;
            }
            if ( this.a === 'rnv' ) {
                color = '#41b1d3';
                width = 2;
            }

            var style = [
                new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: color,
                        width: width
                    })
                })
            ];

            var geom = new ol.geom.LineString();

            for (var i = 0; i < this.p.length; ++i) {
//                var resline = {
//                    lat: null,
//                    lon: null,
//                    name:  this.p[i]
//                };
//                Dump1090DB.indexedDB.getPoint(resline).then( function() {
                    var lon = this.p[i].od + ( this.p[i].om * 60 + this.p[i].os ) / 3600;
                    var lat = this.p[i].ad + ( this.p[i].am * 60 + this.p[i].as ) / 3600;
                    geom.appendCoordinate([lon, lat]);
//                    geom.appendCoordinate([resline.lon, resline.lat]);
//                });
            };

            geom.transform('EPSG:4326', 'EPSG:3857');

            var feature = new ol.Feature(geom);
            feature.setStyle(style);

            if ( this.a === 'dep' ) {
                DepartureFeatures.push(feature);
            }
            if ( this.a === 'arr' ) {
                ArrivalFeatures.push(feature);
            }
            if ( this.a === 'rnv' ) {
                RnavWayFeatures.push(feature);
            }
            if ( this.a === 'low' || this.a === 'dir' ) {
                LowWayFeatures.push(feature);
            }
        });
    })
    .fail(function() {
        window.alert('route error');
    });
}

function circles() {
    $.ajax({url: 'json/circle.json',
            cache: false,
            dataType: 'json'})
    .done(function(data) {
        $(data).each(function() {
            var lon = this.od + ( this.om * 60 + this.os ) / 3600;
            var lat = this.ad + ( this.am * 60 + this.as ) / 3600;
            var geom = [ lon, lat ];
            for (var i = 0; i < this.d.length; ++i) {
                var radius = this.d[i] * 1852.0;
                var circlegeom = make_geodesic_circle(geom, radius, 360, this.s, this.e);
                circlegeom.transform('EPSG:4326', 'EPSG:3857');
                var circlefeature = new ol.Feature(circlegeom);

                if ( this.a === "arc" )
                    var colour = '#b8860b'
                else
                    var colour = '#a0a0a0'

                var circlestyle = new ol.style.Style({
                    fill: null,
                    stroke: new ol.style.Stroke({
                        width: 1,
                        color: colour
                    })
                });
                circlefeature.setStyle(circlestyle);

                if ( this.a === "arc" )
                    ArrivalFeatures.push(circlefeature);
                else
                    CircleFeatures.push(circlefeature);
            };
        });
    })
    .fail(function() {
        window.alert('circle error');
    });
}
