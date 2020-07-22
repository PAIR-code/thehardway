/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

import * as argparse from 'argparse';
import {Environment} from './environment';

(async function run() {
  const parser = new argparse.ArgumentParser();
  parser.addArgument('--gpu', {
    action: 'storeTrue',
    help: 'Use tfjs-node-gpu for training (required CUDA and CuDNN)'
  });
  parser.addArgument('--logDir', {
    type: 'string',
    help: 'Directory to which the TensorBoard summaries will be saved.'
  });
  parser.addArgument('--savePath', {
    type: 'string',
    defaultValue: './models',
    help: 'Directory to which the models will be saves '
  });

  const args = parser.parseArgs();

  const env = new Environment(args.savePath, args.logDir);
  await env.run();
})();
