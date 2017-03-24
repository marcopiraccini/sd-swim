# sd-swim
Self- discovery version of SWIM membership protocol that uses Protocol Buffers over UDP
for message exchange

# Membership

Every Member `Mi` has a *membership list*.
The `join` phase is used to connet to a group, getting this list and updating the other member's membership lists.

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
- After `T`, Mi check if an `æck` from `mj` has been received, directly or through one of the `k` members. If not, marks `Mj` as failed and starts the update using the dissemintaion component.

# Protocol
This implementation uses protobuf https://github.com/mafintosh/protocol-buffers
The messages are:
- Join
- UpdateJoin
- Ping
- PingReq
- Sync
- Ack
- Update
