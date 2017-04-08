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
  this.logger.debug(`Sending message ${data} to ${host}:${port}`)
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

Client.prototype.sendJoin = function sendJoin (senderListenPort, initialHosts) {
  const messages = this.messages.joinMessages(senderListenPort, initialHosts)
  this.sendMessages(messages)
}

Client.prototype.sendUpdateJoin = function sendUpdateJoin (target, token, memberList) {
  const message = this.messages.updateJoinMessage(target, token, memberList)
  this.send(message)
}

module.exports = Client
