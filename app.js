'use strict'
// app.js for tiny url clone
const express = require('express')
const app = express()
const parser = require('body-parser')
const mysql = require('mysql')
const base62 = require('base62')

app.set('view engine', 'pug')
app.use(parser.urlencoded({extended: true}))
app.use(parser.json())
app.use(express.static('public'))

app.set('port', (process.env.PORT || 5001))

// database credentals stored in environment variables passed via start.sh script in project folder (not hosted on github, duh!)
// (on heroku in Config Vars)
const db_config = {
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DB
}

// MySQL connector
// passes db_config to mysql.CreateConnection(db_config)
var connection

function handleDisconnect() {
  connection = mysql.createConnection(db_config); 
                                          
  connection.connect(function(err) {              
    if(err) {                                     
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
    }                                     // to avoid a hot loop, and to allow our node script to
  })                                      // process asynchronous requests in the meantime.
                                          // If you're also serving http, display a 503 error.
  connection.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
      handleDisconnect();                         // lost due to either server restart, or a
    } else {                                      // connnection idle timeout (the wait_timeout
      throw err;                                  // server variable configures this)
    }
  })
}
handleDisconnect();

// REST api
app.listen(app.get('port'), function(){
  console.log('tiny-url clone running on port', app.get('port'))
})

app.get("/", (req, res) =>{
  res.render('index')
})

// handles the access of shortened urls via /tiny/<shortened url>
app.get('/tiny/:tagId', function(req, res){
  var decodedURL = base62.decode(req.params.tagId)
  var sqlSelectFromIndex = "SELECT * from `urls` where `index` = ?"
  
  connection.query(sqlSelectFromIndex, [decodedURL], function(error, results, fields){
    if (error) throw error
      if (results.length == 0){
        res.render('notfound')
      }
      else{
        res.redirect(results[0].fullURL)
      }
    })
})

// handles all procesing of URL's passed through index form
app.post('/getURL', (req, res) =>{
  var url = req.body.fullURL
  var encodedURL;
  
  // check for http/https, if not included, add to submitted URL
  if (url.substring(0, 7) != "http://"){
    if (url.substring(0, 8) != "https://"){
      url = "http://"+url
    }
  }
  
  // check if submitted URL already exists in DB
  var sqlIndexStatement = "SELECT * from `urls` WHERE `fullURL`= ?"
  connection.query(sqlIndexStatement, [url], function(error, results, fields){
    if (error) throw error

    // if URL not found, insert into DB and return new shortened URL, else return encoded index url
    if (results.length == 0){
      encodedURL = "NOT FOUND"

      var sqlInsertNewURL = "INSERT INTO `urls` SET `fullURL` = ?"
      connection.query(sqlInsertNewURL, [url], function(error, results, fields){
        if (error) throw error


        connection.query(sqlIndexStatement, [url], function(error, results, fields){
          if(error) throw error 
          
          // get index from results
          var index = results[0].index
          // encode index into base62
          var encodedIndex = base62.encode(results[0].index)
          res.render('giveShortenedURL', {newURL: encodedIndex})
        })
      })
    } else{ 
      // update dateLastAccessed to now

      var SQLupdateDateLastAccessed = "UPDATE urls set `dateLastAccessed` = NOW() where `fullURL` = ?"
      connection.query(SQLupdateDateLastAccessed, [results[0].fullURL], function(error, results, fields){
          if (error) throw error 

          
      })
      // URL exists in DB, so return index encoded and pass to render 'giveShortenedURL'
      encodedURL = base62.encode(results[0].index)
      res.render('giveShortenedURL', {newURL: encodedURL})
      }
  })
})