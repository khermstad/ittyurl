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

const db_config = {
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DB
}

var connection

function handleDisconnect() {
  connection = mysql.createConnection(db_config); // Recreate the connection, since
                                                  // the old one cannot be reused.

  connection.connect(function(err) {              // The server is either down
    if(err) {                                     // or restarting (takes a while sometimes).
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
    }                                     // to avoid a hot loop, and to allow our node script to
  });                                     // process asynchronous requests in the meantime.
                                          // If you're also serving http, display a 503 error.
  connection.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
      handleDisconnect();                         // lost due to either server restart, or a
    } else {                                      // connnection idle timeout (the wait_timeout
      throw err;                                  // server variable configures this)
    }
  });
}
handleDisconnect();


app.listen(app.get('port'), function(){
  console.log('tiny-url clone running on port', app.get('port'))
})

app.get("/", (req, res) =>{
  res.render('index')
})

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

app.post('/getURL', (req, res) =>{
  
  var url = req.body.fullURL
  var encodedURL;
  if (url.substring(0, 7) != "http://"){
    if (url.substring(0, 8) != "https://"){
      url = "http://"+url
    }
  }
  
  var sqlIndexStatement = "SELECT * from `urls` WHERE `fullURL`= ?"
  connection.query(sqlIndexStatement, [url], function(error, results, fields){
    if (error) throw error

    if (results.length == 0){
      console.log("no url in the database")
      encodedURL = "NOT FOUND"

      var sqlInsertNewURL = "INSERT INTO `urls` SET `fullURL` = ?"
      connection.query(sqlInsertNewURL, [url], function(error, results, fields){
        if (error) throw error


        connection.query(sqlIndexStatement, [url], function(error, results, fields){
          if(error) throw error 

          var index = results[0].index
          var encodedIndex = base62.encode(results[0].index)
          
          console.log("index: " + index)
          console.log("encodedIndex: " + encodedIndex)

          res.render('giveShortenedURL', {newURL: encodedIndex})
        })
      })

    }
    // TODO: handle urls that already exist in db
    else{
      console.log("url in db")
      console.log(results[0].index)
      encodedURL = base62.encode(results[0].index)
      console.log(encodedURL)
      res.render('giveShortenedURL', {newURL: encodedURL})
    }
  })

})