// reading a latitude / longitude out of a Google Maps link, or out of coordinates copied from Google Maps
// (e.g. "53.694700, -6.475500" or 53°41'40.9"N 6°28'31.8"W)

// short links (maps.app.goo.gl/..., goo.gl/maps/...) only redirect to the full link, and a web page can't
// follow them to see where they go, so they're recognised just to explain that
var SHORT_MAPS_LINK = /^(https?:\/\/)?(maps\.app\.goo\.gl|goo\.gl\/maps)\//i;

var DECIMAL = '([-+]?\\d{1,3}(?:\\.\\d+)?)';
// (not in the middle of a longer number, so e.g. "Dropped pin 53.6947, -6.4755" still reads)
var DECIMAL_PAIR = new RegExp('(?:^|[^\\d.])' + DECIMAL + '\\s*,\\s*' + DECIMAL + '(?![\\d.])');
// degrees, minutes, seconds with N / S / E / W, e.g. 53°41'40.9"N 6°28'31.8"W (minutes and seconds optional)
var DMS = /(\d{1,3}(?:\.\d+)?)\s*°\s*(?:(\d{1,2}(?:\.\d+)?)\s*['′]\s*)?(?:(\d{1,2}(?:\.\d+)?)\s*(?:"|″|''|′′)\s*)?([NSEW])/gi;

// { lat, lon } in degrees, or { error } with a message explaining what couldn't be read
function parseMapsLocation(text) {
    text = (text || '').trim();
    if(!text) {
        return { error: 'Paste a Google Maps link, or the coordinates of a pin.' };
    }
    if(SHORT_MAPS_LINK.test(text)) {
        return { error: 'That\'s a short link, which can\'t be read from here. Open it, then copy the full link '
            + 'from the browser\'s address bar (or copy the pin\'s coordinates instead).' };
    }

    var decoded = text;
    try {
        decoded = decodeURIComponent(text.replace(/\+/g, ' '));
    } catch(e) {
        // not valid percent-encoding: read it as it is
    }

    var found = isLink(text) ? findLinkCoordinates(decoded) : findPlainCoordinates(decoded);
    if(!found) {
        return { error: isLink(text)
            ? 'No coordinates found in that link. Drop a pin on the spot first, then copy the link.'
            : 'Couldn\'t read those coordinates. Try copying them again, e.g. 53.6947, -6.4755' };
    }
    if(Math.abs(found.lat) > 90 || Math.abs(found.lon) > 180) {
        return { error: 'Those coordinates are out of range (latitude must be -90 to 90, longitude -180 to 180).' };
    }
    return { lat: roundCoordinate(found.lat), lon: roundCoordinate(found.lon) };
}

function isLink(text) {
    return /^(https?:\/\/|www\.|maps\.google\.|google\.[a-z.]+\/maps)/i.test(text);
}

// the places a Google Maps link can hold coordinates, most exact first: the pin itself (!3d...!4d...), a
// searched / pinned location (?q=, ?query=, ?ll=, /place/..., /search/...), then the centre of the view (@...)
function findLinkCoordinates(url) {
    var pin = url.match(/!3d([-+]?\d+(?:\.\d+)?)!4d([-+]?\d+(?:\.\d+)?)/);
    if(pin) {
        return { lat: parseFloat(pin[1]), lon: parseFloat(pin[2]) };
    }

    var param = url.match(/[?&](?:q|query|ll|destination|center)=(?:loc:)?([^&#]+)/i);
    var fromParam = param && findPlainCoordinates(param[1]);
    if(fromParam) {
        return fromParam;
    }

    var path = url.match(/\/(?:place|search|dir)\/+([^/?#]+)/i); // (directions links can start "dir//")
    var fromPath = path && findPlainCoordinates(path[1]);
    if(fromPath) {
        return fromPath;
    }

    var view = url.match(/@([-+]?\d+(?:\.\d+)?),([-+]?\d+(?:\.\d+)?)/);
    if(view) {
        return { lat: parseFloat(view[1]), lon: parseFloat(view[2]) };
    }
    return null;
}

// "53.6947, -6.4755" or 53°41'40.9"N 6°28'31.8"W; null if neither
function findPlainCoordinates(text) {
    var pair = text.match(DECIMAL_PAIR);
    if(pair) {
        return { lat: parseFloat(pair[1]), lon: parseFloat(pair[2]) };
    }

    var lat = null, lon = null, part;
    DMS.lastIndex = 0;
    while((part = DMS.exec(text)) !== null) {
        var value = parseFloat(part[1]) + ((parseFloat(part[2]) || 0) / 60) + ((parseFloat(part[3]) || 0) / 3600);
        var hemisphere = part[4].toUpperCase();
        if(hemisphere == 'S' || hemisphere == 'W') {
            value = -value;
        }
        if(hemisphere == 'N' || hemisphere == 'S') {
            lat = value;
        } else {
            lon = value;
        }
    }
    return (lat !== null && lon !== null) ? { lat: lat, lon: lon } : null;
}

// 6 decimal places is about 10 cm, much finer than anything the viewer shows
function roundCoordinate(value) {
    return Math.round(value * 1e6) / 1e6;
}
