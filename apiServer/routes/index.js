var express = require('express'),
    request = require('request'),
    router = express.Router(),
    async = require('async'),
    _ = require('underscore'),
    l = console.log,
    ip2location = require('ip-to-location');

var urls = {
    completeStats: 'http://localhost:3000/kue-api/jobs/Tunnel%20Speed%20Report/complete/stats',
    completes: 'http://localhost:3000/kue-api/jobs/Tunnel%20Speed%20Report/complete/0..__QTY__/desc',
};

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
            stats.complete.data = JSON.parse(dat.body);
            async.map(stats.complete.data, function(o, _cb) {
                ip2location.fetch(o.data.IP, function(err, res) {
                    if (err) throw err;
                    o.ipInfo = res;
                    _cb(null, o);
                });
            }, function(er, data) {
                stats.complete.data = data;
                l(stats.complete.data[0]);
                res.render('index', {
                    stats: stats
                });
            });

        });
    });
});

module.exports = router;