#!/usr/bin/env node

var fs = require('fs'),
    _ = require('underscore'),
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

if (!fs.existsSync(config.vpnConfigFileDirectory))
    fs.mkdirSync(config.vpnConfigFileDirectory);

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
    console.log('\nParsed ' + c.yellow.bgBlack(Object.keys(list).length) + ' VPN Servers in ' + c.yellow.bgBlack(countryList(list).length) + ' Different Countries: ' + c.yellow.bgBlack(countryList(list)) + '\n');
};
var executeList = function(list) {
    async.mapLimit(list, config.vpnConcurrency, function(item, _cb) {
            l('Working on ' + c.yellow.bgBlack(item.hostname) + ' using a OpenVPN Client config of ' + c.yellow.bgBlack(item.file.length) + ' bytes');
            fs.writeFileSync(item.file, item.config);
            item.stdout = '';
            item.stderr = '';
            item.tunnel = null;
            item.localAddr = null;
            item.remoteAddr = null;
            item.netmask = null;
            var vpnProcess = child.spawn('sudo', [config.openvpn, item.file]);
            vpnProcess.stdout.on('data', function(dat) {
                dat = dat.toString();
                item.stdout += dat;
                _.each(item.stdout.split("\n"), function(lin) {
                    lin = lin.split(" ").join(" ");
                    if (lin.includes('ifconfig') && lin.includes('netmask 255.255.255.255 up')) {
                        item.tunnel = lin.split("ifconfig")[1].split(' ').join(' ').split(' ')[1].split(' ')[0];
                    } else if (lin.includes('ip addr add dev')) {
                        item.tunnel = lin.split('ip ')[1].split(' ')[3];
                    }
                });
                if (item.stdout.includes('Initialization Sequence Completed')) {
                    l(c.yellow.bgBlack(item.hostname) + ' : ' + c.green.bgBlack('Tunnel Ready on interface ') + c.yellow.bgBlack(item.tunnel));
                }
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
                return _cb(null, item);
            });
            var killer = setTimeout(function() {
                    if (item.tunnel == null) {
                        l(c.red.bgBlack('Rejecting VPN Server ') + c.yellow.bgBlack(item.hostname));
                        l(c.red('Terminating ' + item.hostname + ' pid ' + c.black.bgWhite(vpnProcess.pid)));
                        return child.execSync('sudo kill ' + vpnProcess.pid);
                    } else
                        try {
                            var o = child.execSync('ifconfig ' + item.tunnel).toString().split(' ').join(' ');
                            _.each(o.split("\n"), function(lin) {
                                if (lin.includes("inet ")) {
                                    lin = lin.split(' ').join(' ').split('inet ')[1].split(' ');
                                    if (lin[2] == 'netmask') {
                                        //centos
                                        l('centos', lin)
                                        item.localAddr = lin[0];
                                        item.remoteAddr = lin[6];
                                        item.netmask = lin[3];
                                    } else if (lin[1] == '-->') {
                                        //osx
                                        l('osx', lin)
                                        item.localAddr = lin[0];
                                        item.remoteAddr = lin[2];
                                        item.netmask = lin[4];
                                    }else{
				    	l(c.red.bgBlack('Unknown ifconfig output!'));
					    l(lin);
					    process.exit(-1);
				    }
                                }
                            });
                            try {
                                l(c.red('Terminating ' + item.hostname + ' pid ' + c.black.bgWhite(vpnProcess.pid)));
                                child.execSync('sudo kill ' + vpnProcess.pid);
                            } catch (e) {
                                l(c.red.bgBlack('Failed to Terminate VPN on ' + c.yellow.bgBlack(item.hostname)))
                                return _cb(null, item);
                            }
                        } catch (e) {
                            l(c.red.bgBlack('Failed to establish VPN with ' + c.yellow.bgBlack(item.hostname)))
                        }
                },
                config.vpnTimeLimit);
        },
        function(e, done) {
            if (e) throw e;
            var acceptedVpns = done.filter(function(item) {
                return (item.localAddr != null && item.remoteAddr != null && item.netmask != null && item.tunnel != null);
            });
            l(c.black.bgWhite(acceptedVpns.length) + c.white.bgBlack(' / ') + c.black.bgWhite(done.length) + ' ' + c.green.bgBlack(' VPN Servers are reachable'));
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
            item.file = config.vpnConfigFileDirectory + '/' + item.hostname + '.ovpn';
            twig.renderFile(templateFile, item, function(e, configFile) {
                if (e) throw e;
                item.config = configFile;
                _cb(null, item);
            });
        });
    }, function(e, newList) {
        if (e) throw e;
        newList = newList.slice(0, config.maxVPNs);
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
