'use strict'

const inherits = require('util').inherits
const EE = require('events').EventEmitter
const dgram = require('dgram')
// const uuidV4 = require('uuid/v4')
// const net = require('net')
const {readFileSync} = require('fs')
var {join} = require('path');
const protobuf = require('protocol-buffers')
const messages = protobuf(readFileSync(join(__dirname, 'proto', 'sd-swim.proto')))

// reschedulable setTimeout for you node needs. This library is built for building a keep alive functionality across a large numbers of clients/sockets.
// const retimer = require('retimer')


function Client (opts) {
  if (!(this instanceof Client)) {
    return new Client(opts)
  }
  // TODO: add config
  this.opts = opts
  this._init()
}

Client.prototype._init = function init () {
  this.opts.logger.debug('init', messages)
}

inherits(Client, EE)

Client.prototype.send = msg => {
  this.opts.logger.debug(msg)
}

Client.prototype.sendMessages = function sendMessages(messages, host, port) {
  var buf = messages.Msg.encode({
    type: messages.MessageType.JOIN,
    target: {
      host: '1.1.1.1',
      port: 12345
    },
    payload: "TEST"
  })

  var client = dgram.createSocket('udp4');
  client.send(buf, 0, buf.length, host, port, err => {
      if (err) throw err
      this.opts.logger.debug(`UDP message sent to ${host}:${port}`)
      client.close()
  })
}

module.exports = Client
