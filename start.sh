#!/bin/sh
# starts the calendar's little web server (tools/serve.js) and opens the 3D viewer in the browser.
# run it with ./start.sh (or sh start.sh). needs Node.js (https://nodejs.org), or failing that Python 3
cd "$(dirname "$0")" || exit 1

if command -v node >/dev/null 2>&1; then
    exec node tools/serve.js --open
fi

if command -v python3 >/dev/null 2>&1; then
    url="http://localhost:8317/viewer.html"
    echo "Node.js wasn't found, so using Python's built-in server instead"
    echo "  3D viewer:    $url"
    echo "  2D calendar:  http://localhost:8317/index.html"
    echo "(on this computer only; press Ctrl+C to stop)"
    # open the browser once the server has had a moment to start
    (sleep 1; if command -v open >/dev/null 2>&1; then open "$url"; elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$url"; fi) &
    exec python3 -m http.server 8317 --bind 127.0.0.1
fi

echo "Node.js (https://nodejs.org) or Python 3 is needed to run the viewer on this computer."
exit 1
