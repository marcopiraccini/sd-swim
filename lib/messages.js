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

Messages.prototype.joinMessages = function joinMessages (hosts) {
  return hosts.map(({host, port}) => {
    return encode({
      target: {host, port},
      token: uuidV4(),
      type: MessageType.JOIN
    })
  })
}

Messages.prototype.updateJoinMessages = function updateJoinMessages (target, token, memberList) {
  return encode({target, token, memberList, type: MessageType.UPDATE_JOIN})
}

Messages.prototype.decodeMessage = function decodeMessage (message) {
  return decode(message)
}

module.exports = Messages
