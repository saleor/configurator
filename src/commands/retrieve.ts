import { configurator } from "./setup";

const config = await configurator.fetchConfiguration();
console.log(config);
