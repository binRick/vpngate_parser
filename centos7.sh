#!/bin/sh
yum -y install redis hiredis bc python2-pyyaml && \
	pip install tmuxp && \
	systemctl start redis && \
	systemctl enable redis && \
	echo ./vpngate_parser.js && \
	echo "tmuxp load kueRedisServices-tmuxp.yaml"
