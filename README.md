# xpede

A simple tool to help you define and track your goals.

## Installation

You need to have [Node.js](https://nodejs.org/) installed.

Make sure `edit` is executable

```
chmod +x edit
```

## Usage

To edit an Expedition named `my_expedition` use

```
./edit my_expedition
```

This starts the node REPL with the loaded or created Expedition assigned to the variable `e`.

You can now edit the Expedition, i.e. add a Mountain with Summit:

```
m = e.mountains.add().create()
m.name.set('Health')

s = m.summit.create()
s.summary.set('Be healthy')
```

To save the Expedition and create its Dashboards use

```
e.save()
```

The expedition is now saved as `store/my_expedition.json` and the Dashboards can be found in `out`.