// --------------------------------------------------------
// Rename to config.js prior first use.
//
// This file is to configure the configurable settings.
// Load this file before script.js.
//
// --------------------------------------------------------

// -- Title Settings --------------------------------------
// Show number of aircraft and/or messages per second in the page title
PlaneCountInTitle = true;
MessageRateInTitle = false;

// -- Output Settings -------------------------------------
// The DisplayUnits setting controls whether nautical (ft, NM, knots),
// metric (m, km, km/h) or imperial (ft, mi, mph) units are used in the
// plane table and in the detailed plane info. Valid values are
// "nautical", "metric", or "imperial".
DefaultDisplayUnits = "nautical";

// -- Map settings ----------------------------------------
// These settings are overridden by any position information
// provided by dump1090 itself. All positions are in decimal
// degrees.

// Default center of the map.
DefaultCenterLat = 45.0;
DefaultCenterLon = 9.0;
// The google maps zoom level, 0 - 16, lower is further out
DefaultZoomLvl   = 7;

// Center marker. If dump1090 provides a receiver location,
// that location is used and these settings are ignored.

SiteShow    = false;           // true to show a center marker
SiteLat     = 45.0;            // position of the marker
SiteLon     = 9.0;

// -- Online aircraft database source ---------------------
// Base URL from where the database version will be pulled on application
// startup. If a new database version is found the browsers indexed
// aircraft database will be updated.
// This is the base URL. Do not provide file names.

// Uncomment to pull online database from local dump1090 webserver.
DefaultOnlineDatabaseUrl = null;
// Uncomment to pull online database from Mictronics Github.
// Change URL in case you maintain your own aircraft database source.
//DefaultOnlineDatabaseUrl = "https://raw.githubusercontent.com/Mictronics/dump1090/master/public_html/";

// -- Marker settings -------------------------------------

// These settings control the coloring of aircraft by altitude.
// All color values are given as Hue (0-359) / Saturation (0-100) / Lightness (0-100)
ColorByAlt = {
        // HSL for planes with unknown altitude:
        unknown : { h: 0,   s: 0,   l: 40 },

        // HSL for planes that are on the ground:
        ground  : { h: 120, s: 100, l: 30 },

        air : {
                // These define altitude-to-hue mappings
                // at particular altitudes; the hue
                // for intermediate altitudes that lie
                // between the provided altitudes is linearly
                // interpolated.
                //
                // Mappings must be provided in increasing
                // order of altitude.
                //
                // Altitudes below the first entry use the
                // hue of the first entry; altitudes above
                // the last entry use the hue of the last
                // entry.
                h: [ { alt: 2000,  val: 20 },    // orange
                     { alt: 10000, val: 140 },   // light green
                     { alt: 40000, val: 300 } ], // magenta
                s: 85,
                l: 50,
        },

        // Changes added to the color of the currently selected plane
        selected : { h: 0, s: -10, l: +20 },

        // Changes added to the color of planes that have stale position info
        stale :    { h: 0, s: -10, l: +30 },

        // Changes added to the color of planes that have positions from mlat
        mlat :     { h: 0, s: -10, l: -10 }
};

// For a monochrome display try this:
// ColorByAlt = {
//         unknown :  { h: 0, s: 0, l: 40 },
//         ground  :  { h: 0, s: 0, l: 30 },
//         air :      { h: [ { alt: 0, val: 0 } ], s: 0, l: 50 },
//         selected : { h: 0, s: 0, l: +30 },
//         stale :    { h: 0, s: 0, l: +30 },
//         mlat :     { h: 0, s: 0, l: -10 }
// };

// Outline color for aircraft icons with an ADS-B position
OutlineADSBColor = '#000000';

// Outline color for aircraft icons with a mlat position
OutlineMlatColor = '#4040FF';

SiteCircles = true; // true to show circles (only shown if the center marker is shown)
// In miles, nautical miles, or km (depending settings value 'DisplayUnits')
SiteCirclesDistances = new Array(100,150,200);

// Controls page title, righthand pane when nothing is selected
PageName = "dump1090";

// Show country flags by ICAO addresses?
ShowFlags = true;

// Path to country flags (can be a relative or absolute URL; include a trailing /)
FlagPath = "flags-tiny/";

// Set to true to enable the ChartBundle base layers (US coverage only)
ChartBundleLayers = false;

// Provide a Bing Maps API key here to enable the Bing imagery layer.
// You can obtain a free key (with usage limits) at
// https://www.bingmapsportal.com/ (you need a "basic key")
//
// Be sure to quote your key:
//   BingMapsAPIKey = "your key here";
//
BingMapsAPIKey = null;

// Provide a SkyVector API key here to enable the SkyVector tile layer.
//
// Be sure to quote your key:
//   SkyVectorAPIKey = "your key here";
//
SkyVectorAPIKey = null;

// Enable/disable various map options
ShowMouseLatLong     = true;
ShowAdditionalMaps   = true;
ShowPermanentLabels  = true;
ShowHoverOverLabels  = true;
ShowUSLayers         = false;
ShowEULayers         = true;
ShowMyPreferences    = true;
ShowAdditionalData   = true;
ShowSimpleColours    = true;
ChartBundleLayers    = false;