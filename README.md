# sd-swim
Self- discovery version of SWIM membership protocol that uses Protocol Buffers over UDP
for message exchange

# usage

[TODO]


# Protocol
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
| target.port   |  110000       |                            |
| type          | 0             |                            |
| token         | 8601b162-c329-4f78-bc69-bc41b2ebcfc1 |  uuidv4                    |


On UUIDv4, see: https://en.wikipedia.org/wiki/Universally_unique_identifier#Version_4_.28random.29

## UpdateJoin

This message is the response to Join. The token must be the same of the received Join message. When **Node_A** receive this message it:
- Check the token
- Saves it's own IP
- Init the Memeber list with the one received from **Node_B**


| Field         |      Value    |  Notes                     |
|---------------|:-------------:|---------------------------:|
| target.host   |  IP_A         |                            |
| target.port   |  110000       |                            |
| type          | 1             |                            |
| token         | 8601b162-c329-4f78-bc69-bc41b2ebcfc1 |  uuidv4                    |
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


# Membership

Every Member `Mi` has a *membership list*.
The `join` phase is used to connet to a group, getting this list and updating the other member's membership lists.

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
