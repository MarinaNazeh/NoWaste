// SCRUM-80: docs/openapi.json is the API contract (SDD 3.2.3 IApi). These tests fail when the server and the contract
// disagree, so a new route must be added to the contract first. No database is needed.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { createApp } from '../src/api/app.js';
import { protectedRoutes } from '../src/api/routes/protectedRoutes.js';

interface Operation {
  security?: unknown[];
  responses: Record<string, unknown>;
  'x-roles'?: string[];
}
interface Spec {
  openapi: string;
  paths: Record<string, Record<string, Operation>>;
  components: { schemas: { ErrorId: { enum: string[] } } };
}

const specText = readFileSync(path.join(__dirname, '../../docs/openapi.json'), 'utf8');
const spec = JSON.parse(specText) as Spec;

// Express ":userId" -> OpenAPI "{userId}".
const toOpenApi = (expressPath: string) => expressPath.replace(/:(\w+)/g, '{$1}');

interface Layer {
  route?: { path: string; methods: Record<string, boolean> };
}

function serverRoutes(): string[] {
  const app = createApp({ healthService: { check: () => Promise.resolve({ status: 'ok', db: 'ok' }) } });
  const stack = (app as unknown as { router: { stack: Layer[] } }).router.stack;
  const routes: string[] = [];
  for (const layer of stack) {
    // Routers mounted with app.use() keep their routes one level down.
    const inner = (layer as { handle?: { stack?: Layer[] } }).handle?.stack ?? [layer];
    for (const { route } of inner) {
      if (!route) continue;
      for (const method of Object.keys(route.methods)) routes.push(`${method} ${toOpenApi(route.path)}`);
    }
  }
  return routes.sort();
}

function specRoutes(): string[] {
  return Object.entries(spec.paths)
    .flatMap(([p, ops]) => Object.keys(ops).map((method) => `${method} ${p}`))
    .sort();
}

function allSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? allSourceFiles(full) : full.endsWith('.ts') ? [full] : [];
  });
}

describe('IF-COM-01 API contract (docs/openapi.json)', () => {
  test('IF-COM-01 the contract is OpenAPI 3.1', () => {
    expect(spec.openapi).toBe('3.1.0');
  });

  test('IF-COM-01 every server route is in the contract and every contract route exists', () => {
    expect(specRoutes()).toEqual(serverRoutes());
  });

  test('IF-COM-01 every $ref points to something defined in the contract', () => {
    const refs = [...specText.matchAll(/"\$ref":\s*"#\/([^"]+)"/g)].map((m) => m[1] ?? '');
    for (const ref of refs) {
      const target = ref
        .split('/')
        .reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], spec);
      expect({ ref, defined: target !== undefined }).toEqual({ ref, defined: true });
    }
  });

  test('IF-COM-03 protected routes need a token and list the same roles as the server', () => {
    for (const route of protectedRoutes) {
      const op = spec.paths[toOpenApi(route.path)]?.[route.method];
      expect(op).toBeDefined();
      expect(op?.security).toBeUndefined(); // inherits the global bearerAuth
      expect(op?.responses['401']).toBeDefined();
      expect(op?.responses['403']).toBeDefined();
      expect(op?.['x-roles']).toEqual([...route.roles]);
    }
  });

  test('IF-COM-03 only health, register, login and the pin address are public', () => {
    const publicOps = specRoutes().filter((r) => {
      const [method = '', p = ''] = r.split(' ');
      return spec.paths[p]?.[method]?.security?.length === 0;
    });
    expect(publicOps).toEqual([
      'get /geocode/reverse',
      'get /health',
      'post /auth/login',
      'post /auth/register',
    ]);
  });

  test('E-ACC-02 every error ID the server can return is listed in the contract', () => {
    const source = allSourceFiles(path.join(__dirname, '../src'))
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');
    const used = new Set([...source.matchAll(/error:\s*'([\w-]+)'/g)].map((m) => m[1]));
    for (const id of used) expect(spec.components.schemas.ErrorId.enum).toContain(id);
  });
});
