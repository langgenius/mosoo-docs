#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, "..");
const TRANSLATION_FILE = path.join(SCRIPT_DIR, "openapi.zh-Hans.translations.json");
const VISIBLE_TEXT_KEYS = new Set(["bearerFormat", "description", "summary", "title"]);
const GENERATED_FILES = {
  codingAgents: "content/docs/coding-agents.mdx",
  en: "public/docs/openapi/mosoo-openapi.en.generated.json",
  legacy: "public/docs/openapi/mosoo-openapi.generated.json",
  zhHans: "public/docs/openapi/mosoo-openapi.zh-Hans.generated.json",
};
const CODING_AGENTS_GENERATED_BEGIN = "{/* BEGIN GENERATED OPENAPI REFERENCE */}";
const CODING_AGENTS_GENERATED_END = "{/* END GENERATED OPENAPI REFERENCE */}";
const LEGACY_CODING_AGENTS_GENERATED_BEGIN = "<!-- BEGIN GENERATED OPENAPI REFERENCE -->";
const LEGACY_CODING_AGENTS_GENERATED_END = "<!-- END GENERATED OPENAPI REFERENCE -->";
const DEFAULT_API_ORIGIN = "https://try.mosoo.ai";
const DEFAULT_DOCS_ORIGIN = "https://mosoo.ai/docs";
const DEFAULT_MOSOO_REPO_REF = "main";
const DEFAULT_MOSOO_REPO_URL = "https://github.com/langgenius/mosoo.git";
const GIT_COMMAND_MAX_BUFFER = 64 * 1024 * 1024;
const MODE = process.argv[2] ?? "write";
const HTTP_METHOD_ORDER = ["get", "post", "put", "patch", "delete", "options", "head"];
const MOSOO_OPENAPI_SOURCES = [
  {
    exportName: "createPublicApiOpenApiDocument",
    importPath: "./apps/api/src/adapters/http/routes/public-api-openapi.ts",
    markerPath: "apps/api/src/adapters/http/routes/public-api-openapi.ts",
  },
];

if (!["check", "write"].includes(MODE)) {
  console.error("Usage: node scripts/sync-openapi-specs.mjs [write|check]");
  process.exit(1);
}

function redactSensitiveText(text) {
  let redacted = text;
  for (const secret of [
    process.env.MOSOO_REPO_TOKEN,
    process.env.GH_TOKEN,
    process.env.GITHUB_TOKEN,
  ]) {
    if (typeof secret === "string" && secret.length > 0) {
      redacted = redacted.split(secret).join("[redacted]");
    }
  }

  return redacted.replace(
    /https:\/\/x-access-token:[^@\s]+@github\.com\//g,
    "https://github.com/",
  );
}

function trimProcessOutput(output) {
  return typeof output === "string" ? output.trim() : "";
}

function runCommand(command, args, options = {}) {
  const { failureMessage, ...spawnOptions } = options;
  const result = spawnSync(command, args, {
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_TERMINAL_PROMPT: "0",
    },
    maxBuffer: GIT_COMMAND_MAX_BUFFER,
    ...spawnOptions,
  });

  if (result.status !== 0) {
    throw new Error(
      [
        failureMessage,
        result.error?.message,
        trimProcessOutput(result.stdout),
        trimProcessOutput(result.stderr),
      ]
        .filter(Boolean)
        .map(redactSensitiveText)
        .join("\n"),
    );
  }

  return result;
}

function createAuthenticatedGithubPrefix() {
  const token = process.env.MOSOO_REPO_TOKEN;
  if (typeof token !== "string" || token.length === 0) {
    return null;
  }

  return `https://x-access-token:${encodeURIComponent(token)}@github.com/`;
}

function installMosooDependencies(mosooRepo) {
  runCommand("bun", ["install"], {
    cwd: mosooRepo,
    failureMessage: "Failed to install Mosoo dependencies.",
  });
}

