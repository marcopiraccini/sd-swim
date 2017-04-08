'use strict'

const {EventEmitter} = require('events')
const dgram = require('dgram')
const util = require('util')
const Messages = require('./messages')

function Server (opts) {
  if (!(this instanceof Server)) {
    return new Server(opts)
  }
  this.opts = opts
  this.port = opts.port
  this.logger = opts.logger
  this.messages = new Messages(opts)
}

util.inherits(Server, EventEmitter)

Server.prototype.start = function start (cb) {
  const self = this

  this.server = dgram.createSocket('udp4')
  this.server.on('message', (message, remote) => {
    const {address: host, port} = remote
    const msg = this.messages.decodeMessage(message)
    let eventMessage
    switch(msg.type) {
      case this.messages.types.JOIN:
        eventMessage = 'join'
        break
      case this.messages.types.UPDATE_JOIN:
        eventMessage = 'update-join'
        break
      case this.messages.types.PING:
        eventMessage = 'ping'
        break
      case this.messages.types.PING_REQ:
        eventMessage = 'ping-req'
        break
      case this.messages.types.ACK:
        eventMessage = 'ack'
        break
      default:
        eventMessage = 'unknown'
    }
    return this.emit(eventMessage, {sender: {host, port}}, msg)
  })

  this.server.on('error', err => {
    if (cb) {
      return cb(err)
    }
    return this.emit('error', err)
  })
  this.server.on('listening', () => {
    const {port} = this.server.address()
    return this.emit('up', port)
  })

  if (cb) {
    return this.server.bind(this.port, null, function listen () { // this CB takes no params (from `dgram doc`)
      const {port} = self.server.address()
      return cb(null, port)
    })
  }
  return this.server.bind(this.port)
}

Server.prototype.stop = function stop (cb) {
  this.server.close(cb)
}

module.exports = Server
