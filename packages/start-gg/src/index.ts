import { ArgumentParser } from "argparse";

const parser = new ArgumentParser({
  description: "Pulls data from the start.gg API.",
});
parser.add_argument("--api-key", {
  type: "str",
  dest: "apiKey",
  help: "the start.gg developer token. default is env var: START_GG_API_KEY",
  default: process.env["START_GG_API_KEY"],
});

const subparsers = parser.add_subparsers();

const tournamentParser = subparsers.add_parser("tournaments");
tournamentParser.add_argument("tournamentIds", {
  action: "append",
  metavar: "id",
  type: "str",
  nargs: "+",
  help: "the list of tournament ids to extract",
});

const hubParser = subparsers.add_parser("hubs");
hubParser.add_argument("hubIds", {
  action: "append",
  metavar: "id",
  type: "str",
  nargs: "+",
  help: "the list of hub ids to extract",
});

const args = parser.parse_args();

const apiKey = args.apiKey;
if (!apiKey) {
  throw new Error("--apiKey is required");
}

if (Array.isArray(args.tournamentIds?.[0])) {
  const exec = require("./tournament").loadTournaments;
  exec(apiKey, args.tournamentIds[0]);
} else if (Array.isArray(args.hubIds?.[0])) {
  const exec = require("./hub").loadHubs;
  exec(apiKey, args.hubIds[0]);
} else {
  throw new Error("Cannot handle provided args!");
}
