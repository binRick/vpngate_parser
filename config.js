var l = console.log;
module.exports = {
    url: process.env.VPNLISTURL || 'http://www.vpngate.net/api/iphone/',
    cacheSeconds: process.env.CACHESECONDS || 60 * 30,
    vpnConcurrency: process.env.VPNCONCURRENCY || 200,
    vpnTimeLimit: process.env.VPNTIMELIMIT || 30000,
    openvpn: process.env.OPENVPN || '/usr/sbin/openvpn',
    vpnConfigFileDirectory: process.env.VPNCONFIGFILEDIRECTORY || __dirname + '/vpnConfigFiles',
    maxVPNs: process.env.MAXVPNS || 999,

};