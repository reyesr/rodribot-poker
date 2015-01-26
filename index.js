var express = require("express");
var app = express();
var server = require('http').Server(app);
var bodyParser = require("body-parser");
var fs = require("fs"),
    path = require("path");

var port = process.env.PORT || 5000;

var displayedPort = port;
if (process.env.DISPLAYED_PORT) {
    displayedPort = process.env.DISPLAYED_PORT;
}

server.listen(port);
app.use(bodyParser.json());

var robotfiles = ["./perfect-rodribot.js"];

var robots = robotfiles.map(function(file){
    try {
        var basename = path.basename(file, ".js");
        var bot = require(file);
        return basename.length>0 ? {name: basename, bot: (typeof bot == "function") ? bot() : bot} : null;
    } catch (err) {
        console.error("Error loading bot " + file + " (ignored)");
        return null;
    }
}).filter(function(bot){return bot != null});

robots.forEach(function(botDescriptor) {
    var name = botDescriptor.name;
    var bot = botDescriptor.bot;
    console.log("Initializing bot", name);

    app.get('/bot/' + name, function(req, res) {
        console.log("Serving info request for " + name);
        res.status(200).json({info: bot.info});
    });

    app.post('/bot/' + name, function(req, res) {
        var game = req.body;
        var bet = bot.update(game);
        res.json(200, {bet: bet});
    });
});

app.use("/", function (req, res) {
    var index_html = "<html><body><pre>";
    index_html += "Hi. I serve the following bots:\n\n";
    robots.forEach(function(robot){
        index_html += req.protocol + "://" + req.hostname + (displayedPort!=80?":"+displayedPort:"") + "/bot/" + robot.name + "\n";
    });
    index_html += "</pre></body></html>";
    res.status(200).send(index_html);
});
console.log("Server ready, listening on port", port);
