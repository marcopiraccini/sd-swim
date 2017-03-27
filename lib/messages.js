'use strict'

const uuidV4 = require('uuid/v4')
const {readFileSync} = require('fs')
var {join} = require('path')
const protobuf = require('protocol-buffers')
const messages = protobuf(readFileSync(join(__dirname, 'proto', 'sd-swim.proto')))

function Messages (opts) {
  if (!(this instanceof Messages)) {
    return new Messages(opts)
  }
  this.opts = opts
}

Messages.prototype.createJoinMessages = function createJoinMessages (hosts) {
  return hosts.map(({host, port}) => {
    return messages.Msg.encode({
      target: {host, port},
      token: uuidV4(),
      type: messages.MessageType.JOIN
    })
  })
}

module.exports = Messages
