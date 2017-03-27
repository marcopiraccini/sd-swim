'use strict'

var dgram = require('dgram')

function Client (opts) {
  if (!(this instanceof Client)) {
    return new Client(opts)
  }
  this.opts = opts
  this.client = dgram.createSocket('udp4')
  this.debug = this.opts.logger.debug
  this.info = this.opts.logger.debug
}

Client.prototype.sendMessage = function sendMessage (msg) {
  const {host, port} = msg.target
  this.debug(`Sending message ${msg.toString()}`)
  this.client.send(msg, 0, msg.length, host, port, err => {
      if (err) throw err
      this.debug(`Message of type ${msg.type} sent to ${host}:${port}`)
      this.client.close()
  })
}

Client.prototype.sendMessages = messages => messages.forEach(msg => this.sendMessage(msg))

module.exports = Client
