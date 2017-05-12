# SD-SWIM&nbsp;[![Build Status](https://travis-ci.org/marcopiraccini/sd-swim.svg?branch=master)](https://travis-ci.org/marcopiraccini/sd-swim)&nbsp;[![Coverage Status](https://coveralls.io/repos/github/marcopiraccini/sd-swim/badge.svg?branch=master)](https://coveralls.io/github/marcopiraccini/sd-swim?branch=master)&nbsp;[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)&nbsp;[![npm version](https://badge.fury.io/js/sd-swim.svg)](https://badge.fury.io/js/sd-swim)

Self- discovery minimal implementation of SWIM membership protocol that uses Protocol Buffers
[https://developers.google.com/protocol-buffers/] over UDP for message exchange.

## Why "self discovery"?
When a node join a group using SWIM, it must know his own IP, which is actively
used in protocol implementation.
This can be an issue when running nodes in container-based architectures, where
a containerized process cannot know the HOST IP automatically.

# Usage

```
const hosts = [{host: '10.10.10.10', port: 12345}, {host: '10.10.10.11', port: 12345}]
const sdswim = new SDSwim({port: 12345, hosts})
```

Then start using callback:
```
sdswim.start(port => {
  console.log(`Node started on port ${port}`)
})
```
...or promises:
```
sdswim.start().then(port => port => console.log(`Node started on port ${port}`))
```
When started, use `memberList` to obtain an array of current members (active and suspect):
```
sdswmin.memberList
```

To stop
```
sdswim.stop(err => {
  console.log('Node stopped')
})
```

or
```
sdswim.stop().then(() => console.log('Node stopped))

```

# Command Line

It's possible to launch SWIM from command line, specifying the port (-p), if verbose (-v), e.g.:
```
node index -p 10000
```
If it's not the first node, we have to specify the `host:port` list to be joined:
```
node index -p 10000 127.0.0.1:12340 127.0.0.1:12341
```
If the join fails, the process exit.
If the `list` option is set, prints out to console the member list every `-l` millis
(can be useful for debugging), e.g.:
```
node index -p 10000 -l 1000
```


# Algorithm Parameters

| Field                    |      Default    |  Notes                     |
|--------------------------|:---------------:|------------------------------------------------------------------------------------:|
| port                     |  11000          |   Mandatory, but can be 0 (in this case it's the first random free port)            |
| joinTimeout              |  2000           |   After this timeout, if the join protocol is not completed, an error is generated  |
| interval                 |  100            |   Interval for failure detection. Every `interval` the failure detector is run, so it must be > of `pingTimeout` +  `pingReqTimeout`     |
| pingTimeout              |  20             |   Ping Timeout. After this timeout, a pig-req is sent                               |
| pingReqTimeout           |  60             |   Ping Request Timeout                        |
| pingReqGroupSize         |  3              |   Ping Request Group Size                     |
| updatesMaxSize           |  50             |   Maximum number of updates sent in piggybacking             |
| dissemination factor     |  15             |   An update is gossiped until a maximum of (df*ln(size))     |
| suspectTimeout           |  1000           |   Timeout to mark a `SUSPECT` node as `FAULTY`               |


# SD-SWIM Protocol

SWIM is a membership protocol [https://www.cs.cornell.edu/~asdas/research/dsn02-swim.pdf], with the goal of having
each node of a distributed system an updated "member list".

This implementation add a small join protocol to the protocol defined in the paper above, that it's used to join the group
when a node has no a priori knowledge of his own address.

## Join Protocol
The `join` protocol is used when a node try to connect to a group, getting the initial member list
and updating the other member's membership lists with himself.

**Example**: A Sends a *Join* message to B with {B_IP} (cannot sent his own IP because we assume it doesn't know it), e.g.:

```
    {
        “target”: {
          "host": 10.10.10.10, // B_IP
          "port:" 12345        // B_PORT
        }
    }
```

When B receives the *Join* message, it:
- saves it own IP (it's possible is still unknown)
- answer with a *JoinAck* message:

```
    {
        "target": {
          "host": 10.10.10.11, // A_IP
          "port": 5678         // A_PORT
        },
        "members": { (...) }   // The full members list, ask known by B
    }
```
A receives the *JoinAck* and saves his own IP and init the member list.
A will receive multiple updates (at maximum one for each *Join* sent).
The first valid response is used by A to set his own IP and the (full) initial member list, indeed
sending the full member list from another node is the quicker way to start gossiping with other nodes.
Subsequent *JoinAck* received are silently ignored, since the initial member list is
already set and the node knows is IP.

## Failure Detection

These are the protocol parameters:
- `interval`: Protocol Period
- `pingReqGroupSize`: Failure detector subgroups
- `pingTimeout`
- `pingReqTimeout`

Given a node A, every `interval`:
- It selects a random member from the list B and sends a `ping`
- A waits for the answer.
  - Answer not received after a `pingTimeout`:
    - A selects a `pingReqGroupSize` members randomly and sends a `ping-req(B)` message
    - Every node of those, send in turn `ping(B)` and returns the answer to A
- After `interval`, A check if an `ack` from B has been received, directly or through one of the `pingReqGroupSize` members. If not, marks B as SUSPECT and start disseminating the update(see below).

## Dissemination
The dissemination of updates is done through piggybacking of `ping`, `ping-req` and `ack` messages.
Every node maintains a list of updates to be propagated, and when it sends one of the above messages, add these changes to the payload.
When a message is received, these updates are processed and if necessary, changes
are applied to the member list.

Every update entry has the form:
```
{
  target: {host: `10.10.10.10`, port: 12345},
  setBy: {host: `11.11.11.11`, port: 12345},
  state: 0,
  incNumber: 2
}
```

The `state` properties is the assertion on the node state, that can be:
- `ALIVE`: 0
- `SUSPECT`: 1
- `FAULTY: 2`

`incNumber` (incarnation number) is set initially to 0, and can be incremented
only when a node receives an update message on himself. It's used to drop (and not further propagate)
"outdated" updates

### Update rules
These rules are applied when an update is processed:

#### `ALIVE`, with `incNumber` = i

| Condition                                           |      Member List                    |  Updates                   |
|-----------------------------------------------------|:-----------------------------------:|---------------------------:|
| Node not present                                    |   Member added as `ALIVE`           |     Propagated             |
| Node present and `ALIVE`, with incNumber <= i       |   Member updated (setBy, incNumber) |     Propagated             |
| Node present and `ALIVE`, with incNumber >  i       |                                     |     Propagated             |
| Node present and `SUSPECTED`, with incNumber <= i   |   Member updated as `ALIVE`         |     Propagated             |
| Node present and `SUSPECTED`, with incNumber >  i   |                                     |     Drop                   |

#### `SUSPECT`, with `incNumber` = i

| Condition                                             |      Member List                    |  Updates                   |
|-------------------------------------------------------|:-----------------------------------:|---------------------------:|
| Node is me                                            |   incNumber is incremented          |     new `ALIVE` update created   |
| Node not present                                      |   Member added as `SUSPECT`         |     Propagated                   |
| Member present and `ALIVE`, with incNumber <= i       |   Member changed to `SUSPECT`       |     Propagated                   |
| Member present and `ALIVE`, with incNumber  > i       |                                     |     Drop                         |
| Member present and `SUSPECTED`, with incNumber <=  i  |   Member updated (setBy, incNumber) |     Propagated                   |
| Member present and `SUSPECTED`, with incNumber >  i   |                                     |     Drop                         |


#### `FAULTY`, with `incNumber` = i

| Condition                                           |      Member List                    |  Updates                   |
|-----------------------------------------------------|:-----------------------------------:|---------------------------:|
| Node not present                                    |                                     |     Propagated                        |
| Node is me                                          |   incNumber is incremented          |     new `ALIVE` update created        |
| Node present                                        |   remove from the alive nodes       |     Propagated                    |

####  `pingReqTimeout` reached with no acks by Failure Detector:

| Condition                                           |      Member List Updates            |  Updates Propagations      |
|-----------------------------------------------------|:-----------------------------------:|---------------------------:|
| `pingReqTimeout` reached with no acks               |   change status to `SUSPECT`        |     new `SUSPECT` created  |

#### `suspectTimeout` reached by Dissemination module

| Condition                                           |      Member List Updates            |  Updates Propagations      |
|-----------------------------------------------------|:-----------------------------------:|---------------------------:|
| `suspectTimeout` reached for a node                 |   remove from alive nodes           |     new `FAULTY` created   |


# Messages
This implementation uses protobuf https://github.com/mafintosh/protocol-buffers

The messages generated are:
- Join
- JoinAck
- Ping
- Ack
- PingReq

## Join

This message is the first message used to join the group, and is sent to a set of members (targets) defined when the node is activated. In this example, the node **NODE_A** sends the message to **NODE_B**

| Field         |      Value    |  Notes                     |
|---------------|:-------------:|---------------------------:|
| destination.host   |  IP_B         |                            |
| destination.port   |  11000        |                            |
| type          | 0             |                            |


## JoinAck

This message is the response to Join. When **Node_A** receive this message it:
- Saves it's own IP
- Init the Memeber list with the one received from **Node_B**


| Field              |      Value    |  Notes                     |
|--------------------|:-------------:|---------------------------:|
| destination.host   |  IP_A         |                            |
| destination.port   |  11000        |                            |
| type               | 1             |                            |
| members            |   node[]      |                            |


This message is the first message used to join the group, and is sent to a set of members (targets) defined when the node is activated.

## Ping
This message is used in Failure Detection. Every `T` time, is sent to a random member od his member list
(see the full description of the algorithm).

| Field         |      Value    |  Notes                     |
|---------------|:-------------:|---------------------------:|
| type          | 2             |                            |
| updates       |   member[]    |  updates in piggybacking   |

## Ack
This message is used in Failure detection, and it's an aswer to a **Ping** or a **PingReq**.
If the `request` is missing is a **Ping**. Otherwise it's a **PingReq**.

| Field         |      Value    |  Notes                     |
|---------------|:-------------:|---------------------------:|
| type          | 3             |                            |
| updates       |   member[]    |  updates in piggybacking   |
| request.target     |   node        |  node to be checked indirectly   |
| request.requester  |   node        |  the indirect check requester    |

## PingReq
This message is used to request an indirect IP a after a first ping failed.

| Field              |      Value    |  Notes                     |
|--------------------|:-------------:|---------------------------:|
| destination.host   |  IP_A         |                            |
| destination.port   |  110000       |                            |
| type               | 4             |                            |
| updates            |   member[]    |  updates in piggybacking   |
| request.target     |   node        |  node to be checked indirectly   |
| request.requester  |   node        |  the indirect check requester    |

## Notes / TODOs
Not yet implemented / possible improvements:
- No control on message size
