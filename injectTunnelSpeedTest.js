#!/usr/bin/env node

var l = console.log,
    kue = require('kue'),
    c = require('chalk'),
    queue = kue.createQueue(),
    fs = require('fs'),
    jD = JSON.parse(fs.readFileSync(process.argv[2]).toString()),
    async = require('async');

async.mapSeries(jD, function(Tunnel, _cb) {
    var job = queue.create('Tunnel Speed Report', Tunnel).priority('low').attempts(5).searchKeys(['IP', 'tunnel', 'CountryLong', 'CountryShort', 'file']).save(function(err) {
        if (err) throw err;
        l('Saved Active Tunnels #', job.id);
        _cb(null, job.id);
    });

    job.on('complete', function(result) {
        l('Active Tunnel Checks Job #', job.id, 'Completed with data', result);

    }).on('failed attempt', function(errorMessage, doneAttempts) {
        l('Job #', job.id, 'failed');
        _cb(errorMessage);

    }).on('failed', function(errorMessage) {
        l('Job', job.id, 'failed');
        _cb(errorMessage);

    }).on('progress', function(progress, data) {
        l('\r  job #' + job.id + ' ' + progress + '% complete with data ', data);

    });
}, function(errs, done) {
    l('Finished creating active tunnel jobs...');
});