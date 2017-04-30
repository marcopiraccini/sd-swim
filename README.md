# SD-SWIM
Self- discovery minimal implementation of SWIM membership protocol that uses Protocol Buffers over UDP
for message exchange.

## Why "self discovery"?
When a node joins a group using SWIM, it must know his own IP, which is actively
used in protocol implementation.
This can be a problem when running nodes in container-based architectures, where
a containerized process cannot know the HOST IP automatically.

## Notes
Not yet implemented / supported:
- No control on message size
- Random failure detection (instead using round-robin + random reordering on completing the traversal)
- Updates are sent using a FIFO queue (instead of preferring element gossiped fewer times)

# Usage

```
const hosts = [{host: '10.10.10.10', port: 12345}, {host: '10.10.10.11', port: 12345}]
const sdswim = new SDSwim({port: 12345, hosts})
```

From command line:
```
node index 127.0.0.1:12340 127.0.0.1:12341
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
| suspectTimeout           |  1000           |   Timeout to mark a `SUSPECT` node as `FAULTY`               |


# SD-SWIM Protocol

SWIM is a membership protocol [https://www.cs.cornell.edu/~asdas/research/dsn02-swim.pdf], with the goal of having
each node of a distributed system an updated "member list".

This implementation add a small join protocol to the protocol defined in the paper above, that it's used to join the group
when a node has no a priori knowledge of his own address.

## Join Protocol
The `join` phase is used when a node start to connect to a group, getting the initial member list and updating the other member's membership lists with himself.

**Example**: A Sends a *Join* message to B with {B_IP} (cannot sent his own IP because it doesn't know it), e.g.:

```
    {
        “target”: {
          "host": 10.10.10.10, // B_IP
          "port:" 12345        // B_PORT
        }
    }
```

When B receives the Join message, it:
- saves it own IP (if not known)
- answer with a UpdateJoin message:

```
    {
        "target": {
          "host": 10.10.10.11, // A_IP
          "port": 5678         // A_PORT
        },
        "members": { (...)  }

    }
```
A receives the *UpdateJoin* and save his own IP and init the member list.
A will receive multiple updates (at maximum one for each *Join* sent).
The first valid response is used by A to set his own IP and the (full) initial member list.
(sending the full member list from another node is the quicker way to start gossiping with other nodes).
Subsequent *UpdateJoin* received are ignored, since the initial member list is
already set and the node knows is IP.


# Failure Detection

Use these params:
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

# Dissemination
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

`ALIVE`, with `incNumber` = i

| Condition                                           |      Member List                    |  Updates                   |
|-----------------------------------------------------|:-----------------------------------:|---------------------------:|
| Node not present                                    |   Member added as `ALIVE`           |     Propagated             |
| Node present and `ALIVE`, with incNumber < i        |   Member updated (setBy, incNumber) |     Propagated             |
| Node present and `ALIVE`, with incNumber >= i       |                                     ||
| Node present and `SUSPECTED`, with incNumber <= i   |   Member updated as `ALIVE`         |     Propagated             |
| Node present and `SUSPECTED`, with incNumber >  i   |                                     ||

`SUSPECT`, with `incNumber` = i

| Condition                                             |      Member List                    |  Updates                   |
|-------------------------------------------------------|:-----------------------------------:|---------------------------:|
| Node is me                                            |   incNumber is incremented          |     new `ALIVE` update created   |
| Node not present                                      |   Member added as `SUSPECT`         |     Propagated                   |
| Member present with incNumber < i                     |   Member changed to `SUSPECT`       |     Propagated                   |
| Member present with incNumber >= i                    |                                     ||
| Member present and `SUSPECTED`, with incNumber <=  i  |   Member updated (setBy, incNumber) |     Propagated                   |
| Member present and `SUSPECTED`, with incNumber >  i   |                                     ||


`FAULTY`, with `incNumber` = i

| Condition                                           |      Member List                    |  Updates                   |
|-----------------------------------------------------|:-----------------------------------:|---------------------------:|
| Node not present                                    |                                     ||
| Node is me                                          |   incNumber is incremented          |     new `ALIVE` update created        |
| Node present and `ALIVE`, with incNumber < i        |   remove from the alive nodes       |     Propagated                        |
| Node present and `ALIVE`, with incNumber >= i       |                                     ||

`pingReqTimeout` reached with no acks by Failure Detector:

| Condition                                           |      Member List Updates            |  Updates Propagations      |
|-----------------------------------------------------|:-----------------------------------:|---------------------------:|
| `pingReqTimeout` reached with no acks               |   change status to `SUSPECT`        |     new `SUSPECT` created  |

`suspectTimeout` reached by Dissemination module

| Condition                                           |      Member List Updates            |  Updates Propagations      |
|-----------------------------------------------------|:-----------------------------------:|---------------------------:|
| `suspectTimeout` reached for a node                 |   remove from alive nodes           |     new `FAULTY` created   |


# Messages
This implementation uses protobuf https://github.com/mafintosh/protocol-buffers

The messages generated are:
- Join
- UpdateJoin
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


## UpdateJoin

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
