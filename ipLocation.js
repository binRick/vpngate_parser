#!/usr/bin/env node

var ip2location = require('ip-to-location'),
    l = console.log;

var ip = process.argv[2];

ip2location.fetch(ip, function(err, res) {
    if (err) throw err;
    l(res);
});