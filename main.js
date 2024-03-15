const mysql = require('mysql');
const express = require('express');
const session = require('express-session');
const path = require('path');
const crypto = require('crypto')
const cookieParser = require('cookie-parser');
const fs = require('fs');

const connection = mysql.createConnection({
        host     : process.env.DB_HOST,
        user     : process.env.DB_USER,
        password : process.env.DB_PASS,
        database : process.env.DB_DATABASE
});

const app = express();
app.set('view engine' , 'ejs')
app.set('views', './views')
app.use(express.static(__dirname + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());
app.use(session({secret: &quot;Your secret key&quot;, cookie : {secure : false}}));

var logfile = fs.createWriteStream(process.env.LOG_FILE, {flags: 'a'});

var log = (message, level) =&gt; {
        format_message = `[${level.toUpperCase()}] ${message}`;
        logfile.write(format_message + &quot;\n&quot;)
        if (level == &quot;warn&quot;) console.warn(message)
        else if (level == &quot;error&quot;) console.error(message)
        else if (level == &quot;info&quot;) console.info(message)
        else console.log(message)
}

// http://localhost:8080/
app.get('/', function(request, response) {

        if (request.session.username) {

                connection.query('SELECT user,time FROM users', function(error, results) {
                        var users = []
                        if (error) {
                                log(error, &quot;error&quot;)
                        };

                        for (let row in results){

                                let min = results[row].time % 60;
                                let padded_min = `${min}`.length == 1 ? `0${min}` : `${min}`
                                let time = `${(results[row].time - min) / 60}:${padded_min} h`;
                                users.push({name : results[row].user, time : time});
                        }
                        response.render('home', {users : users});
                });

        } else{
                response.render('login');
        }

});



// http://localhost:8080/time
app.post('/time', function(request, response) {

    if (request.session.loggedin &amp;&amp; request.session.username) {

        let timeCalc = parseInt(eval&amp;#40;request.body.time&amp;#41;);
                let time = isNaN(timeCalc) ? 0 : timeCalc;
        let username = request.session.username;

                connection.query(&quot;UPDATE users SET time = time + ? WHERE user = ?&quot;, [time, username], function(error, results, fields) {
                        if (error) {
                                log(error, &quot;error&quot;)
                        };

                        log(`${username} added ${time} minutes.`, &quot;info&quot;)
                        response.redirect('/');
                });
        } else {
        response.redirect('/');;
    }

});

// http://localhost:8080/auth
app.post('/auth', function(request, response) {

        let username = request.body.username;
        let password = request.body.password;

        if (username &amp;&amp; password) {

                let hash = crypto.createHash('md5').update(password).digest(&quot;hex&quot;);

                connection.query('SELECT * FROM users WHERE user = ? AND pass = ?', [username, hash], function(error, results, fields) {

                        if (error) {
                                log(error, &quot;error&quot;)
                        };

                        if (results.length &gt; 0) {

                                request.session.loggedin = true;
                                request.session.username = username;
                                log(`User ${username} logged in`, &quot;info&quot;);
                                response.redirect('/');
                        } else {
                                log(`User ${username} tried to log in with pass ${password}`, &quot;warn&quot;)
                                response.redirect('/');
                        } 
                });
        } else {
                response.redirect('/');
        } 

});

app.listen(8080, () =&gt; {
        console.log(&quot;App listening on port 8080&quot;)
});
