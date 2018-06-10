module.exports = {
    url: process.VPNLISTURL || 'http://www.vpngate.net/api/iphone/',
    cacheSeconds: process.CACHESECONDS || 60 * 30,
    vpnConcurrency: process.VPNCONCURRENCY || 15,
    vpnTimeLimit: process.VPNTIMELIMIT || 5000,
    openvpn: process.OPENVPN || '/usr/sbin/openvpn',
};
