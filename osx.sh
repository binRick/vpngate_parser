#!/bin/sh
export OPENVPN=./openvpn/osx/openvpn-2.4.5-openssl-1.0.2n
export VPNCONCURRENCY=5
export VPNTIMELIMIT=5000
export MAXVPNS=15
./vpngate_parser.js
