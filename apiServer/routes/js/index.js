var l = console.log;

$(document).ready(function() {
    l('ready to go');
    $('#vpnEndpoints').dataTable();


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
    map.bubbles([{
            name: 'Hot',
            latitude: 21.32,
            longitude: 5.32,
            radius: 10,
            fillKey: 'HIGH'
        },
        {
            name: 'Chilly',
            latitude: -25.32,
            longitude: 120.32,
            radius: 18,
            fillKey: 'LOW'
        },
        {
            name: 'Hot again',
            latitude: 21.32,
            longitude: -84.32,
            radius: 8,
            fillKey: 'HIGH'
        },

    ], {
        popupTemplate: function(geo, data) {
            return "<div class='hoverinfo'>It is " + data.name + "</div>";
        }
    });

    map.arc([{
            origin: {
                latitude: 40.639722,
                longitude: 73.778889
            },
            destination: {
                latitude: 37.618889,
                longitude: -122.375
            }
        },
        {
            origin: {
                latitude: 30.194444,
                longitude: -97.67
            },
            destination: {
                latitude: 25.793333,
                longitude: -0.290556
            }
        }
    ], {
        strokeWidth: 2
    });



});
