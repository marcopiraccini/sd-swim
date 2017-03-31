'use strict'

const uuidV4 = require('uuid/v4')
const {readFileSync} = require('fs')
const protobuf = require('protocol-buffers')
const {Msg: {decode, encode}, MessageType} = protobuf(readFileSync('./lib/proto/sd-swim.proto'))

function Messages (opts) {
  if (!(this instanceof Messages)) {
    return new Messages(opts)
  }
  this.opts = opts
}

Messages.prototype.createJoinMessages = function createJoinMessages (hosts) {
  return hosts.map(({host, port}) => {
    return encode({
      target: {host, port},
      token: uuidV4(),
      type: MessageType.JOIN
    })
  })
}

Messages.prototype.decodeMessage = function createJoinMessages (message) {
  return decode(message)
}

module.exports = Messages
