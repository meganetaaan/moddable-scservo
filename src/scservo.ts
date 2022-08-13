import Serial from 'embedded:io/serial'

// utilities
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}
function le(v: number): [number, number] {
  return [v & 0xff, (v & 0xff00) >> 8]
}

const BROADCAST_ID = 0xfe // 254
const MAX_ID = 0xfc // 252
const SCS_END = 0

const Result = {
  SUCCESS: 0,
  PORT_BUSY: -1, // Port is in use
  TX_FAIL: -2, // Failed transmit instruction packet
  RX_FAIL: -3, // Failed get status packet
  TX_ERROR: -4, // Incorrect instruction packet
  RX_WAITING: -5, // Now receiving staus packet
  RX_TIMEOUT: -6,
  RX_CORRUPT: -7,
  NOT_AVAILABLE: -9,
} as const
type Result = typeof Result[keyof typeof Result]

const COMMANDS = {
  TORQUE_ENABLE: 40,
  GOAL_ACC: 41,
  GOAL_POSITION: 42,
  GOAL_TIME: 44,
  PRESENT_POSITION: 56,
} as const
type Command = typeof COMMANDS[keyof typeof COMMANDS]

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
  return ~(sum & 0xff)
}

type SCServoConstructorParam = {
  id: number,
  onReadCommand: (command: Command, values: number[]) => void
}
class SCServo {
  #serial: Serial
  #writeBuf: Uint8Array
  #readBuf: Uint8Array
  #id: number
  constructor(option: SCServoConstructorParam) {
    this.#id = option.id
    this.#writeBuf = new Uint8Array(64)
    this.#readBuf = new Uint8Array(64)
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const serial = this
    this.#serial = new device.io.Serial({
      ...device.Serial.default,
      baud: 1_000_000,
      format: 'buffer',
      onReadable: function (bytes: number) {
        this.read(serial.#readBuf)
        if (serial.#readBuf[0] === 0xff && serial.#readBuf[1] === 0xff) {
          trace('got echo')
          return
        }
        if (serial.#readBuf[2] !== serial.#id) {
          trace('ignore for another id')
          return
        }
        serial.#onReadCommand(bytes)
      },
    })
  }

  get id(): number {
    return this.#id
  }

  #onReadCommand(bytes: number) {
    /* noop */
  }

  #writeCommand(command: Command, ...values: number[]): void {
    this.#writeBuf[0] = 0xff
    this.#writeBuf[1] = 0xff
    this.#writeBuf[2] = this.#id
    this.#writeBuf[3] = values.length + 3
    this.#writeBuf[4] = 0x03 // write command
    this.#writeBuf[5] = command
    let idx = 6
    for (const v of values) {
      this.#writeBuf[idx] = v
      idx++
    }
    this.#writeBuf[idx] = checksum(this.#writeBuf.slice(0, idx - 1))
    idx++
    this.#serial.write(this.#writeBuf.slice(0, idx))
  }

  setAngle(angle: number): void {
    // 0 < value < 1000
    const a = clamp(angle, 0, 1000)
    this.#writeCommand(COMMANDS.GOAL_POSITION, ...le(a))
  }

  setAngleInTime(angle: number, goalTime: number): void {
    const a = clamp(angle, 0, 1000)
    this.#writeCommand(COMMANDS.GOAL_POSITION, ...le(a), 0, 0, ...le(goalTime))
  }

  setTorque(enable: boolean): void {
    this.#writeCommand(COMMANDS.TORQUE_ENABLE, Number(enable))
  }

  requestReadStatus(): void {
    this.#writeCommand(COMMANDS.PRESENT_POSITION)
  }
}

export default SCServo
