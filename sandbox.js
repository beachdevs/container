#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { realpathSync, statSync } from "node:fs";
import { basename, dirname } from "node:path";

const die = (m) => (console.error(`Error: ${m}`), process.exit(1));
const err = (e) => String(e?.message ?? e).replace(/^Error:\s*/, "");
const run = (a, quiet = false) => {
  const r = spawnSync(a[0], a.slice(1), { encoding: "utf8", stdio: quiet ? ["ignore", "ignore", "pipe"] : "inherit" });
  if (r.status !== 0) throw new Error((r.stderr || `${a.join(" ")} failed`).trim());
};
const ensure = () => (run(["container", "--version"], true), run(["container", "system", "start"], true));
const usage = () => console.log(`Usage:
  sandbox create <dir> [dir...] [-n|--name name] [-i|--image image] [-d|--dest-base path] [-s|--script file.sh]
  sandbox ls [id]
  sandbox stop <id>
  sandbox delete <id>
Defaults: name=sandbox image=alpine:3.20 dest_base=/sandbox`);

const cmd = process.argv[2];
if (!cmd || cmd === "-h" || cmd === "--help") usage(), process.exit(0);

const create = (args) => {
  let image = "alpine:3.20", name = "sandbox", base = "/sandbox", script = "";
  if (args.includes("-h") || args.includes("--help")) usage(), process.exit(0);
  const dirs = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (["-i", "--image", "-n", "--name", "-d", "--dest-base", "-s", "--script"].includes(a)) {
      if (!args[i + 1]) die(`missing value for ${a}`);
      const v = args[++i];
      if (a === "-i" || a === "--image") image = v;
      else if (a === "-n" || a === "--name") name = v;
      else if (a === "-d" || a === "--dest-base") base = v;
      else script = v;
      continue;
    }
    dirs.push(a);
  }
  if (!dirs.length) die("create needs at least one directory");
  if (!base.startsWith("/")) die(`dest base must be absolute (got '${base}')`);
  ensure();
  let scriptAbs = "", scriptDir = "", scriptName = "";
  if (script) {
    if (!statSync(script).isFile()) die(`not a file: ${script}`);
    scriptAbs = realpathSync(script);
    scriptDir = dirname(scriptAbs);
    scriptName = basename(scriptAbs);
    if (scriptDir.includes(",")) die(`commas not supported in path: ${scriptDir}`);
  }

  const items = dirs.map((d, i) => {
    if (!statSync(d).isDirectory()) die(`not a directory: ${d}`);
    const abs = realpathSync(d);
    if (abs.includes(",")) die(`commas not supported in path: ${abs}`);
    return { abs, src: `/__import/${i}`, dst: `${base}/host${abs}`, mount: `type=bind,source=${abs},target=/__import/${i},readonly` };
  });

  let created = false;
  try {
    run(["container", "run", "-d", "--name", name, ...items.flatMap((x) => ["--mount", x.mount]), ...(scriptAbs ? ["--mount", `type=bind,source=${scriptDir},target=/__script,readonly`] : []), image, "sh", "-lc", "while true; do sleep 3600; done"], true);
    created = true;
    run(["container", "exec", name, "mkdir", "-p", `${base}/host`], true);
    for (const x of items) {
      run(["container", "exec", name, "mkdir", "-p", x.dst], true);
      run(["container", "exec", name, "cp", "-R", `${x.src}/.`, `${x.dst}/`], true);
      console.log(`Copied: ${x.abs} -> ${x.dst}`);
    }
    if (scriptAbs) run(["container", "exec", name, "sh", `/__script/${scriptName}`]);
    console.log(`Ready: ${name}`);
  } catch (e) {
    if (created) spawnSync("container", ["stop", name], { stdio: "ignore" }), spawnSync("container", ["delete", name], { stdio: "ignore" });
    const m = err(e);
    if (m.includes("already exists") || m.includes("exists:")) die(`container '${name}' already exists. Use '-n <name>' or run 'sandbox delete ${name}' first.`);
    die(m);
  }
};

try {
  if (cmd === "create") create(process.argv.slice(3));
  else if (cmd === "ls") {
    const id = process.argv[3];
    ensure();
    if (!id) run(["container", "list", "--all"]);
    else run(["container", "exec", id, "ls", "-l", "/sandbox/host"]);
  }
  else if (cmd === "stop") {
    const id = process.argv[3]; if (!id) die("stop needs <id>");
    ensure(); run(["container", "stop", id]);
  } else if (cmd === "delete") {
    const id = process.argv[3]; if (!id) die("delete needs <id>");
    ensure(); run(["container", "delete", id]);
  } else usage(), process.exit(1);
} catch (e) {
  die(err(e));
}
