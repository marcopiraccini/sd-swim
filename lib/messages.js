'use strict'

// Encodes and Decodes the protocol buffer messages
const { readFileSync } = require('fs')
const protobuf = require('protocol-buffers')
const { Msg: { decode, encode }, MessageType } = protobuf(
  readFileSync('./lib/proto/sd-swim.proto')
)

class Messages {
  constructor (opts) {
    this.opts = opts
    this.types = MessageType
  }

  joinMessages (destinations) {
    return destinations.map(({ host, port }) => {
      const type = MessageType.JOIN
      const data = encode({
        destination: { host, port },
        type
      })
      return { host, port, type, data }
    })
  }

  joinAckMessage (destination, initialMemberList) {
    const { host, port } = destination
    const data = encode({
      destination,
      members: initialMemberList,
      type: MessageType.JOIN_ACK
    })
    return { host, port, type: MessageType.JOIN_ACK, data }
  }

  pingMessage (destination, updates) {
    const { host, port } = destination
    const data = encode({ destination, type: MessageType.PING, updates })
    return { host, port, type: MessageType.PING, data }
  }

  pingReqMessage (destination, target, requester, updates) {
    const { host, port } = destination
    const request = { target, requester }
    const data = encode({
      destination,
      type: MessageType.PING_REQ,
      request,
      updates
    })
    return { host, port, type: MessageType.PING_REQ, data }
  }

  ackMessage (destination, target, requester, updates) {
    const { host, port } = destination
    let request
    if (target) {
      // ping ack do not have target/requester
      request = { target, requester }
    }
    const data = encode({
      destination,
      type: MessageType.ACK,
      request,
      updates
    })
    return { host, port, type: MessageType.ACK, data }
  }

  metaMessages (destinations, metadata) {
    return destinations.map(({ host, port }) => {
      const type = MessageType.META
      const data = encode({
        type,
        metadata
      })
      return { host, port, type, data }
    })
  }

  askAllMetaMessage (destination) {
    const { host, port } = destination
    const data = encode({ destination, type: MessageType.ALL_META })
    return { host, port, type: MessageType.ALL_META, data }
  }

  decodeMessage (message) {
    return decode(message)
  }
}

module.exports = Messages
