import Timer from 'timer'
import SCServo from 'scservo'
declare const button: {
  a: {
    onChanged: (this: { read: () => number }) => void
  }
}

const servo = new SCServo({
  id: 1
})

let torqueEnabled = true
let angle = 0
let tick = 30
Timer.repeat(() => {
  if (!torqueEnabled) {
    return
  }
  angle += tick
  trace(`writing angle: ${angle}\n`)
  if (angle >= 1000 || angle < 30) {
    tick = -tick
  }
  servo.setAngleInTime(angle, 500)
}, 1000)
Timer.repeat(async () => {
  const angle = await servo.readStatus()
  trace(`current angle: ${angle}\n`)
}, 33)

button.a.onChanged = function() {
  if (!this.read()) {
    torqueEnabled = !torqueEnabled
    servo.setTorque(torqueEnabled)
  }
}
