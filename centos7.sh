#!/bin/sh
command bc >/dev/null 2>&1 || sudo yum -y install bc
yum -y install redis hiredis  >/dev/null 2>&1
systemctl start redis >/dev/null 2>&1
systemctl enable redis >/dev/null 2>&1
export VPNCONCURRENCY=50
export VPNTIMELIMIT=5000
export MAXVPNS=15
echo ./vpngate_parser.js
