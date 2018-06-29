#!/bin/sh
yum -y install redis hiredis bc python2-pyyaml
systemctl start redis
systemctl enable redis
echo ./vpngate_parser.js
