import "dotenv/config";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { fileURLToPath } from "node:url";
import pool from "./db.js";
import { createToken, requireAuth } from "./auth.js";

const packageDefinition = protoLoader.loadSync(
  fileURLToPath(new URL("../proto/northwind.proto", import.meta.url)),
  { keepCase: true }
);
const proto = grpc.loadPackageDefinition(packageDefinition).northwind;

// Lista blanca de columnas para ORDER BY (evita inyeccion SQL)
const allowedSorts = new Set(["ProductID", "ProductName", "UnitPrice", "UnitsInStock"]);

// Envuelve un metodo para que solo se ejecute si el JWT es valido
const protectedHandler = (handler) => (call, callback) => {
  if (requireAuth(call, callback)) handler(call, callback);
};

const service = {
  // g) Login: valida credenciales y entrega el token
  Login(call, callback) {
    const { username, password } = call.request;
    const valid =
      username === (process.env.ADMIN_USER || "admin") &&
      password === (process.env.ADMIN_PASSWORD || "admin123");
    callback(null, valid
      ? { success: true, token: createToken(username), message: "Autenticacion correcta" }
      : { success: false, token: "", message: "Credenciales invalidas" });
  },

  // d) JOIN (customers - orders - order details) + agregaciones (COUNT, SUM)
  GetSalesByCustomer: protectedHandler(async (_call, callback) => {
    try {
      const [rows] = await pool.query(`
        SELECT c.CustomerID AS customerId,
               c.CompanyName AS customerName,
               COUNT(DISTINCT o.OrderID) AS orderCount,
               ROUND(COALESCE(SUM(od.UnitPrice * od.Quantity * (1 - od.Discount)), 0), 2) AS totalSales
        FROM customers c
        INNER JOIN orders o ON o.CustomerID = c.CustomerID
        INNER JOIN order_details od ON od.OrderID = o.OrderID
        GROUP BY c.CustomerID, c.CompanyName
        ORDER BY totalSales DESC`);
      callback(null, {
        summaries: rows.map((row) => ({
          ...row,
          orderCount: Number(row.orderCount),
          totalSales: Number(row.totalSales),
        })),
      });
    } catch (error) {
      callback({ code: grpc.status.INTERNAL, message: error.message });
    }
  }),

  // f) Paginacion y ordenamiento (ORDER BY ... LIMIT ... OFFSET ...)
  GetProductsPage: protectedHandler(async (call, callback) => {
    try {
      const page = Math.max(1, Number(call.request.page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number(call.request.pageSize) || 10));
      const sortBy = allowedSorts.has(call.request.sortBy) ? call.request.sortBy : "ProductID";
      const sortOrder = String(call.request.sortOrder).toUpperCase() === "DESC" ? "DESC" : "ASC";
      const offset = (page - 1) * pageSize;

      const [[{ total }]] = await pool.query("SELECT COUNT(*) AS total FROM products");
      const [rows] = await pool.query(
        `SELECT ProductID, ProductName, SupplierID, CategoryID,
                QuantityPerUnit, UnitPrice, UnitsInStock, ReorderLevel
         FROM products
         ORDER BY ?? ${sortOrder}
         LIMIT ? OFFSET ?`,
        [sortBy, pageSize, offset]
      );
      callback(null, { products: rows, page, pageSize, total: Number(total) });
    } catch (error) {
      callback({ code: grpc.status.INTERNAL, message: error.message });
    }
  }),
};

const server = new grpc.Server();
server.addService(proto.ProductService.service, service);
const port = process.env.GRPC_PORT || 50051;
server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (error) => {
  if (error) throw error;
  console.log(`Servidor gRPC MySQL escuchando en puerto ${port}`);
});
