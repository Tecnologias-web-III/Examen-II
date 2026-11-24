import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { randomUUID } from 'node:crypto';
import type { AppRouter } from './router';

const client = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: 'http://127.0.0.1:3001' })],
});

const operacion = process.argv[2] || 'todo';

async function ejecutar() {
  if (!['a', 'b', 'c', 'd', 'e', 'e1', 'e2', 'e3', 'todo'].includes(operacion)) {
    throw new Error('Operaciones disponibles: a, b, c, d, e, e1, e2, e3, todo.');
  }

  if (operacion === 'a' || operacion === 'todo') {
    console.log('\na) Consultar todos los productos:');
    console.table(await client.getAllProducts.query());
  }

  if (operacion === 'b' || operacion === 'todo') {
    console.log('\nb) Consultar campos específicos (ProductName, UnitPrice):');
    console.table(await client.getProductFields.query({ fields: ['ProductName', 'UnitPrice'] }));
  }

  if (operacion === 'c' || operacion === 'todo') {
    console.log('\nc) Consultar aplicando filtros (CategoryID = 2 y UnitPriceMax = 25):');
    console.table(await client.filterProducts.query({ CategoryID: 2, UnitPriceMax: 25 }));
  }

  if (operacion === 'd' || operacion === 'todo') {
    console.log('\nd) Consultar productos con su categoría (INNER JOIN):');
    console.table(await client.getProductsWithCategory.query());
  }

  const probarCRUD = operacion === 'e' || operacion === 'todo';
  let ProductID = Number(process.argv[3]);

  if (operacion === 'e1' || probarCRUD) {
    console.log('\ne.1) Insertar un producto:');
    const insertado = await client.addProduct.mutate({
      ProductName: `Demo tRPC ${randomUUID().slice(0, 8)}`,
      SupplierID: 1,
      CategoryID: 1,
      QuantityPerUnit: '12 - 250 g bags',
      UnitPrice: 12.5,
      UnitsInStock: 40,
      ReorderLevel: 10,
    });
    console.log(insertado);
    ProductID = insertado.ProductID;
  }

  if (operacion === 'e2' || operacion === 'e3') {
    if (!Number.isInteger(ProductID) || ProductID <= 0) {
      throw new Error('Indique el ProductID devuelto por la operación e1.');
    }
  }

  if (operacion === 'e2' || probarCRUD) {
    console.log(`\ne.2) Modificar el producto ${ProductID}:`);
    console.log(await client.updateProduct.mutate({ ProductID, UnitPrice: 14, UnitsInStock: 55 }));
  }

  if (operacion === 'e3' || probarCRUD) {
    console.log(`\ne.3) Eliminar el producto ${ProductID}:`);
    console.log(await client.deleteProduct.mutate({ ProductID }));
    const productos = await client.getProductFields.query({ fields: ['ProductID'] });
    if (productos.some((producto) => producto.ProductID === ProductID)) {
      throw new Error(`El producto ${ProductID} todavía aparece en MySQL.`);
    }
    console.log(`Consulta posterior: el producto ${ProductID} ya no aparece.`);
  }
}

ejecutar().catch((error) => {
  console.error('Error en cliente tRPC:', error.message);
  process.exitCode = 1;
});
