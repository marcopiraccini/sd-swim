'use strict'

var dgram = require('dgram')
const Messages = require('./messages')

function Client (opts) {
  if (!(this instanceof Client)) {
    return new Client(opts)
  }
  this.opts = opts
  this.logger = this.opts.logger
  this.messages = new Messages(opts)
  this.client = dgram.createSocket('udp4')
}

Client.prototype.send = function send (msg) {
  const {host, port, type, data} = msg
  this.logger.debug(`Sending message ${data.toString()} to ${host}:${port}`)
  this.client.send(data, 0, data.length, port, host, err => {
    if (err) throw err
    this.logger.debug(`Message of type ${type} sent to ${host}:${port}`)
    this.client.close()
  })
}

Client.prototype.sendMessages = function sendMessages (messages) {
  for (const msg of messages) {
    this.send(msg)
  }
}

Client.prototype.sendJoinMessages = function sendJoinMessages (initialHosts) {
  const messages = this.messages.joinMessages(initialHosts)
  this.sendMessages(messages)
}

module.exports = Client
