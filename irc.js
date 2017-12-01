/**
 * Created by Kirschn on 25.11.2017.
 */
var fs = require("fs");
var tmi = require("tmi.js");
var kue = require('kue')
    , queue = kue.createQueue();
var ircClients = [];
var config = JSON.parse(fs.readFileSync("config.json", "utf8"));
queue.process('ircjoin', function(job, done) {
    // Generate new IRC Client and join Channel

    if (job.data.username == undefined) {
        // first load data from file
        job.data.username = config.irc.username;
        job.data.oauth = config.irc.oauth;
    }
    ircClients[job.data.channel] = new tmi.client({
        identity: {
            username: job.data.username,
            password: job.data.oauth
        },
        channels: [job.data.channel]
    });
    ircClients[job.data.channel].on("connecting", function() {
        job.progress(1, 2);
        job.log("Connecting...");
    });
    ircClients[job.data.channel].on("connected", function(address, port) {
        job.progress(2, 2);
        done();
        queue.process('ircsend-' + job.data.channel, function(sendjob, doneMSG) {
            ircClients[job.data.channel].say(sendjob.data.channel, sendjob.data.message);
            doneMSG();
        });
    });
    ircClients[job.data.channel].on("message", function(channel, userstate, message, self) {
        //Message came from myself, dont process
        if (self || userstate["message-type"] == "whisper") return;
        var newJob = queue.create("irc_" + userstate["message-type"], {
            "channel": channel,
            "userstate": userstate,
            "message": message
        }).priority("low").save();
        newJob.log("Starting to process: " + message + " at " + channel)

    })
    ircClients[job.data.channel].connect();

})
queue.process('irc-whisper-join', function(job, done) {
    // Generate new IRC Client and join Channel
    ircClients["whisper"] = new tmi.client({
        identity: {
            username: job.data.username,
            password: job.data.oauth
        }
    });
    ircClients["whisper"].on("connecting", function() {
        job.progress(1, 2);
        job.log("Connecting...");
    });
    ircClients["whisper"].on("connected", function(address, port) {
        job.progress(2, 2);
        done();
        queue.process('whisper_send', function(sendjob, donenew) {
            ircClients["whisper"].whisper(sendjob.data.to, sendjob.data.message);
            donenew();
        });
    });
    ircClients["whisper"].on("message", function(channel, userstate, message, self) {
        //Message came from myself, dont process
        if (self || userstate["message-type"] !== "whisper") return;
        var newJob = queue.create("irc_whisper", {
            "from": channel.substr(1),
            "userstate": userstate,
            "message": message
        }).priority("low").save();
        newJob.log("Starting to process: " + message + " at " + channel)
    })
    ircClients["whisper"].connect();

})