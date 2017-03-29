const pino = require('pino')
const minimist = require('minimist')
const SDSwim = require('./lib/sd-swim')

/* eslint no-console:0 */

function start () {
  const logger = pino()
  const info = logger.info.bind(logger)
  const error = logger.error.bind(logger)

  const argv = minimist(process.argv.slice(2), {
    integer: ['port'],
    alias: {
      port: 'p',
      help: 'H'
    },
    default: {
      // We could also assume that the default is 0. If so, UDP try to bind to
      // a random port
      port: process.env.SWIM_PORT || 11000
    }
  })

  if (argv.help) {
    console.error('Usage:', process.argv[1], '[--port PORT] host1[:port1] host2[:port2]...')
    process.exit(1)
  }

  const nodes = argv._ //  contains all the arguments that didn't have an option associated with them
  const hosts = nodes.map(el => {
    const [host, portStr] = el.split(':')
    const port = Number(portStr)
    if (!port || port <= 1 || port > 65535) {
      console.error(`Port ${portStr} not correct, must be a number`)
      console.error(`Usage: ${process.argv[1]} [--port PORT] host1[:port1] host2[:port2]...`)
      process.exit(1)
    }
    return {host, port}
  })
  const opts = Object.assign({hosts, logger}, argv)
  const sdswim = new SDSwim(opts)

  // const charm = require('charm')(process.stdout)
  // charm.reset()
  // charm.on('^C', process.exit)
  // updateInfo(charm)

  sdswim.on('join-sent', () => {
    info('join reques sent to nodes')
  })

  // nothing on generic error
  sdswim.on('up', port => {
    info({event: 'I am up', port})
  })

  sdswim.on('joined', () => {
    info({id: sdswim.whoami()}, 'Joined')
  })

  sdswim.on('error', err => {
    error(err)
  })

  sdswim.start()
}

if (require.main === module) {
  start()
}

// function updateInfo(charm, info = {event: 'Starting', host: 'unknown', port:'unknown', memberList: []}) {
//   if (info.event) {
//     charm.position(0, 1).erase('line').write(`LAST EVENT: ${info.event}`)
//   }
//
//   if (info.host) {
//     charm.position(0, 2).erase('line').write(`HOST: ${info.host || 'unknown'}` )
//   }
//
//   if (info.port) {
//     charm.position(0, 3).erase('line').write(`PORT: ${info.port || 'unknown'}` )
//   }
//
//   if (info.memberList) {
//     charm.position(0, 4).erase('line').write(`MEMBER LIST: ${info.memberList}`)
//   }
// }
