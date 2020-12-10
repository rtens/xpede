# xpede

A simple tool to help you define and track your goals.

## Installation

You need to have [Node.js](https://nodejs.org/) installed.

Make sure `edit` is executable

```
chmod +x edit
```

## Usage

To edit an Expedition named `first` use

```
./edit first
```

This starts the node REPL with the loaded or created Expedition assigned to the variable `e`.

You can now edit the Expedition, i.e. add a Mountain with a Goal:

```
e.name.set('My First Expedition')

m = e.mountains.add().create()
m.name.set('Health')

g = m.goals.add().create()
g.caption.set('Be healthy')
```

To save the Expedition and create its Dashboards use

```
e.save()
```

The expedition is now saved as `store/first.json` and the Dashboard can be found in `out/first.html`.