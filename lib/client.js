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

Client.prototype.send = function send (msg) {
  const {host, port, data} = msg
  this.logger.debug(`Sending message ${data.toString()} to ${host}:${port}`)
  this.client.send(data, 0, msg.length, host, port, err => {
    if (err) throw err
    this.logger.debug(`Message of type ${msg.type} sent to ${host}:${port}`)
    this.client.close()
  })
}

Client.prototype.sendMessages = function sendMessages (messages) {
  for (const msg of messages) {
    this.send(msg)
  }
}

module.exports = Client