function checkoutMosooRepoFromGit() {
  const repoUrl = process.env.MOSOO_REPO_URL ?? DEFAULT_MOSOO_REPO_URL;
  const repoRef = process.env.MOSOO_REPO_REF ?? DEFAULT_MOSOO_REPO_REF;
  const checkoutDir = path.join(tmpdir(), "mosoo-openapi-sync", "mosoo");
  rmSync(checkoutDir, { force: true, recursive: true });
  mkdirSync(checkoutDir, { recursive: true });

  runCommand("git", ["init"], {
    cwd: checkoutDir,
    failureMessage: "Failed to initialize Mosoo source checkout.",
  });

  const authenticatedGithubPrefix = createAuthenticatedGithubPrefix();
  if (authenticatedGithubPrefix !== null) {
    runCommand(
      "git",
      ["config", "--local", `url.${authenticatedGithubPrefix}.insteadOf`, "https://github.com/"],
      {
        cwd: checkoutDir,
        failureMessage: "Failed to configure authenticated GitHub access.",
      },
    );
  }

  runCommand("git", ["remote", "add", "origin", repoUrl], {
    cwd: checkoutDir,
    failureMessage: "Failed to configure Mosoo source remote.",
  });
  runCommand("git", ["fetch", "--depth", "1", "origin", repoRef], {
    cwd: checkoutDir,
    failureMessage: `Failed to fetch Mosoo source ref ${repoRef} from ${repoUrl}.`,
  });
  runCommand("git", ["checkout", "--detach", "FETCH_HEAD"], {
    cwd: checkoutDir,
    failureMessage: "Failed to checkout Mosoo source ref.",
  });
  runCommand("git", ["submodule", "update", "--init", "--recursive"], {
    cwd: checkoutDir,
    failureMessage: "Failed to initialize Mosoo source submodules.",
  });

  const revision = runCommand("git", ["rev-parse", "HEAD"], {
    cwd: checkoutDir,
    failureMessage: "Failed to read Mosoo source revision.",
  }).stdout.trim();
  console.log(`checked out ${repoUrl} ${repoRef} (${revision.slice(0, 12)})`);

  installMosooDependencies(checkoutDir);
  return checkoutDir;
}

function findOpenApiSourceInRepo(mosooRepo) {
  for (const source of MOSOO_OPENAPI_SOURCES) {
    if (existsSync(path.join(mosooRepo, source.markerPath))) {
      return {
        mosooRepo,
        source,
      };
    }
  }

  throw new Error(
    [
      `Could not find the Mosoo OpenAPI source in ${mosooRepo}.`,
      "Checked for:",
      ...MOSOO_OPENAPI_SOURCES.map((source) => `- ${source.markerPath}`),
    ].join("\n"),
  );
}

function resolveMosooOpenApiSource() {
  if (typeof process.env.MOSOO_REPO_DIR === "string" && process.env.MOSOO_REPO_DIR.length > 0) {
    return findOpenApiSourceInRepo(path.resolve(process.env.MOSOO_REPO_DIR));
  }

  return findOpenApiSourceInRepo(checkoutMosooRepoFromGit());
}

