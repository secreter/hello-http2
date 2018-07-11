'use strict'

const fs = require('fs')
const path = require('path')
// eslint-disable-next-line
const http2 = require('http2')
const helper = require('./lib/getFiles')

const { HTTP2_HEADER_PATH } = http2.constants
const PORT = process.env.PORT || 8444
const PUBLIC_PATH = path.join(__dirname, '../public')

const publicFiles = helper.getFiles(PUBLIC_PATH)
const server = http2.createSecureServer({
  key: fs.readFileSync('./ssl/2_node.redream.cn.key'),
  cert: fs.readFileSync('./ssl/1_node.redream.cn_bundle.crt')
}, onRequest)

// Push file
function push (stream, path) {
  const file = publicFiles.get(path)

  if (!file) {
    return
  }

  stream.pushStream({ [HTTP2_HEADER_PATH]: path }, (pushStream) => {
    pushStream.respondWithFD(file.fileDescriptor, file.headers)
  })
}

// Request handler
function onRequest (req, res) {
  const reqPath = req.url === '/' ? '/index.html' : req.url
  const file = publicFiles.get(reqPath)

  // File not found
  if (!file) {
    res.statusCode = 404
    res.end()
    return
  }

  // Push with index.html
  if (reqPath === '/index.html') {
    push(res.stream, '/index.css')
    // push(res.stream, '/bundle2.js')
  }

  // Serve file
  res.stream.respondWithFD(file.fileDescriptor, file.headers)
}

server.listen(PORT, (err) => {
  if (err) {
    console.error(err)
    return
  }

  console.log(`Server listening on ${PORT}`)
})