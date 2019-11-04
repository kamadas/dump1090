// Part of readsb, a Mode-S/ADSB/TIS message decoder.
//
// routemap.js: map extend application functions.
//
// Copyright (c) 2019 KAMADA Satoru <kamada3@google.com>
//
// This code is based on a detached fork of mictronics/readsb.
//
// This file is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// any later version.
//
// This file is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
// Declare ICAO registration address ranges and Country

import {
  RnavWayFeatures,
  VORWayFeatures,
  ArrivalFeatures,
  CircleFeatures,
  DepartureFeatures,
  AccsFeatures,
  DirectFeatures,
  MakeGeodesicCircle,
} from './script.js';

export function points() {
  $.ajax({
    url: 'json/points.json',
    cache: false,
    dataType: 'json'
  })
    .done(function(data) {
      $(data).each(function() {
        const image = 'images/' + this.m + '.png';
        const pow = 0.2;
        const name = this.name;
        let color = '#000000';

        if ( this.v === 1 ) {
          color = '#000000';
        }
        if ( this.d === 1 ) {
          color = '#c03181';
        }
        if ( this.a === 1 ) {
          color = '#b8860b';
        }
        if ( this.h === 1 || this.l === 1) {
          color = '#41b1d3';
        }

        const style = [ new ol.style.Style({
          image: new ol.style.Icon({
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction',
            rotation: 0,
            opacity: 1.0,
            src: image,
            scale: pow,
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
        const lat = this.ad + ( this.am * 60 + this.as ) / 3600;
        const lon = this.od + ( this.om * 60 + this.os ) / 3600;

        const feature = new ol.Feature({
          geometry : new ol.geom.Point(
            ol.proj.fromLonLat([lon, lat]))
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
            VORWayFeatures.push(feature);
          }
          if ( this.v === 1 ) {
            DirectFeatures.push(feature);
          }
        });
    })
    .fail(function() {
      window.alert('points error');
    });
}

export function routes() {
  $.ajax({
    url: 'json/routes.json',
    cashe: false,
    dataType: 'json',
  })
    .done(function(data) {
      $(data).each(function() {
        let color = '#000000';
        let width = 1;

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

        const style = [
          new ol.style.Style({
            stroke: new ol.style.Stroke({
              color: color,
              width: width
            })
          })
        ];

        let geom = null;

        for (let i = 0; i < this.p.length; ++i) {
          const lon = this.p[i].od + ( this.p[i].om * 60 + this.p[i].os ) / 3600;
          const lat = this.p[i].ad + ( this.p[i].am * 60 + this.p[i].as ) / 3600;
          if ( geom == null) {
            geom = new ol.geom.LineString([lon, lat], 'XY');
          } else {
            geom.appendCoordinate([lon, lat]);
          }
        };

        geom.transform('EPSG:4326', 'EPSG:3857');

        const feature = new ol.Feature(geom);
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
        if ( this.a === 'low' ) {
          VORWayFeatures.push(feature);
        }
        if ( this.a === 'dir' ) {
          DirectFeatures.push(feature);
        }
      });
    })
    .fail(function() {
      window.alert('route error');
    });
}

export function circles() {
  $.ajax({
    url: 'json/circle.json',
    cache: false,
    dataType: 'json',
  })
    .done(function(data) {
      $(data).each(function() {
        const lon = this.od + ( this.om * 60 + this.os ) / 3600;
        const lat = this.ad + ( this.am * 60 + this.as ) / 3600;
        const geom = [ lon, lat ];
        for (let i = 0; i < this.d.length; ++i) {
          const radius = this.d[i] * 1852.0;
          const circlegeom = MakeGeodesicCircle(geom, radius, 360, this.s, this.e);
          circlegeom.transform('EPSG:4326', 'EPSG:3857');
          const circlefeature = new ol.Feature(circlegeom);
          let circlestyle;

          if ( this.a === "acc" ) {
            circlestyle = new ol.style.Style({
              fill: null,
              stroke: new ol.style.Stroke({
                width: 3,
                color: '#1C395B',
                lineDash: [4, 4],
              })
            });
          } else if ( this.a === "arc" ) {
            circlestyle = new ol.style.Style({
              fill: null,
              stroke: new ol.style.Stroke({
                width: 1,
                color: '#b8860b'
              })
            });
          } else {
            circlestyle = new ol.style.Style({
              fill: null,
              stroke: new ol.style.Stroke({
                width: 1,
                color: '#a0a0a0'
              })
            });
          }
          circlefeature.setStyle(circlestyle);

          if ( this.a === "acc" )
            AccsFeatures.push(circlefeature);
          else if ( this.a === "arc" )
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

export function accs() {
  $.ajax({
    url: 'json/sapporo_acc.json',
    cashe: false,
    dataType: 'json',
  })
    .done(function(data) {
      $(data).each(function() {
        const style = [
          new ol.style.Style({
            stroke: new ol.style.Stroke({
              color: '#1C395B',
              width: 3,
              lineDash: [4, 4],
            })
          })
        ];

        let geom = null;

        for (let i = 0; i < this.l.length; ++i) {
          const lon = this.l[i].od + ( this.l[i].om * 60 + this.l[i].os ) / 3600;
          const lat = this.l[i].ad + ( this.l[i].am * 60 + this.l[i].as ) / 3600;
          if ( geom == null) {
            geom = new ol.geom.LineString([lon, lat], 'XY');
          } else {
            geom.appendCoordinate([lon, lat]);
          }
        };

        geom.transform('EPSG:4326', 'EPSG:3857');

        const feature = new ol.Feature(geom);
        feature.setStyle(style);
        AccsFeatures.push(feature);
      });
    })
    .fail(function() {
      window.alert('accs error');
    });
}
