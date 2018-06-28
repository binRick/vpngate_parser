#quantity of vpn endpoints with completed speed test:

curl http://localhost:3000/kue-api/jobs/Tunnel%20Speed%20Report/complete/stats

=> 1

#get that quantity of completed vpn endpoints:
curl http://localhost:3000/kue-api/jobs/Tunnel%20Speed%20Report/complete/0..1/desc

