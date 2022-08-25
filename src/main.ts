import Timer from 'timer'
import SCServo from 'scservo'
declare const button: {
  [key: string]: {
    onChanged: (this: { read: () => number }) => void
  }
}

const servo = new SCServo({
  id: 1,
})

const servo2 = new SCServo({
  id: 2,
})

let torqueEnabled = true
let angle = 0
let tick = 10
Timer.repeat(async () => {
  if (!torqueEnabled) {
    return
  }
  angle += tick
  trace(`${servo.id}...writing angle: ${angle}\n`)
  if (angle >= 200 || angle <= 0) {
    tick = -tick
  }
  await servo.setAngleInTime(90, 500)
  await servo2.setAngleInTime(90, 500)
}, 1000)

Timer.repeat(async () => {
  const { angle } = await servo.readStatus()
  trace(`${servo.id}...current angle: ${angle}\n`)
}, 33)

button.a.onChanged = function () {
  if (!this.read()) {
    torqueEnabled = !torqueEnabled
    servo.setTorque(torqueEnabled)
  }
}

button.b.onChanged = function () {
  if (!this.read() && servo.id !== 2) {
    servo.flashId(2)
  }
}
