#!/usr/bin/env node

var l = console.log,
    _ = require('underscore'),
    c = require('chalk'),
    kue = require('kue'),
    child = require('child_process'),
    queue = kue.createQueue(),
    parallelLimit = 1,
    express = require('express'),
    kueUiExpress = require('kue-ui-express'),
    testProcessMaxRuntime = 1000 * 15,
    vpnProcessMaxRuntime = 1000 * 30,
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

queue.process('Tunnel IP Report', parallelLimit, checkTunnel);

function checkTunnel(job, ctx, done) {
    l('Processing job #', job.id, ' with data of ', JSON.stringify(job.data).length, 'bytes...');
    //if (!('to' in job.data) || !(job.data.to.includes('@'))) {
    //    return done(new Error('invalid to address'));
    var Tunnel = {
        IP: job.data.IP,
        name: job.data.tunnel,
        location: {
            CountryLong: job.data.CountryLong,
            CountryShort: job.data.CountryShort,
        },
        Config: job.data.file,
    };
    var vpnProcess = child.spawn('sudo', ['openvpn', Tunnel.Config]),
        vpnProcessOut = '',
        vpnProcessErr = '';
    setTimeout(function() {
        l('VPN Process Max runtime. Killing pid', vpnProcess.pid);
        try {
            if (vpnProcess.pid > 0)
                child.execSync('sudo pkill -TERM -P ', vpnProcess.pid);
        } catch (e) {

        }

    }, vpnProcessMaxRuntime);
    vpnProcess.on('exit', function(code) {
        l('openvpn exited with code', code);
        if ('Ifconfig' in Tunnel)
            done(null, Tunnel.Ifconfig);
        else
            done('openvpn exited with code '+code);
    });
    vpnProcess.stdout.on('data', function(s) {
        vpnProcessOut += s.toString();
        if (vpnProcessOut.includes('Initialization Sequence Completed')) {
            l('VPN Initialized. Testing Tunnel Connection');
            var testProcess = child.spawn('sudo', ['./ifconfigTunnel.sh', Tunnel.name, '16']),
                testProcessOut = '',
                testProcessErr = '';
            testProcess.on('exit', function(code) {
                l('Tunnel Test Process exited with code', code);
                if (code == 0) {
                    l(testProcessOut);
                    try {
                        Tunnel.Ifconfig = JSON.parse(testProcessOut);
                        l(c.green('JSON parsed', _.keys(testProcessOut).length, 'keys!'));
                        setTimeout(function() {
                            try {
                                if (vpnProcess.pid > 0)
                                    child.execSync('sudo pkill -TERM -P ' + vpnProcess.pid);
                            } catch (e) {}
                        }, 5000);

                    } catch (e) {
                        l('Failed to decode JSON from test script:', testProcessOut);
                        setTimeout(function() {
                            try {
                                if (vpnProcess.pid > 0)
                                    child.execSync('sudo pkill -TERM -P ' + vpnProcess.pid);
                            } catch (e) {}
                        }, 5000);
                    }
                } else {
                    l(testProcessErr);
                }
            });
            testProcess.stdout.on('data', function(s) {
                testProcessOut += s.toString();
            });
            testProcess.stderr.on('data', function(s) {
                testProcessErr += s.toString();
            });
            setTimeout(function() {
                l('Test Process Max runtime. Killing pid', testProcess.pid);
                try {
                    if (testProcess.pid > 0)
                        child.execSync('sudo pkill -TERM -P ' + testProcess.pid);
                } catch (e) {}

            }, testProcessMaxRuntime);
        }
    });
    vpnProcess.stderr.on('data', function(s) {
        vpnProcessErr += s.toString();
    });
    l('Tunnel Monitor', job.id, 'Done', Tunnel);
}
