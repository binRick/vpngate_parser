var l = console.log;

$(document).ready(function() {
    l('ready to go');
    $('#vpnEndpoints').dataTable();


    $.get('/api/vpnStats', function(b) {
        //l(b.complete.data[0]);


        var map = new Datamap({
            element: document.getElementById('vpn-map'),
            fills: {
                HIGH: '#afafaf',
                LOW: '#123456',
                MEDIUM: 'blue',
                UNKNOWN: 'rgb(0,0,0)',
                defaultFill: 'red'
            },
            data: {},
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
                return '<div class="hoverinfo">'+
				'<strong>'+ geography.data.ipInfo.city+', '+geography.data.ipInfo.country_name + '</strong>'+
				'<p>'+geography.data.result.parsed.perSecondRate+'</p>'+
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
