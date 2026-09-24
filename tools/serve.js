// a tiny web server for running the calendar and the 3D viewer on your own computer, with nothing to install but
// Node.js (https://nodejs.org). the 3D viewer uses JavaScript modules, which browsers won't run from a file opened
// straight from disk, so it needs to be served, even offline.
//
//   node tools/serve.js [--open] [--port 8317] [folder]
//
// serves the given folder (the repo, by default) on this computer only (127.0.0.1), on port 8317 or the next free
// port, and prints the addresses. --open also opens the 3D viewer in the default browser. start.cmd (Windows) and
// start.sh (Mac / Linux) run it with --open. files are sent uncached, so changes show on a reload
'use strict';
var http = require('http');
var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');

var args = process.argv.slice(2);
var open = args.indexOf('--open') > -1;
var portArg = args.indexOf('--port');
var firstPort = portArg > -1 ? parseInt(args[portArg + 1], 10) : 8317;
var folderArg = args.filter(function(a, i) { return a.indexOf('--') !== 0 && (portArg < 0 || i !== portArg + 1); })[0];
var root = path.resolve(folderArg || path.join(__dirname, '..'));

var TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.md': 'text/plain; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2'
};

function send(res, status, text) {
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(text);
}

var server = http.createServer(function(req, res) {
    if(req.method !== 'GET' && req.method !== 'HEAD') {
        return send(res, 405, 'only GET and HEAD');
    }
    var urlPath;
    try {
        urlPath = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
    } catch(e) {
        return send(res, 400, 'bad address');
    }
    if(urlPath.slice(-1) === '/') {
        urlPath += 'index.html';
    }
    // only files inside the served folder
    var file = path.join(root, urlPath);
    var relative = path.relative(root, file);
    if(relative === '..' || relative.indexOf('..' + path.sep) === 0 || path.isAbsolute(relative)) {
        return send(res, 403, 'not allowed');
    }
    fs.stat(file, function(err, stat) {
        if(err || !stat.isFile()) {
            return send(res, 404, 'not found: ' + urlPath);
        }
        res.writeHead(200, {
            'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
            'Content-Length': stat.size,
            'Cache-Control': 'no-store'
        });
        if(req.method === 'HEAD') {
            return res.end();
        }
        fs.createReadStream(file).pipe(res);
    });
});

function openBrowser(url) {
    var command = process.platform === 'win32' ? 'start "" "' + url + '"'
        : process.platform === 'darwin' ? 'open "' + url + '"'
        : 'xdg-open "' + url + '"';
    childProcess.exec(command, function(err) {
        if(err) {
            console.log('(couldn\'t open a browser: open the address above yourself)');
        }
    });
}

// one handler for when it's up, with the port it actually got (a callback passed to each listen() attempt would
// stay attached after a failed attempt, and fire as well when a later one succeeded)
server.on('listening', function() {
    var base = 'http://localhost:' + server.address().port + '/';
    console.log('serving ' + root);
    console.log('  3D viewer:    ' + base + 'viewer.html');
    console.log('  2D calendar:  ' + base + 'index.html');
    console.log('(on this computer only; press Ctrl+C to stop)');
    if(open) {
        openBrowser(base + 'viewer.html');
    }
});

// the first free port from firstPort on
function listen(port, triesLeft) {
    server.once('error', function(err) {
        if(err.code === 'EADDRINUSE' && triesLeft > 0) {
            listen(port + 1, triesLeft - 1);
        } else {
            console.error('couldn\'t start the server: ' + err.message);
            process.exit(1);
        }
    });
    server.listen(port, '127.0.0.1');
}

listen(firstPort, 20);
