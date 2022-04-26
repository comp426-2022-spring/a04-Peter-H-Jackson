// Require Express.js
const express = require('express');
const app = express();
const logdb = require("./database.js");
const fs = require('fs');
const morgan = require('morgan');

// Get port
const args = require("minimist")(process.argv.slice(2))
args["port"]
if (args.port === undefined) { args.port = 5555 }
var port = args.port

// --help
args["help"]
if (args.help === true) { 
  console.log('server.js [options]\
\n\
  --port	Set the port number for the server to listen on. Must be an integer between 1 and 65535.\
\n\
  --debug	If set to `true`, creates endlpoints /app/log/access/ which returns a JSON access log from the database and /app/error which throws an error with the message "Error test successful." Defaults to `false`.\
\n\
  --log		If set to false, no log files are written. Defaults to true. Logs are always written to database.\
\n\
  --help	Return this message and exit.')
  process.exit(0)
}

app.use(express.json());
app.use(express.urlencoded({extended: true}));


// 1. server.js file that takes an arbitrary port number as a command line argument (i.e. I should be able to run it with node server.js. The port should default to 5000 if no argument is given.
const server = app.listen(port, () => {
    console.log("App is running on port %PORT%".replace("%PORT%", port))
})

app.use((req, res, next) => {
  let logdata = {
    remoteaddr: req.ip,
    remoteuser: req.user,
    time: Date.now(),
    method: req.method,
    url: req.url,
    protocol: req.protocol,
    httpversion: req.httpVersion,
    status: res.statusCode,
    referer: req.headers['referer'],
    useragent: req.headers['user-agent']
}
const stmt = logdb.prepare('INSERT INTO accessLog (remoteaddr, remoteuser, time, method, url, protocol, httpversion, status, referer, useragent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
stmt.run(logdata.remoteaddr, logdata.remoteuser, logdata.time, logdata.method, logdata.url, logdata.protocol, logdata.httpversion, logdata.status, logdata.referer, logdata.useragent)
next()
})

if (args.debug || args.d){
app.get('/app/log/access/', (req, res, next) => {
const stmt = logdb.prepare('SELECT * FROM accessLog').all();
res.status(200).json(stmt);
})
}


// 3. Check endpoint at /app/ that returns 200 OK
app.get("/app", (req, res) => {
    // Respond with status 200
    res.status(200).end("200 OK")
    //res.type("text/plain")
})

// 4. Endpoint /app/flip/ that returns JSON {"flip":"heads"} or {"flip":"tails"} corresponding to the results of the random coin flip
function coinFlip() {
    return Math.random() > 0.5 ? ("heads") : ("tails")
}
app.get("/app/flip", (req, res) => {
    res.status(200).json({ "flip" : coinFlip() })
})

// 5. Endpoint /app/flips/:number that returns JSON including an array of the raw random flips and a summary. Example below.
function coinFlips(flips) {
    const record = []
    for (let i = 0; i < flips; i++) {
      record[i] = coinFlip()
    }
    return record
} 
function countFlips(array) {
    let count = { heads: 0, tails: 0 }
  
    for (let i = 0; i < array.length; i++) {
      if (array[i] == "heads") {
        count.heads++
      } else {
        count.tails++
      }
    }
  
    return count
  }
app.get("/app/flips/:number", (req, res) => {
    var array = coinFlips(req.params["number"])
    res.status(200).json({ "raw" : array, "summary" : { "tails" : countFlips(array).tails, "heads" : countFlips(array).heads }})
})

// 6./7. Endpoint /app/flip/call/tails that returns the result of a random flip match against heads/tails as JSON
function flipACoin(call) {
    let flip = coinFlip();
    return {call: call, flip: flip, result: flip == call ? "win" : "lose" }
}
app.get("/app/flip/call/:this_call", (req, res) => {
    res.status(200).json(flipACoin(req.params["this_call"]))
})

// 8. ALL endpoints should return HTTP headers including a status code and the appropriate content type for the response


// 2. Default API endpoint that returns 404 Not found for any endpoints that are not defined
app.use(function(req, res) {
    res.status(404).send("404: Endpoint does not exist")
    res.type("text/plain")
})