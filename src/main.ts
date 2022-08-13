import Timer from 'timer'
import SCServo from 'scservo'

const servo = new SCServo({
  id: 1,
  onReadCommand: (data) => {
    trace(`got data: ${data}\n`)
  },
})

servo.setTorque(true)
let angle = 0
Timer.repeat(() => {
  angle += 10
  servo.setAngleInTime(angle, 1000)
  servo.requestReadStatus()
}, 2000)
