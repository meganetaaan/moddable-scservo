import Serial from 'embedded:io/serial'

// utilities
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}
function le(v: number): [number, number] {
  return [(v & 0xff00) >> 8, v & 0xff]
}

const BROADCAST_ID = 0xfe // 254
const MAX_ID = 0xfc // 252
const SCS_END = 0

const COMMAND = {
  WRITE: 0x03,
  READ: 0x02,
} as const
type Command = typeof COMMAND[keyof typeof COMMAND]

const ADDRESS = {
  TORQUE_ENABLE: 40,
  GOAL_ACC: 41,
  GOAL_POSITION: 42,
  GOAL_TIME: 44,
  PRESENT_POSITION: 56,
} as const
type Address = typeof ADDRESS[keyof typeof ADDRESS]

const RX_STATE = {
  SEEK: 0,
  HEAD: 1,
  BODY: 2,
} as const
type RxState = typeof RX_STATE[keyof typeof RX_STATE]

/**
 * calculates checksum of the SCS packets
 * @param arr packet array except checksum
 * @returns checksum number
 */
function checksum(arr: number[] | Uint8Array): number {
  let sum = 0
  for (const n of arr.slice(2)) {
    sum += n
  }
  const cs = ~(sum & 0xff)
  trace(`>>>checksum is ${new Uint8Array([cs])[0]}: ${arr}\n`)
  return cs
}

type SCServoConstructorParam = {
  id: number
  onCommandRead: (address: Address, values: number[]) => void
}
class SCServo {
  #serial
  #writeBuf
  #id
  #onReadCommand
  constructor(option) {
    this.#id = option.id
    this.#writeBuf = new Uint8Array(64)
    const readBuf = new Uint8Array(64)

    let idx = 0
    let count = 0
    let state: RxState = RX_STATE.SEEK
    this.#onReadCommand = option.onReadCommand
    this.#serial = new device.io.Serial({
      // Core2
      // receive: 13,
      // transmit: 14,
      receive: 16,
      transmit: 17,
      baud: 1_000_000,
      port: 2,
      format: 'number',
      onReadable: function (bytes) {
        while (bytes > 0) {
          // NOTE: We can safely read a number
          readBuf[idx++] = this.read() as number
          bytes -= 1
          switch (state) {
            case RX_STATE.SEEK:
              if (idx >= 2) {
                // see header
                if (readBuf[0] === 0xff && readBuf[1] === 0xff) {
                  // packet found
                  state = RX_STATE.HEAD
                } else {
                  // reset seek
                  trace('seeking failed. reset\n')
                  idx = 0
                }
              }
              break
            case RX_STATE.HEAD:
              if (idx >= 4) {
                count = readBuf[3]
                state = RX_STATE.BODY
              }
              break
            case RX_STATE.BODY:
              count -= 1
              if (count === 0) {
                const cs = checksum(readBuf.slice(0, idx - 1))
                trace(`got message(checksum is ${new Uint8Array([cs])[0]}): ${readBuf.slice(0, idx)}\n`)
                idx = 0
                state = RX_STATE.SEEK
              }
              break
            default:
              trace('error\n')
          }
        }
      },
    })
  }

  get id(): number {
    return this.#id
  }

  #sendCommand(command: Command, address: Address, ...values: number[]): void {
    this.#writeBuf[0] = 0xff
    this.#writeBuf[1] = 0xff
    this.#writeBuf[2] = this.#id
    this.#writeBuf[3] = values.length + 3
    this.#writeBuf[4] = command // write or read
    this.#writeBuf[5] = address
    let idx = 6
    for (const v of values) {
      this.#writeBuf[idx] = v
      idx++
    }
    this.#writeBuf[idx] = checksum(this.#writeBuf.slice(0, idx))
    idx++
    trace(`writing: ${this.#writeBuf.slice(0, idx)}\n`)
    for (let i = 0; i < idx; i++) {
      this.#serial.write(this.#writeBuf[i])
    }
  }

  setAngle(angle: number): void {
    // 0 <= a <= 1023
    const a = clamp(angle, 0, 0x03ff)

    this.#sendCommand(COMMAND.WRITE, ADDRESS.GOAL_POSITION, ...le(a))
  }

  setAngleInTime(angle: number, goalTime: number): void {
    // 0 <= a <= 1023
    const a = clamp(angle, 0, 0x03ff)

    this.#sendCommand(COMMAND.WRITE, ADDRESS.GOAL_POSITION, ...le(a), ...le(goalTime))
  }

  setTorque(enable: boolean): void {
    this.#sendCommand(COMMAND.WRITE, ADDRESS.TORQUE_ENABLE, Number(enable))
  }

  requestReadStatus(): void {
    this.#sendCommand(COMMAND.READ, ADDRESS.PRESENT_POSITION, 2)
  }
}

export default SCServo
