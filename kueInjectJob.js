#!/usr/bin/env node

var l = console.log,
    kue = require('kue'),
    queue = kue.createQueue(),
    jobData = {
        title: 'welcome email for tj',
  //      to: 'badEmail1',
      to: 'good@email.com12',
        template: 'welcome-email'
    };

var job = queue.create('email', jobData).priority('high').attempts(5).searchKeys(['to', 'title']).save(function(err) {
    if (err) throw err;
    l('Saved job #', job.id);
});

job.on('complete', function(result) {
    console.log('Job completed with data ', result);

}).on('failed attempt', function(errorMessage, doneAttempts) {
    console.log('Job failed');

}).on('failed', function(errorMessage) {
    console.log('Job failed');

}).on('progress', function(progress, data) {
    console.log('\r  job #' + job.id + ' ' + progress + '% complete with data ', data);

});
