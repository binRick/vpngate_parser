#!/usr/bin/env node

var fs = require('fs'),
    ifconfig = require('wireless-tools/ifconfig'),
    config = require('./config'),
    templateFile = __dirname + '/configTemplate.twig',
    splitter = require('openvpn-config-splitter'),
    sanitize = require('sanitize-filename'),
    pj = require('prettyjson'),
    twig = require('twig'),
    md5 = require('md5'),
    c = require('chalk'),
    ora = require('ora'),
    fetch = require('node-fetch'),
    l = console.log,
    child = require('child_process'),
    CachemanFile = require('cacheman-file'),
    Path = require('path'),
    cache = new CachemanFile({
        tmpDir: Path.join(process.cwd(), 'temp')
    }, {}),
    async = require('async'),
    _ = require('underscore'),
    neatCsv = require('neat-csv');

// CSV Columns
// '#HostName','IP','Score','Ping','Speed','CountryLong','CountryShort','NumVpnSessions',
//     'Uptime','TotalUsers','TotalTraffic','LogType','Operator','Message','OpenVPN_ConfigData_Base64'

const countryList = (obj) => {
    const countries = [];
    for (const i in obj) {
        countries.push(obj[i].CountryShort);
    }

    function unique(arr) {
        const obj = {};
        for (const i in countries) {
            const str = arr[i];
            obj[str] = true;
        }
        return Object.keys(obj);
    }
    return unique(countries);
};

var debugList = function(list) {
    //    l(pj.render(list[0]));
    console.log(`\nNum of servers: ${Object.keys(list).length}`);
    console.log(`Server countries: ${countryList(list)}`);
};
var executeList = function(list) {
    async.mapLimit(list, config.vpnConcurrency, function(item, _cb) {
        l('Working on ' + c.yellow.bgBlack(item.hostname));
        fs.writeFileSync(item.file, item.config);
        item.stdout = '';
        item.stderr = '';
        var vpnProcess = child.spawn('sudo', [config.openvpn, item.file]);
        vpnProcess.stdout.on('data', function(dat) {
            dat = dat.toString();
            item.stdout += dat;
        });
        vpnProcess.stderr.on('data', function(dat) {
            dat = dat.toString();
            item.stderr += dat;
        });
        vpnProcess.on('exit', function(code) {
            clearInterval(killer);
            item.code = code;
            delete item.config;
            l(c.green("\t" + c.yellow.bgBlack(item.hostname) + " Completed with code " + c.black.bgWhite(item.code)));
            _cb(null, item);
        });
        var killer = setTimeout(function() {
            var ifc = 'tun_' + item.hostname;
            try {
                var o = child.execSync('ifconfig ' + ifc).toString();
                l(o);
            } catch (e) {
                try {
                    l(c.red('Terminating ' + item.hostname + ' pid ' + c.black.bgWhite(vpnProcess.pid)));
                    child.execSync('sudo kill ' + vpnProcess.pid);
                } catch (e) {
                    _cb(null, item);
                }

            }
        }, config.vpnTimeLimit);
    }, function(e, done) {
        if (e) throw e;
        l(c.green.bgBlack('Completed VPN List'));
    });
};

var handleList = function(list) {
    async.map(list, function(item, _cb) {
        item.config = Buffer.from(item.OpenVPN_ConfigData_Base64, 'base64').toString();
        delete item.OpenVPN_ConfigData_Base64;
        splitter.split(item.config, {}, function(err, parts, missing) {
            if (err) throw err;
            item.caCert = parts.caCert;
            item.userCert = parts.userCert;
            item.privateKey = parts.privateKey;
            _.each(item.config.split("\n"), function(li) {
                if (li.match(/^proto/)) {
                    var li1 = li.split(' ');
                    item.proto = li1[1];
                }
                if (li.match(/^remote/)) {
                    var li2 = li.split(' ');
                    item.ip = li2[1];
                    item.port = li2[2];
                }
            });
            delete item.config;
            item.hostname = item['#HostName'];
            item.file = __dirname + '/config/' + item.hostname + '.ovpn';
            twig.renderFile(templateFile, item, function(e, configFile) {
                if (e) throw e;
                item.config = configFile;
                _cb(null, item);
            });
        });
    }, function(e, newList) {
        if (e) throw e;
        debugList(newList);
        executeList(newList);
    });
};

cache.get(md5(config.url), function(err, value) {
    if (err) throw err;
    if (value == null) {
        var m = 'Fetching VPN List from internet',
            spinner = new ora(m).start();
        fetch(config.url)
            .then(res => res.text())
            .then(res => res.split(/\r\n|\n|\r/).slice(1, -2).join('\n'))
            .then(csv => neatCsv(csv))
            .then(function(data) {
                spinner.succeed('Remote Resource Fetched');
                cache.set(md5(config.url), data, config.cacheSeconds, function(err, value) {
                    if (err) throw err;
                    handleList(data);
                });
            })
            .catch(error => console.log('Error!', error));
    } else {
        handleList(value);
    }
});
