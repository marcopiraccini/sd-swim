'use strict'

const {EventEmitter} = require('events')
const dgram = require('dgram')
const util = require('util')

function Server (opts) {
  if (!(this instanceof Server)) {
    return new Server(opts)
  }
  this.opts = opts
  this.port = opts.port
  this.server = dgram.createSocket('udp4')

  this.server.on('message', (msg, remote) => {
    const {address: host, port} = remote
    return this.emit('message', {sender: {host, port}}, msg)
  })
  this.server.on('error', err => {
    return this.emit('error', err)
  })
  this.server.on('listening', () => {
    const {port} = this.server.address()
    return this.emit('up', port)
  })
}

util.inherits(Server, EventEmitter)

Server.prototype.start = function start (cb) {
  const self = this
  if (cb) {
    return this.server.bind(this.port, null, function listen () { // this CB takes no params (from `dgram doc`)
      const {port} = self.server.address()
      return cb(port)
    })
  }
  return this.server.bind(this.port)
}

Server.prototype.stop = function stop (cb) {
  this.server.close(cb)
}

module.exports = Server
