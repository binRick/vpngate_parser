var l = console.log;

$.get('/api/vpnCountryInfos', function(vpnCountryInfos) {
    $.get('/api/vpnStats', function(b) {
        $.get('/api/vpnCountries', function(vpnCountries) {
            $(document).ready(function() {
                l(vpnCountryInfos);

                $(function() {
                    var pstyle = 'background-color: #F5F6F7; border: 1px solid #dfdfdf; padding: 5px;';
                    $('#layout').w2layout({
                        name: 'layout',
                        panels: [{
                                type: 'top',
                                size: '55%',
                                resizable: true,
                                style: pstyle,
                                content: $('#vpnTableWrapper'),
                                title: $('#pageTitle'),
                            },
                            {
                                type: 'main',
                                content: $('#vpnMapWrapper'),
                                style: pstyle,
                            },
                        ],
                        onComplete: function(event) {
                            console.log('object ' + this.name + ' is rendered');

                        },
                    });
                    $('#vpnEndpoints').dataTable();

                    $('#toolbar').w2toolbar({
                        name: 'toolbar',
                        items: [{
                                type: 'menu-check',
                                id: 'countriesCheck',
                                text: 'Countries',
                                icon: 'fa-heart',
                                selected: vpnCountries.map(function(c) {
                                    return c.country_code;
                                }),
                                onRefresh: function(event) {
                                    event.item.count = event.item.selected.length;
                                },
                                items: vpnCountries.map(function(c) {
                                    return {
                                        id: c.country_code,
                                        text: '<span class="flag-icon flag-icon-' + c.country_code.toLowerCase() + '"></span> ' + c.country_name,
                                        img: 'icon-add',
                                        count: b.complete.data.filter(function(n) {
                                            return n.ipInfo.country_code == c.country_code;
                                        }).length,

                                    };
                                }),
                            }, {
                                type: 'button',
                                id: 'clearCountries',
                                caption: 'Clear Countries',
                                img: 'icon-reload',
                                onClick: function(event) {
                                    l('clearing countries', event);
                                },
                            },
                            {
                                type: 'menu-check',
                                id: 'continentsCheck',
                                text: 'Continents',
                                icon: 'fa-heart',
                                selected: _.uniq(vpnCountryInfos.map(function(c) {
                                    return c.continent;
                                })),
                                onRefresh: function(event) {
                                    event.item.count = event.item.selected.length;
                                },
                                items: _.uniq(vpnCountryInfos, function(c) {
                                    c.Count = 0;
                                    /*
                                    _.each(b.complete.data, function(vpnD){
                                    	_.each(vpnCountryInfos, function(cI){
                                    //l(cI.countryCode, '/', vpnD.ipInfo.country_code);
                                    		if(cI.countryCode==vpnD.ipInfo.country_code){
                                    c.Count++;
                                    		}
                                    	});
                                    });
                                    */
                                    return c.continent;
                                }).map(function(c) {
                                    return {
                                        id: c.continent,
                                        text: c.continentName,
                                        img: 'icon-add',
                                        count: c.Count,
                                    };
                                }),
                            }, {
                                type: 'button',
                                id: 'clearContinents',
                                caption: 'Clear Continents',
                                img: 'icon-reload',
                                onClick: function(event) {
                                    l('clearing continents', event);
                                },
                            },

                        ],
                        onClick: function(event) {
                            if (event.subItem == null) return;
                            event.done(function() {
                                console.log('Selected:', event.item.selected);
                            });
                        }
                    }, );

                    var map = new Datamap({
                        element: document.getElementById('vpn-map'),
                        projection: 'mercator',
                        responsive: false,
                        fills: {
                            defaultFill: '#EDDC4E'
                        },
                        geographyConfig: {
                            highlightBorderColor: '#00000',
                            popupTemplate: function(geography, data) {
                                return '<div class="hoverinfo">' + geography.properties.name + ' ( xx endpoints)</div>';
                            },
                            highlightBorderWidth: 2
                        },
                    });
                    map.addPlugin('markers', Datamap.customMarkers);

                    var options = {
                        fillOpacity: 1,
                        popupOnHover: true,
                        icon: {
                            url: '/images/greenVpn.png',
                            width: 30,
                            height: 30
                        },
                        popupTemplate: function(geography, data) {
                            return '<div class="hoverinfo">' +
                                '<strong>' + geography.data.ipInfo.city + ', ' + geography.data.ipInfo.country_name + '</strong>' +
                                '<p>' + geography.data.result.parsed.perSecondRate + '</p>' +
                                '</div>';
                        },
                    };

                    var mapMarkers = b.complete.data.map(function(v) {
                        var vpn = {
                            name: v.ipInfo.ip,
                            radius: 10,
                            latitude: v.ipInfo.latitude,
                            longitude: v.ipInfo.longitude,
                            data: v,
                        };
                        return vpn;
                    });
                    map.markers(mapMarkers, options);

                    var mapArcs = b.complete.data.map(function(v) {
                        var vpnArc = {
                            options: {
                                animationSpeed: 700,
                                strokeWidth: 2,
                                strokeColor: 'black'
                            },
                            origin: {
                                latitude: publicIpInfo.latitude,
                                longitude: publicIpInfo.longitude,
                            },
                            destination: {
                                latitude: v.ipInfo.latitude,
                                longitude: v.ipInfo.longitude,
                            },
                        };
                        return vpnArc;
                    });

                    map.arc(mapArcs, {
                        strokeWidth: 2,
                        popupOnHover: false,
                    });

                    var options = {
                        fillOpacity: 1,
                        popupOnHover: true,
                        icon: {
                            url: '/images/server-icon.png',
                            width: 15,
                            height: 15
                        }
                    };
                    map.markers([{
                        name: 'VPN Endpoint',
                        radius: 60,
                        latitude: publicIpInfo.latitude,
                        longitude: publicIpInfo.longitude,
                    }], options);

                    var options = {
                        fillOpacity: 1,
                        popupOnHover: true,
                        icon: {
                            url: '/images/home-icon.png',
                            width: 15,
                            height: 15
                        }
                    };
                    map.markers([{
                        name: 'Your Computer',
                        radius: 60,
                        latitude: clientIpInfo.latitude,
                        longitude: clientIpInfo.longitude,
                    }], options);

                });
            });
        });
    });
});
