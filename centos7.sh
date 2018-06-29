#!/bin/sh
yum -y install redis hiredis bc python2-pyyaml tmux && \
	rm -rf tmuxp && \
	git clone https://github.com/tmux-python/tmuxp && cd tmuxp && python setup.py install && \
	systemctl start redis && \
	systemctl enable redis && \
	echo ./vpngate_parser.js && \
	echo "tmuxp load kueRedisServices-tmuxp.yaml"
