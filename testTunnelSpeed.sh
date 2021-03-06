#!/bin/sh
TUN=$1
TUN_ID=$2
TEST_TYPE=$3
RX_B_FILE="/sys/class/net/${TUN}/statistics/rx_bytes"


TUN_PORT=449${TUN_ID}
TUN_ID_HEX=$(echo "obase=16; $TUN_ID" | bc| tr "[:upper:]" "[:lower:]")
SPEED_TEST_URL="https://github.com:${TUN_PORT}/jamesward/play-load-tests/raw/master/public/10mb.txt"
SPEED_TEST_URL="https://raw.githubusercontent.com:${TUN_PORT}/smclt30p/speedtest/master/5MB"

sysctl -w net.ipv4.conf.default.rp_filter=2 >/dev/null 2>&1
sysctl -w net.ipv4.conf.all.rp_filter=2 >/dev/null 2>&1

ls $RX_B_FILE >/dev/null || { echo "Tunnel \"$TUN\" not up." && exit 1; }
ip route | grep $TUN >/dev/null && ip route add 0.0.0.0/0 dev $TUN table $TUN_ID 2>/dev/null
ip rule | grep fwmark| grep lookup| tr -s ' '| cut -d' ' -f6| xargs -I % ip rule delete from all fwmark % table %
ip rule add from all fwmark $TUN_ID table $TUN_ID
iptables -A OUTPUT -o eth0 -t mangle -p tcp --dport $TUN_PORT -j MARK --set-mark $TUN_ID
iptables -t nat -I OUTPUT -o eth0 -p tcp --dport $TUN_PORT -j DNAT --to :443
iptables -I OUTPUT -o $TUN -p tcp ! --dport 443 -j DROP
iptables -t nat -A POSTROUTING -o $TUN -j MASQUERADE


cat /sys/class/net/${TUN}/statistics/rx_bytes
curl -#4Lo /dev/null -kw "\ntime_connect: %{time_connect}s\ntime_namelookup: %{time_namelookup}s\ntime_pretransfer: %{time_pretransfer}\ntime_starttransfer: %{time_starttransfer}s\ntime_redirect: %{time_redirect}s\ntime_total: %{time_total}s\n\n" $SPEED_TEST_URL
cat /sys/class/net/${TUN}/statistics/rx_bytes
