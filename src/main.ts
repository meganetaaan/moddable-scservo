import Timer from 'timer'
import SCServo from 'scservo'
declare const button: {
  a: {
    onChanged: (this: { read: () => number }) => void
  }
}

const servo = new SCServo({
  id: 1,
  onReadCommand: (command, values) => {
    const arr = new Uint8Array(values)
    trace(`got data: ${arr}\n`)
  },
})

let torqueEnabled = true
let angle = 0
let tick = 30
Timer.repeat(() => {
  if (!torqueEnabled) {
    return
  }
  angle += tick
  trace(`angle: ${angle}\n`)
  if (angle >= 1000 || angle < 30) {
    tick = -tick
  }
  servo.setAngleInTime(angle, 500)
}, 1000)
Timer.repeat(() => {
  servo.requestReadStatus()
}, 33)

button.a.onChanged = function() {
  if (!this.read()) {
    torqueEnabled = !torqueEnabled
    servo.setTorque(torqueEnabled)
  }
}
