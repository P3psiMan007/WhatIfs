import fs from "node:fs";
import path from "node:path";
// The plain "ajv" export only understands draft-07 meta-schema; every
// schema in episodes/*.schema.json declares 2020-12 ($schema field), which
// needs this dedicated build - compiling against plain Ajv throws
// "no schema with key or ref .../2020-12/schema".
import Ajv2020 from "ajv/dist/2020.js";

const SCHEMAS_DIR = "episodes";

const compileSchema = (ajv, schemaFileName) => {
  const schema = JSON.parse(fs.readFileSync(path.join(SCHEMAS_DIR, schemaFileName), "utf8"));
  return ajv.compile(schema);
};

/**
 * @returns {{ ok: boolean, errors: Array<{ file: string, message: string }> }}
 */
export const validateEpisodePackage = (episodeDir) => {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const errors = [];

  const checks = [
    { file: "episode.json", schemaFile: "episode-package.schema.json", required: true },
    { file: "scene-manifest.json", schemaFile: "scene-manifest.schema.json", required: true },
    { file: "facts.json", schemaFile: "fact-ledger.schema.json", required: false },
  ];

  for (const { file, schemaFile, required } of checks) {
    const filePath = path.join(episodeDir, file);
    if (!fs.existsSync(filePath)) {
      if (required) errors.push({ file, message: "required file is missing" });
      continue;
    }

    let data;
    try {
      data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
      errors.push({ file, message: `invalid JSON: ${error.message}` });
      continue;
    }

    const validate = compileSchema(ajv, schemaFile);
    if (!validate(data)) {
      for (const err of validate.errors ?? []) {
        errors.push({ file, message: `${err.instancePath || "/"} ${err.message}` });
      }
    }
  }

  return { ok: errors.length === 0, errors };
};
