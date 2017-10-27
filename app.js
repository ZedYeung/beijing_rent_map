var express = require('express');
var compression = require('compression');
var app = express();

app.use(compression());

app.use(express.static('static'));

app.get('/', function (req, res) {
   res.sendFile(__dirname + '/templates/index.html');
});

var server = app.listen(8080, function () {

  var host = server.address().address
  var port = server.address().port

  console.log("listening on http://%s:%s", host, port)
});
