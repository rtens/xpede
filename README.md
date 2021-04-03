# xpede

A simple tool to help you define and track your goals.

To simply view the dashboard, open the file `out/dashboard.html` in a browser.

## Installation

To make any changes, you need to have [Node.js](https://nodejs.org/) installed.

Make sure the application commands are executable

```
chmod +x run/*
```

Make sure everything is working by running the test suite

```
run/test
```

## Usage

### Creating and editing an Expedition

To edit an Expedition named `first` use

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

You can quit the editor by pressing the key combination `Ctrl + D`.

The expedition is now saved as `store/expedition/first.json`.

### Creating and updating the dashboard

To create a new and update an existing dashboard, use the following command

```
run/dashboard
```

This will create the file `out/dashboard.html` containing all Expeditions stored in `store/expedition`.