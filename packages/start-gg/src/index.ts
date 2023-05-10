import { ArgumentParser } from "argparse";
import { EventSchema } from "@emily-curry/fgc-sync-common";

const parser = new ArgumentParser({
  description: "Pulls data from the start.gg API.",
});

parser.add_argument("ids", {
  action: "append",
  metavar: "id",
  type: "str",
  nargs: "+",
  help: "the list of tournament ids to extract",
});
parser.add_argument("--api-key", {
  type: "str",
  dest: "apiKey",
  help: "the start.gg developer token",
  required: true,
});

let args = parser.parse_args();
console.log({ ...args });
