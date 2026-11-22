import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from './router';

const client = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://127.0.0.1:3000',
    }),
  ],
});

const operacion = process.argv[2] || 'todo';

async function ejecutar() {
  if (operacion === 'a' || operacion === 'todo') {
    console.log('\na) Consultar todos los datos (productos):');
    const productos = await client.getAllProducts.query();
    console.table(productos);
  }

  if (operacion === 'b' || operacion === 'todo') {
    console.log('\nb) Consultar campos específicos (ProductName, UnitPrice):');
    const campos = await client.getProductFields.query({
      fields: ['ProductName', 'UnitPrice'],
    });
    console.table(campos);
  }

  if (operacion === 'c' || operacion === 'todo') {
    console.log('\nc) Consultar aplicando filtros (CategoryID = 2 y UnitPriceMax = 25):');
    const filtrados = await client.filterProducts.query({
      CategoryID: 2,
      UnitPriceMax: 25,
    });
    console.table(filtrados);
  }

  if (operacion === 'e1' || operacion === 'todo') {
    console.log('\ne.1) Insertar un producto:');
    const insertado = await client.addProduct.mutate({
      ProductName: 'Cafe Britt',
      SupplierID: 1,
      CategoryID: 1,
      QuantityPerUnit: '12 - 250 g bags',
      UnitPrice: 12.5,
      UnitsInStock: 40,
      ReorderLevel: 10,
    });
    console.log(insertado);
  }

  if (operacion === 'e2' || operacion === 'todo') {
    console.log('\ne.2) Modificar un producto (ProductID = 13):');
    const modificado = await client.updateProduct.mutate({
      ProductID: 13,
      UnitPrice: 14.0,
      UnitsInStock: 55,
    });
    console.log(modificado);
  }

  if (operacion === 'e3' || operacion === 'todo') {
    console.log('\ne.3) Eliminar un producto (ProductID = 13):');
    const eliminado = await client.deleteProduct.mutate({
      ProductID: 13,
    });
    console.log(eliminado);
  }
}

ejecutar().catch((err) => {
  console.error('Error en cliente tRPC:', err.message);
});