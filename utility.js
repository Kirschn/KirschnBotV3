/**
 * Created by Kirschn on 25.11.2017.
 */
var kue = require('kue')
    , queue = kue.createQueue();
function isBotAdmin(username) {
    // Replace this with a sql query at some point
    return (username == "thekirschn");
}
function answerWhisper(job, msg) {
    queue.create("whisper_send", {
        to: job.data.from,
        message: msg
    }).priority("high").save();
    job.log("Answered: " + msg);
}

queue.process("irc_whisper", function(job, done) {
    if (isBotAdmin(job.data.from)) {
        job.log("User is Admin. Processing Command.");
        var arguments = job.data.message.split(" ");
        switch (arguments[0]) {
            case "join":
                // Join a new channel
                if (arguments[1] !== undefined) {
                    // Add Channel # if user forgot
                    if (arguments[1][0] !== "#") {
                        arguments[1] = "#" + arguments[1];
                    }
                    queue.create("ircjoin", {
                        "channel": arguments[1]
                    }).priority("high").save();
                }
                answerWhisper(job, "Joined Channel.");
                done();
                break;
            case "say":
                // Say a command
                if (arguments[2] !== undefined) {
                    var sendMessage = job.data.message
                        .replace(arguments[0] + " " + arguments["1"] + " ", "");
                    // Add Channel # if user forgot
                    if (arguments[1][0] !== "#") {
                        arguments[1] = "#" + arguments[1];
                    }
                    queue.create("ircsend-" + arguments[1], {
                        "message": sendMessage,
                        "channel": arguments[1]
                    }).priority("high").save();
                }
                answerWhisper(job, "Message was sent.");
                done();
                break;
            default:
                //default
                answerWhisper(job, "Parsing Error.")
                done();
                break;
        }

    } else {
        job.log("User not admin, not processing");
        done();

    }

})