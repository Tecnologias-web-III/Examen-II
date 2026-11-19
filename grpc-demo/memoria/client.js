import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import { fileURLToPath } from 'node:url';

const PROTO_PATH = fileURLToPath(new URL('../proto/northwind.proto', import.meta.url));
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  defaults: true
});
const northwind = grpc.loadPackageDefinition(packageDefinition).northwind;

const client = new northwind.ProductService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

// Convierte las llamadas con callback en promesas
const call = (method, data) =>
  new Promise((resolve, reject) => {
    client[method](data, (err, res) => (err ? reject(err) : resolve(res)));
  });

// Cada operacion se ejecuta segun el argumento: node memoria/client.js <operacion>
const operation = process.argv[2] || 'todo';

// ID del ultimo producto insertado (para poder eliminarlo despues)
let lastInsertedId = Number(process.argv[3]) || null;

const operations = {
  async a() {
    console.log('--- a) Consultar todos los datos (productos)');
    const res = await call('GetAllProducts', {});
    console.table(res.products);
  },
  async b() {
    console.log('--- b) Consultar campos especificos (ProductName, UnitPrice)');
    const res = await call('GetProductFields', { fields: ['ProductName', 'UnitPrice'] });
    console.table(res.records.map((r) => r.values));
  },
  async c1() {
    console.log('--- c) Filtro: CategoryID = 2 (Condiments)');
    const res = await call('FilterProducts', { field: 'CategoryID', value: '2' });
    console.table(res.products);
  },
  async c2() {
    console.log('--- c) Filtro: UnitPrice minimo 30');
    const res = await call('FilterProducts', { field: 'UnitPrice_min', value: '30' });
    console.table(res.products);
  },
  async e1() {
    console.log('--- e) Insertar un producto');
    const res = await call('AddProduct', {
      ProductName: 'Cafe Britt',
      SupplierID: 1,
      CategoryID: 1,
      QuantityPerUnit: '12 - 250 g bags',
      UnitPrice: 12.5,
      UnitsInStock: 40,
      ReorderLevel: 10
    });
    console.log(res);
    lastInsertedId = res.ProductID;
  },
  async e2() {
    console.log('--- e) Modificar el producto 1 (Chai)');
    const res = await call('UpdateProduct', {
      ProductID: 1,
      ProductName: 'Chai Latte',
      SupplierID: 1,
      CategoryID: 1,
      QuantityPerUnit: '10 boxes x 20 bags',
      UnitPrice: 20.0,
      UnitsInStock: 50,
      ReorderLevel: 10
    });
    console.log(res);
  },
  async e3() {
    // Se elimina el producto insertado en e1 (o el ID indicado: node client.js e3 13)
    console.log(`--- e) Eliminar el producto ${lastInsertedId}`);
    const res = await call('DeleteProduct', { id: lastInsertedId });
    console.log(res);
  },
  async final() {
    console.log('--- Estado final de los productos');
    const res = await call('GetAllProducts', {});
    console.table(res.products);
  }
};

try {
  if (operation === 'todo') {
    for (const name of Object.keys(operations)) {
      await operations[name]();
    }
  } else if (operations[operation]) {
    await operations[operation]();
  } else {
    console.log('Operacion no valida. Use: a, b, c1, c2, e1, e2, e3, final o todo');
  }
} catch (err) {
  console.error('Error:', err.message);
}
client.close();