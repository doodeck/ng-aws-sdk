var app,
    express,
    http,
    path,
    PORT,
    server;

express = require('express');
PORT = 9002;

app = express();
http = require('http');
path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

//create server
server = http.createServer(app).listen(PORT);
