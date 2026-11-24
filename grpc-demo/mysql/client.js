import "dotenv/config";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { fileURLToPath } from "node:url";

// defaults: true => imprime tambien los valores en 0 / vacios
const definition = protoLoader.loadSync(
  fileURLToPath(new URL("../proto/northwind.proto", import.meta.url)),
  { keepCase: true, defaults: true }
);
const proto = grpc.loadPackageDefinition(definition).northwind;
const address = `${process.env.GRPC_HOST || "localhost"}:${process.env.GRPC_PORT || 50051}`;
const client = new proto.ProductService(address, grpc.credentials.createInsecure());

const call = (method, request, metadata = new grpc.Metadata()) =>
  new Promise((resolve, reject) => {
    client[method](request, metadata, (error, response) => (error ? reject(error) : resolve(response)));
  });

const withToken = (token) => {
  const metadata = new grpc.Metadata();
  metadata.set("authorization", `Bearer ${token}`);
  return metadata;
};

const credentials = () => ({
  username: process.env.ADMIN_USER || "admin",
  password: process.env.ADMIN_PASSWORD || "admin123",
});

// Uso: node mysql/client.js <prueba>
//   login | login-mal | d | sin-token | token-malo | f1 | f2 | f3 | f-seguridad | todo
const tests = {
  async login() {
    console.log("--- g) Login correcto");
    const res = await call("Login", credentials());
    console.log(res);
    return res;
  },
  async "login-mal"() {
    console.log("--- g) Login con contrasena incorrecta");
    console.log(await call("Login", { username: "admin", password: "incorrecta" }));
  },
  async "sin-token"() {
    console.log("--- g) Llamada protegida SIN token (debe fallar)");
    await expectDenied(() => call("GetSalesByCustomer", {}));
  },
  async "token-malo"() {
    console.log("--- g) Llamada protegida con token INVALIDO (debe fallar)");
    await expectDenied(() => call("GetSalesByCustomer", {}, withToken("abc.def.ghi")));
  },
  async d(token) {
    console.log("--- d) JOIN + agregaciones: pedidos y ventas por cliente");
    const res = await call("GetSalesByCustomer", {}, withToken(token));
    console.table(res.summaries);
  },
  async f1(token) {
    console.log("--- f) Pagina 1, 5 por pagina, UnitPrice DESC");
    await showPage(token, { page: 1, pageSize: 5, sortBy: "UnitPrice", sortOrder: "DESC" });
  },
  async f2(token) {
    console.log("--- f) Pagina 2, 5 por pagina, UnitPrice DESC");
    await showPage(token, { page: 2, pageSize: 5, sortBy: "UnitPrice", sortOrder: "DESC" });
  },
  async f3(token) {
    console.log("--- f) Pagina 1, 10 por pagina, ProductName ASC");
    await showPage(token, { page: 1, pageSize: 10, sortBy: "ProductName", sortOrder: "ASC" });
  },
  async "f-seguridad"(token) {
    console.log("--- f) sortBy no permitido (se ignora) y pageSize 5000 (se limita a 100)");
    const res = await call(
      "GetProductsPage",
      { page: 1, pageSize: 5000, sortBy: "ProductID; DROP TABLE products", sortOrder: "ASC" },
      withToken(token)
    );
    console.log(`page=${res.page} pageSize=${res.pageSize} total=${res.total} registros=${res.products.length}`);
  },
};

async function showPage(token, request) {
  const res = await call("GetProductsPage", request, withToken(token));
  console.log(`page=${res.page} pageSize=${res.pageSize} total=${res.total}`);
  console.table(res.products);
}

async function expectDenied(fn) {
  try {
    await fn();
    console.log("ERROR: la llamada NO deberia haber funcionado");
  } catch (error) {
    console.log(`Acceso denegado -> code ${error.code} (${grpc.status[error.code]}): ${error.details}`);
  }
}

const protectedTests = ["d", "f1", "f2", "f3", "f-seguridad"];
const name = process.argv[2] || "todo";
try {
  if (name === "todo") {
    await tests["sin-token"]();
    await tests["token-malo"]();
    await tests["login-mal"]();
    const { token } = await tests.login();
    for (const t of protectedTests) await tests[t](token);
  } else if (tests[name]) {
    // las pruebas protegidas obtienen el token con un login previo silencioso
    const token = protectedTests.includes(name) ? (await call("Login", credentials())).token : undefined;
    await tests[name](token);
  } else {
    console.log("Prueba no valida. Use: login, login-mal, sin-token, token-malo, d, f1, f2, f3, f-seguridad o todo");
  }
} catch (error) {
  console.error("Error gRPC:", error.details || error.message);
  process.exitCode = 1;
}
client.close();