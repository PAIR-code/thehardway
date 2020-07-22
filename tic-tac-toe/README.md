# Tic-tac-toe experiment

## Training the models

### David's agent

- Install dependencies: run `npm install`
- Generate data and train model: run `npm run generate-and-train`

This will a new folder in the `models/` directory with the saved model. This output can be used in the [viewer](viewer)

### Yannick's agent

- Install dependencies: run `npm install`
- Train model: run `npm run train`

This will a new folder in the `models/` directory with the saved model. This output can be used in the [viewer](viewer)

Training will also write out some metrics to a tensorboard logdir.

Yannick's training code is currently setup to use tfjs-node-gpu. Which requires a
linux machine with CUDA to run. If you want to run this on a machine without CUDA
(e.g. mac or windows), just replace tfjs-node-gpu with tfjs-node wherever you see it.

## Seeing the results

The [viewer](viewer) folder contains a simple web app to see the results of the game. To see it, launch a webserver in this folder. e.g.

```
python -m SimpleHTTPServer 8000
```

Then go to `localhost:8000/viewer` in your browser.

If you want to change the model loaded by each agent in the viewer, edit _david_agent.js_ or _yannick_agent.js_ respectively.
