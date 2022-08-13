# Moddable SCServo

This is a driver of Feetech SCS series command servo.
The driver depends on [Moddable SDK](https://www.moddable.com/).

## Installation

in your mcconfig.json

```json
{
  "include": ["path/to/this/project/manifest.json"]
}
```
## For developers

* Install the required.
  * VSCode
  * Docker and docker-compose
* Open this repository with VSCode
* Click a green arrow on bottom-left of the window
* Select "Reopen in container" on popup
* Install npm dependencies

```cmd
$ npm install
```

* Allow opening GUI from inside a container

```cmd
# in host environment
$ xhost +local:
```

### Debug

```cmd
$ npm run debug:[m5stack|lin]
```

### Deploy

```cmd
$ npm run deploy:[m5stack|lin]
```
