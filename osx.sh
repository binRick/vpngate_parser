#!/bin/sh
export OPENVPN=./openvpn/osx/openvpn-2.4.5-openssl-1.0.2n
export VPNCONCURRENCY=100
export VPNTIMELIMIT=5000
export MAXVPNS=999
./vpngate_parser.js
