# xpede

A simple tool to help you define and track your goals.

To view the dashboard, open the file `out/dashboard.html` in a browser.

## Installation

To make any changes, you need to have [Node.js](https://nodejs.org/) installed.

Install the dependencies with

```
npm ci
```

Make sure the application commands are executable

```
chmod +x run/*
```

Make sure everything is working by running the test suite

```
run/test
```

## Usage


### Updating metrics and dashboard

To update the dashboard and add facts to due metrics, run the following command

```
run/update
```

open http://localhost:19747 in your browser and follow the instructions.

When done press the `ENTER` key.

You can find the dashboard in `out/dashboard.html`.


### Editing an Expedition

To create or edit an Expedition named `first` use

```
run/edit expedition first
```

This starts the node REPL with the loaded or created Expedition assigned to the variable `$`.

You can now edit the Expedition, e.g. give it a name and define its Summit:

```
$.name.set('My First Expedition')

s = $.summit.create()
s.name.set('Be healthy')
```

To save the Expedition use

```
save()
```

Or save and quit with 

```
quit()
```

The expedition is now saved as `store/expedition/first.json`.

To quit the editor without saving use the key combination `Ctrl + D`.