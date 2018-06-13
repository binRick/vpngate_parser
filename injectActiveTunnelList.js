#!/usr/bin/env node

var l = console.log,
    kue = require('kue'),
    queue = kue.createQueue(),
    fs = require('fs'),
    jD = JSON.parse(fs.readFileSync(process.argv[2]).toString()),
    async = require('async');


async.map(jD, function(Tunnel, _cb) {
    var job = queue.create('Active Tunnels', jD).priority('high').attempts(5).searchKeys(['CountryLong', 'CountryShort', 'Uptime', 'TotalUsers', 'Ping', 'Speed', 'Score', 'IP']).save(function(err) {
        if (err) throw err;
        l('Saved Active Tunnels #', job.id);
    });

    job.on('complete', function(result) {
        console.log('Job completed with data ', result);
        _cb(null, result);

    }).on('failed attempt', function(errorMessage, doneAttempts) {
        console.log('Job failed');
        _cb(errorMessage);

    }).on('failed', function(errorMessage) {
        console.log('Job failed');
        _cb(errorMessage);

    }).on('progress', function(progress, data) {
        console.log('\r  job #' + job.id + ' ' + progress + '% complete with data ', data);

    });

}, function(errs, done) {
    l('Finished creating active tunnel jobs...');
});