function generateSourceOpenApi(mosooRepo, source) {
  const evalSource = `
import { ${source.exportName} as createOpenApiDocument } from ${JSON.stringify(source.importPath)};
console.log(JSON.stringify(createOpenApiDocument(${JSON.stringify(DEFAULT_API_ORIGIN)}), null, 2));
`;
  const result = spawnSync("bun", ["--eval", evalSource], {
    cwd: mosooRepo,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });

  if (result.status !== 0) {
    throw new Error(
      [
        "Failed to generate OpenAPI from Mosoo source.",
        result.stdout.trim(),
        result.stderr.trim(),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return JSON.parse(result.stdout);
}

function normalizePublicTerminology(text) {
  return text
    .replace(/\bthe token owner\b/g, "the API token owner")
    .replace(/\bcaller token\b/g, "API token")
    .replace(/\bMosoo Access Tokens\b/g, "Mosoo API tokens")
    .replace(/\bMosoo Access Token\b/g, "Mosoo API token")
    .replace(/\bAccess Tokens\b/g, "API tokens")
    .replace(/\bAccess Token\b/g, "API token")
    .replace(/\baccess tokens\b/g, "API tokens")
    .replace(/\baccess token\b/g, "API token");
}

function normalizeSecuritySchemes(document) {
  const securitySchemes = document.components?.securitySchemes;
  if (securitySchemes?.accessToken) {
    securitySchemes.publicApiBearer ??= securitySchemes.accessToken;
    delete securitySchemes.accessToken;
  }

  visit(document, (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return;
    }

    if (Array.isArray(value.security)) {
      value.security = value.security.map((requirement) => {
        if (
          requirement &&
          typeof requirement === "object" &&
          !Array.isArray(requirement) &&
          Object.hasOwn(requirement, "accessToken")
        ) {
          return { publicApiBearer: requirement.accessToken };
        }
        return requirement;
      });
    }
  });
}

function visit(value, visitor, pointer = []) {
  visitor(value, pointer);

  if (Array.isArray(value)) {
    value.forEach((item, index) => visit(item, visitor, pointer.concat(index)));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    visit(child, visitor, pointer.concat(key));
  }
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeEnglishSpec(sourceDocument) {
  const document = cloneJson(sourceDocument);
  normalizeSecuritySchemes(document);

  visit(document, (value, pointer) => {
    const key = pointer.at(-1);
    if (typeof value === "string" && VISIBLE_TEXT_KEYS.has(key)) {
      const parent = getParent(document, pointer);
      parent[key] = normalizePublicTerminology(value);
    }
  });

  return document;
}

function getParent(root, pointer) {
  return pointer.slice(0, -1).reduce((current, segment) => current[segment], root);
}

function loadTranslations() {
  return JSON.parse(readFileSync(TRANSLATION_FILE, "utf8"));
}

function formatMissingTranslationMessage(missing) {
  const details = missing
    .map((entry) => `${entry.pointer}\n  ${entry.value}`)
    .join("\n\n");

  return `Missing ${missing.length} zh-Hans OpenAPI translation(s).\n${details}`;
}

function seedMissingTranslationPlaceholders(translations, missing) {
  let seeded = 0;

  for (const entry of missing) {
    if (!Object.hasOwn(translations, entry.value)) {
      translations[entry.value] = "";
      seeded += 1;
    }
  }

  if (seeded > 0) {
    writeFileSync(TRANSLATION_FILE, formatJson(translations));
    console.warn(
      `Seeded ${seeded} zh-Hans OpenAPI translation placeholder(s) in ${path.relative(
        REPO_ROOT,
        TRANSLATION_FILE,
      )}.`,
    );
  }
}

function createLocalizedSpec(englishDocument, translations, options = {}) {
  const { allowMissingFallback = false } = options;
  const document = cloneJson(englishDocument);
  const missing = [];

  visit(document, (value, pointer) => {
    const key = pointer.at(-1);
    if (typeof value !== "string" || !VISIBLE_TEXT_KEYS.has(key) || value.length === 0) {
      return;
    }

    const translated = translations[value];
    if (typeof translated !== "string" || translated.length === 0) {
      missing.push({ pointer: toJsonPointer(pointer), value });
      return;
    }

    const parent = getParent(document, pointer);
    parent[key] = translated;
  });

  if (missing.length > 0) {
    if (!allowMissingFallback) {
      throw new Error(formatMissingTranslationMessage(missing));
    }

    console.warn(formatMissingTranslationMessage(missing));
    console.warn("Using English source text for missing zh-Hans entries in write mode.");
  }

  assertSameStructure(englishDocument, document);
  return { document, missing };
}

function stripVisibleText(value, pointer = []) {
  const key = pointer.at(-1);
  if (typeof value === "string" && VISIBLE_TEXT_KEYS.has(key)) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => stripVisibleText(item, pointer.concat(index)));
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).map(([childKey, child]) => [
      childKey,
      stripVisibleText(child, pointer.concat(childKey)),
    ]),
  );
}

function assertSameStructure(englishDocument, localizedDocument) {
  const englishStructure = stableStringify(stripVisibleText(englishDocument));
  const localizedStructure = stableStringify(stripVisibleText(localizedDocument));
  if (englishStructure !== localizedStructure) {
    throw new Error("Localized OpenAPI spec changed non-text structure.");
  }
}

function toJsonPointer(pointer) {
  return `/${pointer
    .map((segment) => String(segment).replace(/~/g, "~0").replace(/\//g, "~1"))
    .join("/")}`;
}

