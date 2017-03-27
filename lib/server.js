'use strict'

var dgram = require('dgram')

function Server (opts) {
  if (!(this instanceof Server)) {
    return new Server(opts)
  }
  this.opts = opts
  this.client = dgram.createSocket('udp4')
  this.debug = this.opts.logger.debug
  this.info = this.opts.logger.debug
}

Server.prototype.listen = function listen(callback) {
    this.udpSocket.on('error', err => {
      this.info(err)
    })
    this.udpSocket.on('listening', () => {
      const address = Server.address()
      this.info(`server listening ${address.address}:${address.port}`)
    })
    this.udpSocket.on('message', (msg, rinfo) => {
      this.info(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`)
    })
    this.udpSocket.bind(this.udp.port, callback)
}

module.exports = Server
