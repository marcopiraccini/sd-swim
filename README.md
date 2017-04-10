# SD-SWIM
Self- discovery minimal implementation of SWIM membership protocol that uses Protocol Buffers over UDP
for message exchange.

## Why "self discovery"?
When a node joins a group using SWIM, it must know his own IP, which is actively
used in protocol implementation.
This can be a problem when running nodes in container-based architectures, where
a containerized process cannot know the HOST IP automatically.

# Usage

[TODO]

# Algorithm Parameters

| Field                    |      Default    |  Notes                     |
|--------------------------|:---------------:|---------------------------:|
| port                     |  2000           |                            |
| joinTimeout              |  110000         |                            |
| interval                 |  [TODO]         |         [TODO]             |
| disseminationFactor      |  [TODO]         |         [TODO]             |
| pingTimeout              |  [TODO]         |         [TODO]             |
| pingReqTimeout           |  [TODO]         |         [TODO]             |
| pingReqGroupSize         |  [TODO]         |         [TODO]             |


# SD-SWIM Protocol

SWIM is a membership protocol [TODO: Addreference],with the goal of having
each node of a distributed system an updated "member list".

This implementation add a small join protocol used to join the group when there's
no knowledge of the own address.

## Join Protocol
The `join` phase is used to connet to a group, getting this list and updating the other member's membership lists.
A Sends a Join message to B with {B_IP} (cannot sent his own IP because it doesn't know it), e.g.:

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
        "token":  "xxxyyyzz"
        "members": { (...)  }

    }
```
A receives the UpdateJoin and save his own IP and init the member list.
A will receive multiple updates (at maximum one for each Join sent).
The first valid response is used by A to set his own IP.
From the others, the member list is checked to update the member list as usual in SWIM implementation (see bleow)


[TODO: Complete decription of the changes to basic SWIM]

# Failure Detector

Using two params:
- `T`: Protocol Period
- `k`: Failure detector subgroups

Given a node `Mi`, every `T`:
- it selects a random member from the list `Mj` and sends him a `ping`
- `Mi` waits for the answer.
  - Answer not received after a timeout:
    - `Mi` selects a `k`members randomly and sends a `ping-req(Mj)` message
    - Every node of those, send in turn `ping(Mj)` and returns the answer to `Mi`
- After `T`, Mi check if an `ack` from `mj` has been received, directly or through one of the `k` members. If not, marks `Mj` as failed and starts the update using the dissemintaion component.

[TODO: Complete description of basic SWIM]


# Messages
This implementation uses protobuf https://github.com/mafintosh/protocol-buffers

The messages are:
- Join
- UpdateJoin
- Ping
- Ack
- PingReq

## Join

This message is the first message used to join the group, and is sent to a set of members (targets) defined when the node is activated. In this example, the node **NODE_A** sends the message to **NODE_B**

| Field         |      Value    |  Notes                     |
|---------------|:-------------:|---------------------------:|
| target.host   |  IP_B         |                            |
| target.port   |  11000        |                            |
| type          | 0             |                            |


On UUIDv4, see: https://en.wikipedia.org/wiki/Universally_unique_identifier#Version_4_.28random.29

## UpdateJoin

This message is the response to Join. When **Node_A** receive this message it:
- Saves it's own IP
- Init the Memeber list with the one received from **Node_B**


| Field         |      Value    |  Notes                     |
|---------------|:-------------:|---------------------------:|
| target.host   |  IP_A         |                            |
| target.port   |  11000        |                            |
| type          | 1             |                            |
| memberList    |   node[]      |                            |
| node.host     |       IP_X    |                            |
| node.port     |       110000  |                            |


This message is the first message used to join the group, and is sent to a set of members (targets) defined when the node is activated.

## Ping
This message is used in Failure Detection. Every `T` time, is sent to a random member od his member list
(see the full description of the algorithm).

| Field         |      Value    |  Notes                     |
|---------------|:-------------:|---------------------------:|
| type          | 2             |                            |
| memberList    |   member[]    |                            |

## Ack
This message is used in Failure detection, and it's an aswer to a **Ping** or a **PingReq*

| Field         |      Value    |  Notes                     |
|---------------|:-------------:|---------------------------:|
| type          | 3             |                            |
| memberList    |   member[]    |                            |

## PingReq
This message is used to request an indirect IP a after a first ping failed.

| Field         |      Value    |  Notes                     |
|---------------|:-------------:|---------------------------:|
| target.host   |  IP_A         | node to be checked indirectly |
| target.port   |  110000       | node to be checked indirectly |
| type          | 4             |                            |
| memberList    |   member[]    |                            |
