'use strict'

const {EventEmitter} = require('events')
const dgram = require('dgram')
const util = require('util')
const Messages = require('./messages')

function Net (opts) {
  if (!(this instanceof Net)) {
    return new Net(opts)
  }
  this.opts = opts
  this.port = opts.port
  this.logger = opts.logger
  this.messages = new Messages(opts)

  this.socket = dgram.createSocket('udp4')
}

util.inherits(Net, EventEmitter)

Net.prototype.start = function start (cb) {
  const self = this

  if (!this.socket) { // after a close()
    this.socket =  dgram.createSocket('udp4')
  }

  this.socket.on('message', (message, remote) => {
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

  this.socket.on('error', err => {
    if (cb) {
      return cb(err)
    }
    return this.emit('error', err)
  })
  this.socket.on('listening', () => {
    const {port} = this.socket.address()
    return this.emit('up', port)
  })

  if (cb) {
    return this.socket.bind(this.port, null, function listen () { // this CB takes no params (from `dgram doc`)
      const {port} = self.socket.address()
      return cb(null, port)
    })
  }
  return this.socket.bind(this.port)
}

Net.prototype.stop = function stop (cb) {
  this.socket.close(cb)
  this.socket = null // cannot reuse
}

/***************** SEND MESSAGES FUNCTIONS *******************/

Net.prototype.send = function send (msg) {
  const {host, port, type, data} = msg
  this.logger.debug(`Sending message ${data} to ${host}:${port}`)
  this.socket.send(data, 0, data.length, port, host, err => {
    if (err) throw err
    this.logger.debug(`Message of type ${type} sent to ${host}:${port}`)
  })
}

Net.prototype.sendMessages = function sendMessages (messages) {
  for (const msg of messages) {
    this.send(msg)
  }
}

Net.prototype.sendJoin = function sendJoin (senderListenPort, initialHosts) {
  const messages = this.messages.joinMessages(senderListenPort, initialHosts)
  this.sendMessages(messages)
}

Net.prototype.sendUpdateJoin = function sendUpdateJoin (target, token, memberList) {
  const message = this.messages.updateJoinMessage(target, token, memberList)
  this.send(message)
}

module.exports = Net