function stableStringify(value) {
  return JSON.stringify(value, null, 2);
}

function formatJson(value) {
  return `${stableStringify(value)}\n`;
}

function normalizeCodingAgentTerminology(text) {
  return normalizePublicTerminology(text)
    .replace(/\bthe API token owner\b/g, "the current Mosoo user")
    .replace(/\bAPI token owner\b/g, "current Mosoo user")
    .replace(/\bthe authenticated API token caller\b/g, "the authenticated API token")
    .replace(/\bAPI token callers are attributed to\b/g, "API token requests are attributed to")
    .replace(/\bAPI token callers\b/g, "API token requests")
    .replace(/\bAPI token caller\b/g, "API token")
    .replace(/\bsame caller\b/g, "same API token")
    .replace(/\bcaller-owned\b/g, "client-owned")
    .replace(/\bThe caller cannot consume this Agent\./g, "This operation is not allowed for this Agent.")
    .replace(
      /\bThe resource was not found for this caller\./g,
      "The resource was not found in the current Mosoo workspace.",
    )
    .replace(/\bthe owner account\b/g, "the Mosoo account")
    .replace(/\bowner account\b/g, "Mosoo account")
    .replace(/\bAgent API Endpoint owner's capabilities\b/g, "published Agent configuration");
}

function cleanMarkdownText(value) {
  return normalizeCodingAgentTerminology(String(value)).replace(/\s+/g, " ").trim();
}

function cleanMdxText(value) {
  return cleanMarkdownText(value).replace(/[{}]/g, (character) => `\\${character}`);
}

function escapeTableCell(value) {
  return cleanMdxText(value).replace(/\|/g, "\\|");
}

function jsonCodeBlock(value) {
  return ["```json", stableStringify(value), "```"];
}

function schemaRefName(ref) {
  return ref.startsWith("#/components/schemas/")
    ? ref.slice("#/components/schemas/".length)
    : ref;
}

function responseRefName(ref) {
  return ref.startsWith("#/components/responses/")
    ? ref.slice("#/components/responses/".length)
    : ref;
}

function schemaType(schema) {
  if (!schema || typeof schema !== "object") {
    return "unknown";
  }

  if (schema.$ref) {
    return schemaRefName(schema.$ref);
  }

  if (Object.hasOwn(schema, "const")) {
    return JSON.stringify(schema.const);
  }

  if (Array.isArray(schema.enum)) {
    return schema.enum.map((value) => JSON.stringify(value)).join(" | ");
  }

  if (Array.isArray(schema.oneOf)) {
    return schema.oneOf.map(schemaType).join(" | ");
  }

  if (Array.isArray(schema.anyOf)) {
    return schema.anyOf.map(schemaType).join(" | ");
  }

  const type = Array.isArray(schema.type) ? schema.type.join(" | ") : schema.type;
  if (type === "array") {
    return `${schemaType(schema.items)}[]`;
  }

  if (typeof schema.format === "string" && schema.format.length > 0) {
    return `${type ?? "string"}(${schema.format})`;
  }

  return type ?? "object";
}

function schemaDescription(schema) {
  return typeof schema?.description === "string" && schema.description.length > 0
    ? cleanMdxText(schema.description)
    : "";
}

function resolveResponse(document, response) {
  if (!response?.$ref) {
    return response;
  }

  const name = responseRefName(response.$ref);
  return document.components?.responses?.[name] ?? response;
}

function operationEntries(document) {
  const entries = [];
  for (const [apiPath, pathItem] of Object.entries(document.paths ?? {})) {
    const methods = Object.keys(pathItem).sort(
      (left, right) => HTTP_METHOD_ORDER.indexOf(left) - HTTP_METHOD_ORDER.indexOf(right),
    );
    for (const method of methods) {
      if (!HTTP_METHOD_ORDER.includes(method)) {
        continue;
      }

      entries.push({
        apiPath,
        method,
        operation: pathItem[method],
      });
    }
  }

  return entries;
}

const API_OPERATION_ORDER = [
  ["post", "/agents/{agentId}/threads"],
  ["get", "/agents/{agentId}/threads"],
  ["get", "/threads/{threadId}"],
  ["post", "/threads/{threadId}/events"],
  ["get", "/threads/{threadId}/events"],
  ["get", "/threads/{threadId}/events/stream"],
  ["post", "/threads/{threadId}/files/uploads"],
  ["put", "/files/{fileId}/content"],
  ["post", "/files/{fileId}/complete"],
  ["post", "/threads/{threadId}/files"],
  ["get", "/threads/{threadId}/files"],
  ["get", "/files/{fileId}/content"],
  ["delete", "/threads/{threadId}/files/{fileId}"],
  ["post", "/threads/{threadId}/archive"],
  ["post", "/threads/{threadId}/unarchive"],
  ["delete", "/threads/{threadId}"],
];

function operationOrderIndex(method, apiPath) {
  const index = API_OPERATION_ORDER.findIndex(
    ([orderedMethod, orderedPath]) => orderedMethod === method && orderedPath === apiPath,
  );

  return index === -1 ? API_OPERATION_ORDER.length : index;
}

function sortedOperationEntries(document) {
  return operationEntries(document).sort((left, right) => {
    const leftIndex = operationOrderIndex(left.method, left.apiPath);
    const rightIndex = operationOrderIndex(right.method, right.apiPath);

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    return `${left.method} ${left.apiPath}`.localeCompare(`${right.method} ${right.apiPath}`);
  });
}

function renderParameterList(parameters, location, title) {
  const filtered = parameters.filter((parameter) => parameter.in === location);
  if (filtered.length === 0) {
    return [];
  }

  const lines = ["", `${title}:`, ""];
  for (const parameter of filtered) {
    const required = parameter.required ? "required" : "optional";
    const type = schemaType(parameter.schema);
    const description = schemaDescription(parameter);
    lines.push(
      `- \`${parameter.name}\` ${required}, \`${type}\`${description ? `. ${description}` : "."}`,
    );
  }

  return lines;
}

function renderExamples(examples) {
  const lines = [];
  for (const [name, example] of Object.entries(examples)) {
    const value = Object.hasOwn(example, "value") ? example.value : example;
    lines.push("", `Example \`${name}\`:`, "", ...jsonCodeBlock(value));
  }

  return lines;
}

function renderRequestBody(operation) {
  if (!operation.requestBody) {
    return [];
  }

  const lines = ["", "Request body:", ""];
  for (const [contentType, mediaType] of Object.entries(operation.requestBody.content ?? {})) {
    lines.push(`- \`${contentType}\`: \`${schemaType(mediaType.schema)}\``);

    if (Object.hasOwn(mediaType, "example")) {
      lines.push("", "Example:", "", ...jsonCodeBlock(mediaType.example));
    }

    if (mediaType.examples) {
      lines.push(...renderExamples(mediaType.examples));
    }
  }

  return lines;
}

function responseContentSummary(response) {
  const content = response?.content ?? {};
  const entries = Object.entries(content);
  if (entries.length === 0) {
    return "";
  }

  return entries
    .map(([contentType, mediaType]) => `\`${contentType}\` -> \`${schemaType(mediaType.schema)}\``)
    .join(", ");
}

function renderSuccessResponses(document, operation) {
  const successResponses = Object.entries(operation.responses ?? {}).filter(([status]) =>
    /^2\d\d$/.test(status),
  );
  if (successResponses.length === 0) {
    return [];
  }

  const lines = ["", "Success responses:", ""];
  for (const [status, responseSource] of successResponses) {
    const response = resolveResponse(document, responseSource);
    const description = response?.description ? cleanMdxText(response.description) : "";
    const content = responseContentSummary(response);
    lines.push(`- \`${status}\`${description ? `: ${description}` : ""}${content ? ` (${content})` : ""}`);

    for (const mediaType of Object.values(response?.content ?? {})) {
      if (Object.hasOwn(mediaType, "example")) {
        lines.push("", `Example \`${status}\`:`, "", ...jsonCodeBlock(mediaType.example));
      }
    }
  }

  return lines;
}

function renderErrorResponses(document, operation) {
  const errorResponses = Object.entries(operation.responses ?? {}).filter(
    ([status]) => !/^2\d\d$/.test(status),
  );
  if (errorResponses.length === 0) {
    return [];
  }

  const lines = ["", "Error responses:", ""];
  for (const [status, responseSource] of errorResponses) {
    const ref = responseSource?.$ref ? responseRefName(responseSource.$ref) : null;
    const response = resolveResponse(document, responseSource);
    const description = response?.description ? cleanMdxText(response.description) : "";
    lines.push(`- \`${status}\`${ref ? ` \`${ref}\`` : ""}${description ? `: ${description}` : ""}`);
  }

  return lines;
}

function renderOperation(document, entry) {
  const { apiPath, method, operation } = entry;
  const lines = ["", `### \`${method.toUpperCase()} ${apiPath}\``, ""];
  const purpose = operation.description ?? operation.summary;
  if (purpose) {
    lines.push(`Purpose: ${cleanMdxText(purpose)}`);
  }

  const parameters = operation.parameters ?? [];
  lines.push(...renderParameterList(parameters, "path", "Path params"));
  lines.push(...renderParameterList(parameters, "query", "Query params"));
  lines.push(...renderParameterList(parameters, "header", "Headers"));
  lines.push(...renderRequestBody(operation));
  lines.push(...renderSuccessResponses(document, operation));
  lines.push(...renderErrorResponses(document, operation));

  return lines;
}

function renderSchemaProperties(schema, indent = "") {
  const properties = schema?.properties;
  if (!properties || typeof properties !== "object") {
    return [];
  }

  const required = new Set(schema.required ?? []);
  const lines = [];
  for (const [propertyName, propertySchema] of Object.entries(properties)) {
    const requirement = required.has(propertyName) ? "required" : "optional";
    const description = schemaDescription(propertySchema);
    lines.push(
      `${indent}- \`${propertyName}\` ${requirement}, \`${schemaType(propertySchema)}\`${description ? `. ${description}` : "."}`,
    );

    if (propertySchema?.properties && indent.length < 2) {
      lines.push(...renderSchemaProperties(propertySchema, `${indent}  `));
    }
  }

  return lines;
}

function renderSchema(document, schemaName, schema) {
  const lines = ["", `### \`${schemaName}\``];
  const description = schemaDescription(schema);
  if (description) {
    lines.push("", description);
  }

  if (Array.isArray(schema.oneOf)) {
    lines.push("", "Variants:");
    schema.oneOf.forEach((variant, index) => {
      const variantDescription = schemaDescription(variant);
      lines.push("", `${index + 1}. \`${schemaType(variant)}\`${variantDescription ? `: ${variantDescription}` : ""}`);
      lines.push(...renderSchemaProperties(variant, "   "));
    });
    return lines;
  }

  const propertyLines = renderSchemaProperties(schema);
  if (propertyLines.length > 0) {
    lines.push("", "Fields:", "", ...propertyLines);
  } else {
    lines.push("", `Type: \`${schemaType(schema)}\`.`);
  }

  return lines;
}

function renderSchemaReference(document) {
  const schemas = document.components?.schemas ?? {};
  const lines = ["", "## Schema quick reference", ""];
  for (const [schemaName, schema] of Object.entries(schemas)) {
    lines.push(...renderSchema(document, schemaName, schema));
  }

  return lines;
}

function generateCodingAgentsOpenApiReference(document) {
  const entries = sortedOperationEntries(document);
  const lines = [
    "## API contract",
    "",
    "This section is generated from `/docs/openapi/mosoo-openapi.en.generated.json`. Do not edit it manually; run `npm run openapi:sync`.",
    "",
    "All endpoints below are relative to `/api/v1`.",
    "",
    "| Method | Path | Purpose |",
    "| --- | --- | --- |",
  ];

  for (const { apiPath, method, operation } of entries) {
    lines.push(
      `| \`${method.toUpperCase()}\` | \`${apiPath}\` | ${escapeTableCell(operation.summary ?? operation.description ?? "")} |`,
    );
  }

  lines.push(
    "",
    "Common error response envelope:",
    "",
    ...jsonCodeBlock({
      error: {
        code: "invalid_request",
        message: "Request body must be an object.",
      },
    }),
  );

  for (const entry of entries) {
    lines.push(...renderOperation(document, entry));
  }

  lines.push(...renderSchemaReference(document));
  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n")}\n`;
}

function replaceCodingAgentsGeneratedContent(currentContent, generatedContent) {
  const generatedBlock = `${CODING_AGENTS_GENERATED_BEGIN}\n${generatedContent.trim()}\n${CODING_AGENTS_GENERATED_END}\n`;
  const markerPairs = [
    [CODING_AGENTS_GENERATED_BEGIN, CODING_AGENTS_GENERATED_END],
    [LEGACY_CODING_AGENTS_GENERATED_BEGIN, LEGACY_CODING_AGENTS_GENERATED_END],
  ];

  for (const [beginMarker, endMarker] of markerPairs) {
    const beginIndex = currentContent.indexOf(beginMarker);
    const endIndex = currentContent.indexOf(endMarker);

    if (beginIndex === -1 && endIndex === -1) {
      continue;
    }

    if (beginIndex === -1 || endIndex === -1 || beginIndex > endIndex) {
      throw new Error(`${GENERATED_FILES.codingAgents} has malformed generated OpenAPI reference markers.`);
    }

    return `${currentContent.slice(0, beginIndex)}${generatedBlock}${currentContent.slice(
      endIndex + endMarker.length,
    ).replace(/^\n/, "")}`;
  }

  const startHeading = "## API contract\n";
  const endHeading = "\n## Implementation guardrails";
  const startIndex = currentContent.indexOf(startHeading);
  const endHeadingIndex = currentContent.indexOf(endHeading, startIndex);

  if (startIndex === -1 || endHeadingIndex === -1) {
    throw new Error(
      `${GENERATED_FILES.codingAgents} must contain generated reference markers, or headings "${startHeading.trim()}" and "${endHeading.trim()}".`,
    );
  }

  return `${currentContent.slice(0, startIndex)}${generatedBlock}${currentContent.slice(
    endHeadingIndex + 1,
  )}`;
}

function buildCodingAgentsOutput(englishDocument) {
  const target = path.join(REPO_ROOT, GENERATED_FILES.codingAgents);
  if (!existsSync(target)) {
    throw new Error(`${GENERATED_FILES.codingAgents} is missing.`);
  }

  return replaceCodingAgentsGeneratedContent(
    readFileSync(target, "utf8"),
    generateCodingAgentsOpenApiReference(englishDocument),
  );
}

function docsUrl(pathname) {
  const relativePath = pathname.replace(/^\/+/, "");
  return new URL(relativePath, `${DEFAULT_DOCS_ORIGIN}/`).toString();
}

function renderLlmsLink(label, pathname, description) {
  return `- [${label}](${docsUrl(pathname)}): ${description}`;
}

function buildLlmsTxtOutput(englishDocument) {
  const entries = sortedOperationEntries(englishDocument);
  const lines = [
    "# Mosoo API",
    "",
    "> Developer documentation for calling published Mosoo Agents. Coding agents should start with the machine-oriented guide, then use the raw OpenAPI JSON for strict schema validation.",
    "",
    "## Start here",
    "",
    renderLlmsLink(
      "Coding agent guide",
      "/coding-agents.md",
      "Machine-oriented guide with API flow, authentication, error handling, examples, implementation guardrails, and the generated API contract.",
    ),
    renderLlmsLink(
      "Human quickstart",
      "/quickstart.md",
      "Human-oriented walkthrough for creating a Thread, sending events, and reading responses.",
    ),
    renderLlmsLink(
      "Authentication and access",
      "/auth-and-access.md",
      "API token usage and access requirements for published Agents.",
    ),
    renderLlmsLink(
      "Agent API Endpoints",
      "/agent-api-endpoints.md",
      "Published Agent readiness, live endpoint versions, and Agent ID rules.",
    ),
    renderLlmsLink(
      "Threads and Runs",
      "/threads-and-runs.md",
      "Thread and Run lifecycle model for API integrations.",
    ),
    renderLlmsLink(
      "Events and streaming",
      "/events-and-streaming.md",
      "Snapshot reads, SSE streams, submitted events, and output reconstruction.",
    ),
    renderLlmsLink(
      "Files",
      "/files.md",
      "Upload sessions, binary content upload, completion, Thread attachment, and attachment IDs.",
    ),
    renderLlmsLink(
      "Errors and limits",
      "/errors-and-limits.md",
      "Error envelope, retry behavior, idempotency, and public API limits.",
    ),
    "",
    "## API specifications",
    "",
    renderLlmsLink(
      "English OpenAPI JSON",
      "/openapi/mosoo-openapi.en.generated.json",
      "Raw OpenAPI contract for client generation and strict request or response validation.",
    ),
    renderLlmsLink(
      "Simplified Chinese OpenAPI JSON",
      "/openapi/mosoo-openapi.zh-Hans.generated.json",
      "Localized OpenAPI contract for Simplified Chinese API reference pages.",
    ),
    renderLlmsLink(
      "Compatibility OpenAPI JSON",
      "/openapi/mosoo-openapi.generated.json",
      "English compatibility copy for older links and tooling.",
    ),
    "",
    "## Public API endpoints",
    "",
  ];

  for (const { apiPath, method, operation } of entries) {
    lines.push(
      `- \`${method.toUpperCase()} /api/v1${apiPath}\`: ${cleanMarkdownText(operation.summary ?? operation.description ?? "")}`,
    );
  }

  lines.push(
    "",
    "## Notes for agents",
    "",
    "- Build app-side backend and product logic around the published Mosoo Agent running in Mosoo's sandbox; do not implement a replacement sandbox, Agent runtime, model loop, planner, tool runner, memory system, lifecycle manager, or provider integration.",
    "- Treat API token identity, Agent API Endpoint access, and Thread or file visibility as separate checks.",
    "- Do not invent API tokens, Agent IDs, Thread IDs, file IDs, or run IDs.",
    "- Prefer `coding-agents.md` for workflow and retry behavior.",
    "- Prefer OpenAPI JSON for generated clients and exact schema validation.",
  );

  return `${lines.join("\n")}\n`;
}

function buildOutputs() {
  const { mosooRepo, source } = resolveMosooOpenApiSource();
  const sourceDocument = generateSourceOpenApi(mosooRepo, source);
  const englishDocument = normalizeEnglishSpec(sourceDocument);
  const translations = loadTranslations();
  const zhHans = createLocalizedSpec(englishDocument, translations, {
    allowMissingFallback: MODE === "write",
  });

  if (MODE === "write" && zhHans.missing.length > 0) {
    seedMissingTranslationPlaceholders(translations, zhHans.missing);
  }

  return {
    [GENERATED_FILES.codingAgents]: buildCodingAgentsOutput(englishDocument),
    [GENERATED_FILES.en]: formatJson(englishDocument),
    [GENERATED_FILES.legacy]: formatJson(englishDocument),
    [GENERATED_FILES.zhHans]: formatJson(zhHans.document),
  };
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function ensureParentDirectory(filePath) {
  mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeOutputs(outputs) {
  for (const [relativePath, content] of Object.entries(outputs)) {
    const target = path.join(REPO_ROOT, relativePath);
    ensureParentDirectory(target);
    writeFileSync(target, content);
    console.log(`wrote ${relativePath} ${sha256(content).slice(0, 12)}`);
  }
}

function checkOutputs(outputs) {
  const mismatches = [];
  for (const [relativePath, expected] of Object.entries(outputs)) {
    const target = path.join(REPO_ROOT, relativePath);
    if (!existsSync(target)) {
      mismatches.push(`${relativePath} is missing`);
      continue;
    }

    const actual = readFileSync(target, "utf8");
    if (actual !== expected) {
      mismatches.push(
        `${relativePath} is stale (expected ${sha256(expected).slice(0, 12)}, actual ${sha256(actual).slice(0, 12)})`,
      );
    }
  }

  if (mismatches.length > 0) {
    throw new Error(
      `OpenAPI generated files or agent reference are out of sync. Run npm run openapi:sync.\n${mismatches.join("\n")}`,
    );
  }

  console.log("OpenAPI generated files and agent reference are in sync.");
}

try {
  const outputs = buildOutputs();
  if (MODE === "check") {
    checkOutputs(outputs);
  } else {
    writeOutputs(outputs);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  rmSync(path.join(tmpdir(), "mosoo-openapi-sync"), {
    force: true,
    recursive: true,
  });
}
