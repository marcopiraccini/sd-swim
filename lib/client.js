'use strict'

var dgram = require('dgram')

function Client (opts) {
  if (!(this instanceof Client)) {
    return new Client(opts)
  }
  this.opts = opts
  this.logger = this.opts.logger
  this.client = dgram.createSocket('udp4')
}

Client.prototype.send = function send (msg, host, port) {
  this.logger.debug(`Sending message ${msg.toString()}`)
  this.client.send(msg, 0, msg.length, host, port, err => {
    if (err) throw err
    this.logger.debug(`Message of type ${msg.type} sent to ${host}:${port}`)
    this.client.close()
  })
}

Client.prototype.sendMessages = function sendMessages (messages, host, port) {
  for (const msg of messages) {
    this.send(msg, host, port)
  }
}

module.exports = Client
