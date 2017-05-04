'use strict'

// Network communication.
// If present, sens the updates when sending ping, ping-req and ack,
// and process updates if present when receiving messages

const {EventEmitter} = require('events')
const dgram = require('dgram')
const Messages = require('./messages')

class Net extends EventEmitter {
  constructor(opts) {
    super()
    this.opts = opts
    this.port = opts.port
    this.logger = opts.logger
    this.update = this.opts.update
    this.messages = new Messages(opts)
    this.socket = dgram.createSocket('udp4')
  }

  start(cb) {
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
      this.update.processUpdates(msg.updates)
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

  stop(cb) {
    this.socket.close(cb)
    this.socket = null // cannot reuse
  }

  _send (msg) {
    if (!this.socket) { // if closed
      return
    }
    const {host, port, type, data} = msg
    this.logger.trace(`Sending message ${data} to ${host}:${port}`)
    this.socket.send(data, 0, data.length, port, host, err => {
      if (err) throw err
      this.logger.debug(`Message of type ${type} sent to ${host}:${port}`)
    })
  }

  _sendMessages (messages) {
    for (const msg of messages) {
      this._send(msg)
    }
  }

  sendJoin (initialHosts) {
    this._sendMessages(this.messages.joinMessages(initialHosts))
  }

  sendUpdateJoin (destination, members) {
    this._send(this.messages.updateJoinMessage(destination, members))
  }

  sendPing (destination, target, requester) {
    this._send(this.messages.pingMessage(destination, target, requester, this.update.getUpdates()))
  }

  sendPingReq (destination, target, requester) {
    this._send(this.messages.pingReqMessage(destination, target, requester, this.update.getUpdates()))
  }

  sendAck (destination, target, requester) {
    this._send(this.messages.ackMessage(destination, target, requester, this.update.getUpdates()))
  }

}

module.exports = Net
