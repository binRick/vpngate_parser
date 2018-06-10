#!/usr/bin/env node

var l = console.log,
    kue = require('kue'),
    kueScheduler = require('kue-scheduler'),
    schedulerQueue = kueScheduler.createQueue(),
    jobData = {
        title: 'welcome email for tj',
 //       to: 'badEmail1',
       to: 'good@email.com15',
        template: 'welcome-email'
    };

var job = schedulerQueue.createJob('email', jobData).attempts(3).priority('normal').attempts(5).searchKeys(['to', 'title']).unique(jobData.to);
schedulerQueue.every('2 seconds', job);

