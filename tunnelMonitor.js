#!/usr/bin/env node

var l = console.log,
_ = require('underscore'),
    kue = require('kue'),
    queue = kue.createQueue(),
    parallelLimit = 5,
    express = require('express'),
    kueUiExpress = require('kue-ui-express'),
    app = express();

kue.createQueue();

kueUiExpress(app, '/kue/', '/kue-api/');

app.use('/kue-api/', kue.app);
app.listen(3005);

app.set('title', 'vpngate kue');


queue.on('error', function(err) {
    console.log('Oops... ', err);
});

process.once('SIGTERM', function(sig) {
    queue.shutdown(5000, function(err) {
        console.log('Kue shutdown: ', err || '');
        process.exit(0);
    });
});

queue.process('Active Tunnel', parallelLimit, checkTunnel);

function checkTunnel(job, ctx, done) {
    l('Processing job #', job.id, ' with data of ', JSON.stringify(job.data).length, 'bytes...');
    //if (!('to' in job.data) || !(job.data.to.includes('@'))) {
    //    return done(new Error('invalid to address'));
    var result = {
        IP: job.data.IP,
        Tunnel: job.data.tunnel,
        location: {
            CountryLong: job.data.CountryLong,
            CountryShort: job.data.CountryShort,
        },
        Config: job.data.file,
    };
    l('Tunnel Monitor', job.id, 'Done', result);
    done(null, result);
}
