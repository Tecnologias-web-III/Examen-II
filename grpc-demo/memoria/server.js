import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { fileURLToPath } from 'node:url';
import db from './data.js';

// Carga del archivo .proto
const PROTO_PATH = fileURLToPath(new URL('../proto/northwind.proto', import.meta.url));
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  defaults: true
});
const northwind = grpc.loadPackageDefinition(packageDefinition).northwind;

// Implementacion de cada metodo rpc
const service = {
  GetAllCategories: (call, callback) => {
    callback(null, { categories: db.categories });
  },

  // a) Consultar todos los datos
  GetAllProducts: (call, callback) => {
    callback(null, { products: db.products });
  },

  // b) Consultar campos especificos
  GetProductFields: (call, callback) => {
    const { fields } = call.request;
    const records = db.products.map((p) => {
      const values = {};
      fields.forEach((f) => {
        if (f in p) values[f] = String(p[f]);
      });
      return { values };
    });
    callback(null, { records });
  },

  // c) Consultar aplicando filtros
  FilterProducts: (call, callback) => {
    const { field, value } = call.request;
    let result;
    if (field === 'CategoryID') {
      result = db.products.filter((p) => p.CategoryID === Number(value));
    } else if (field === 'ProductName') {
      result = db.products.filter((p) =>
        p.ProductName.toLowerCase().includes(value.toLowerCase()));
    } else if (field === 'UnitPrice_min') {
      result = db.products.filter((p) => p.UnitPrice >= Number(value));
    } else {
      return callback({
        code: grpc.status.INVALID_ARGUMENT,
        message: 'Campo de filtro no valido'
      });
    }
    callback(null, { products: result });
  },

  // e) Insertar
  AddProduct: (call, callback) => {
    const nextId = Math.max(...db.products.map((p) => p.ProductID)) + 1;
    const newProduct = { ...call.request, ProductID: nextId };
    db.products.push(newProduct);
    callback(null, newProduct);
  },

  // e) Modificar
  UpdateProduct: (call, callback) => {
    const index = db.products.findIndex((p) => p.ProductID === call.request.ProductID);
    if (index === -1) {
      return callback(null, { success: false, message: 'El producto no existe' });
    }
    db.products[index] = { ...call.request };
    callback(null, { success: true, message: 'Producto modificado' });
  },

  // e) Eliminar
  DeleteProduct: (call, callback) => {
    const index = db.products.findIndex((p) => p.ProductID === call.request.id);
    if (index === -1) {
      return callback(null, { success: false, message: 'El producto no existe' });
    }
    db.products.splice(index, 1);
    callback(null, { success: true, message: 'Producto eliminado' });
  }
};

// Arranque del servidor
const server = new grpc.Server();
server.addService(northwind.ProductService.service, service);
server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (err, port) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log(`Servidor gRPC (memoria) escuchando en el puerto ${port}`);
});