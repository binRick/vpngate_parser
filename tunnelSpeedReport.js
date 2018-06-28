#!/usr/bin/env node

var l = console.log,
    prettyBytes = require('pretty-bytes'),
    _ = require('underscore'),
    c = require('chalk'),
    kue = require('kue'),
    child = require('child_process'),
    queue = kue.createQueue(),
    parallelLimit = 1,
    express = require('express'),
    kueUiExpress = require('kue-ui-express'),
    testProcessMaxRuntime = 1000 * 45,
    vpnProcessMaxRuntime = 1000 * 60,
    app = express();

kue.createQueue();

queue.on('error', function(err) {
    console.log('Oops... ', err);
});

process.once('SIGTERM', function(sig) {
    queue.shutdown(5000, function(err) {
        console.log('Kue shutdown: ', err || '');
        process.exit(0);
    });
});

queue.process('Tunnel Speed Report', parallelLimit, checkTunnel);

function checkTunnel(job, ctx, done) {
    l('Processing Speed Report, job #', job.id, ' with data of ', JSON.stringify(job.data).length, 'bytes...');
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
        if ('SpeedReport' in Tunnel && Tunnel.SpeedReport.includes('time_total')) {

            var SpeedReport = {
                raw: Tunnel.SpeedReport,
                parsed: {},
                srLines: Tunnel.SpeedReport.split("\n").join("\n").split("\n").filter(function(l) {
                    return l;
                }),
            };

            _.each(SpeedReport.srLines, function(l) {
                if (l.includes(': ')) {
                    var lP = l.split(': ');
                    SpeedReport.parsed[lP[0]] = lP[1].replace(/s$/, '');
                }
            });

            SpeedReport.parsed.bytesReceived = parseInt(SpeedReport.srLines[SpeedReport.srLines.length - 1]) - parseInt(SpeedReport.srLines[0]);

            SpeedReport.parsed.perSecondRate = prettyBytes(parseInt(SpeedReport.parsed.bytesReceived / SpeedReport.parsed.time_total)) + '/sec';


            done(null, SpeedReport);
        } else
            done({
                msg: 'openvpn exited with code ' + code,
                code: code,
                err: vpnProcessErr,
                out: vpnProcessOut
            });
    });
    vpnProcess.stdout.on('data', function(s) {
        vpnProcessOut += s.toString();
        if (vpnProcessOut.includes('Initialization Sequence Completed')) {
            l('VPN Initialized. Testing Tunnel Connection');
            var testProcess = child.spawn('sudo', ['./testTunnelSpeed.sh', Tunnel.name, '17']),
                testProcessOut = '',
                testProcessErr = '';
            testProcess.on('exit', function(code) {
                l('Tunnel Test Process exited with code', code);
                if (code == 0) {
                    l(testProcessOut);
                    try {
                        Tunnel.SpeedReport = testProcessOut;
                        setTimeout(function() {
                            try {
                                if (vpnProcess.pid > 0)
                                    child.execSync('sudo pkill -TERM -P ' + vpnProcess.pid);
                            } catch (e) {}
                        }, 1000);

                    } catch (e) {
                        l('Failed to decode JSON from test script:', testProcessOut);
                        setTimeout(function() {
                            try {
                                if (vpnProcess.pid > 0)
                                    child.execSync('sudo pkill -TERM -P ' + vpnProcess.pid);
                            } catch (e) {}
                        }, 1000);
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
