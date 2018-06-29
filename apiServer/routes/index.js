var express = require('express'),
    request = require('request'),
    router = express.Router(),
    async = require('async'),
    _ = require('underscore'),
    l = console.log,
    ip2location = require('ip-to-location'),
    publicIp = require('public-ip'),
countryInfos = require('./countryInfos.json');

var urls = {
    completeStats: 'http://localhost:3000/kue-api/jobs/Tunnel%20Speed%20Report/complete/stats',
    completes: 'http://localhost:3000/kue-api/jobs/Tunnel%20Speed%20Report/complete/0..__QTY__/desc',
};

var getStats = function(cb) {
    request.get(urls.completeStats, function(e, dat) {
        if (e) throw e;
        var stats = {
            complete: {
                qty: JSON.parse(dat.body).count,
            },
        };
        request.get(urls.completes.replace('__QTY__', stats.complete.qty), function(e, dat) {
            if (e) throw e;
            stats.complete.data = JSON.parse(dat.body);
            async.map(stats.complete.data, function(o, _cb) {
                ip2location.fetch(o.data.IP, function(err, res) {
                    if (err) throw err;
                    o.ipInfo = res;
                    o.ipInfo.city = o.ipInfo.city || 'Unknown';
                    _cb(null, o);
                });
            }, function(er, data) {
                stats.complete.data = data;
                cb(stats);
            });
        });
    });
};

router.get('/api/vpnCountryInfos', function(req, res, next) {
	return res.json(countryInfos.countries.country);
});
router.get('/api/vpnCountries', function(req, res, next) {
    getStats(function(stats) {
        var countries = _.uniq(stats.complete.data.map(function(v) {
            return {
                country_name: v.ipInfo.country_name,
                country_code: v.ipInfo.country_code,
            };
        }), false, function(n) {
            return n.country_code;
        });
        return res.json(countries);
    });
});
router.get('/api/vpnStats', function(req, res, next) {
    getStats(function(stats) {
        return res.json(stats);
    });
});
router.get('/api/publicIp', function(req, res, next) {
    publicIp.v4().then(function(ip) {
        return res.json({
            ip: ip
        });
    });
});

router.get('/js/index.js', function(req, res, next) {
    res.sendFile(__dirname + '/js/index.js');
});

router.get('/', function(req, res, next) {
    request.get(urls.completeStats, function(e, dat) {
        if (e) throw e;
        var stats = {
            complete: {
                qty: JSON.parse(dat.body).count,
            },
        };
        request.get(urls.completes.replace('__QTY__', stats.complete.qty), function(e, dat) {
            if (e) throw e;
            getStats(function(stats) {
                publicIp.v4().then(function(publicIp) {
                    ip2location.fetch(publicIp, function(err, publicIpInfo) {
                        if (err) throw err;
                        var clientIp = String(req.headers['x-forwarded-for'] || req.connection.remoteAddress).replace('::ffff:', '');
                        ip2location.fetch(clientIp, function(err, clientIpInfo) {
                            if (err) throw err;
                            res.render('index', {
                                stats: stats,
                                publicIpInfo: JSON.stringify(publicIpInfo),
                                publicIp: publicIp,
                                clientIp: clientIp,
                                clientIpInfo: JSON.stringify(clientIpInfo),
                            });
                        });
                    });
                });
            });
        });
    });
});

module.exports = router;
