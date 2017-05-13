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

app.listen(app.get('port'), function(){
  console.log('tiny-url clone running on port', app.get('port'))
})

app.get("/", (req, res) =>{
  res.render('index')
})

app.get('/tiny/:tagId', function(req, res){
  res.send("tagId is set to " + req.params.tagId)
})

