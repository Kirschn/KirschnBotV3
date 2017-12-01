module.exports = {
    checkUserState: function (mysql, channel, cb) {

        // Checks Permission level for a specific User on a channel
        // if no channel is given, it checks if the user is entered as a global admin
        if (typeof channel == "function") {
            cb = channel;
            channel = "whispercontrol";
        }
        mysql.query("SELECT username, userlevel FROM users WHERE channel = ? OR channel = 'global'", channel,
            function(err, res) {
                if (err) cb(err);
                var level = 999;
                res.forEach(function (currentRes) {
                    if (currentRes.username == username && level < currentRes.userlevel) {
                        level = currentRes.userlevel;
                    }
                });
                cb(null, level)
            }
        );


    }

}