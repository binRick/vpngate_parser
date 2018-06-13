#!/bin/sh

TUN=$1
TUN_ID=$2

TUN_PORT=449${TUN_ID}
TUN_ID_HEX=$(echo "obase=16; $TUN_ID" | bc| tr "[:upper:]" "[:lower:]")

ip route | grep $TUN >/dev/null && ip route add 0.0.0.0/0 dev $TUN table $TUN_ID 2>/dev/null
ip rule  | grep "0x${TUN_ID_HEX} lookup $TUN_ID" | xargs -I % ip rule delete from all fwmark $TUN_ID table $TUN_ID
ip rule add from all fwmark $TUN_ID table $TUN_ID
iptables -A OUTPUT -o eth0 -t mangle -p tcp --dport $TUN_PORT -j MARK --set-mark $TUN_ID
iptables -t nat -I OUTPUT -o eth0 -p tcp --dport $TUN_PORT -j DNAT --to :443
#iptables -I OUTPUT -o $TUN -p tcp ! --dport 443 -j DROP
iptables -t nat -A POSTROUTING -o $TUN -j MASQUERADE
curl -4 https://ifconfig.io:$TUN_PORT
curl -#4Lo /dev/null -kw "\ntime_connect: %{time_connect}s\ntime_namelookup: %{time_namelookup}s\ntime_pretransfer: %{time_pretransfer}\ntime_starttransfer: %{time_starttransfer}s\ntime_redirect: %{time_redirect}s\ntime_total: %{time_total}s\n\n" https://speed.hetzner.de:${TUN_PORT}/100MB.bin
