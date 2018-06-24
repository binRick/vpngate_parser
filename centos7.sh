#!/bin/sh
command bc >/dev/null 2>&1 || sudo yum -y install bc
export VPNCONCURRENCY=50
export VPNTIMELIMIT=5000
export MAXVPNS=15
./vpngate_parser.js
