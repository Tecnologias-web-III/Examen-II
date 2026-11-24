import { initTRPC, TRPCError } from '@trpc/server';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { pool } from './db';

const t = initTRPC.create();

const datosProducto = z.object({
  ProductName: z.string().min(2).max(40),
  SupplierID: z.number().int().positive().max(2147483647),
  CategoryID: z.number().int().positive().max(2147483647),
  QuantityPerUnit: z.string().min(1).max(20),
  UnitPrice: z.number().nonnegative().max(999999999999999).refine(
    (precio) => Number(precio.toFixed(4)) === precio,
    'El precio debe tener como máximo cuatro decimales'
  ),
  UnitsInStock: z.number().int().nonnegative().max(32767),
  ReorderLevel: z.number().int().nonnegative().max(32767),
});

const idProducto = z.object({ ProductID: z.number().int().positive().max(2147483647) });
const CAMPOS_PRODUCTO = [
  'ProductID', 'ProductName', 'SupplierID', 'CategoryID',
  'QuantityPerUnit', 'UnitPrice', 'UnitsInStock', 'ReorderLevel',
] as const;
const COLUMNAS_PRODUCTO = CAMPOS_PRODUCTO.join(', ');

interface Product extends RowDataPacket, z.infer<typeof datosProducto> {
  ProductID: number;
}

interface Category extends RowDataPacket {
  CategoryID: number;
  CategoryName: string;
  Description: string;
}

interface ProductWithCategory extends RowDataPacket {
  ProductID: number;
  ProductName: string;
  CategoryID: number;
  CategoryName: string;
}

async function buscarProducto(conexion: PoolConnection, ProductID: number) {
  const [filas] = await conexion.execute<Product[]>(
    `SELECT ${COLUMNAS_PRODUCTO} FROM products WHERE ProductID = ? FOR UPDATE`,
    [ProductID]
  );
  if (!filas[0]) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `Producto con ProductID=${ProductID} no encontrado`,
    });
  }
  return filas[0];
}

async function modificarDatos<T>(operacion: (conexion: PoolConnection) => Promise<T>) {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const resultado = await operacion(conexion);
    await conexion.commit();
    return resultado;
  } catch (error) {
    await conexion.rollback();
    const codigo = (error as { code?: string }).code;
    if (codigo === 'ER_NO_REFERENCED_ROW_2') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'El proveedor o la categoría no existe.' });
    }
    if (codigo === 'ER_ROW_IS_REFERENCED_2') {
      throw new TRPCError({ code: 'CONFLICT', message: 'El producto está asociado a otros registros.' });
    }
    throw error;
  } finally {
    conexion.release();
  }
}

export const appRouter = t.router({
  // a) Consultar los datos totales de una tabla
  getAllProducts: t.procedure.query(async () => {
    const [filas] = await pool.execute<Product[]>(
      `SELECT ${COLUMNAS_PRODUCTO} FROM products ORDER BY ProductID`
    );
    return filas;
  }),

  getAllCategories: t.procedure.query(async () => {
    const [filas] = await pool.execute<Category[]>(
      'SELECT CategoryID, CategoryName, Description FROM categories ORDER BY CategoryID'
    );
    return filas;
  }),

  // b) Seleccionar los campos solicitados, validados contra la lista anterior
  getProductFields: t.procedure
    .input(z.object({ fields: z.array(z.enum(CAMPOS_PRODUCTO)).min(1) }))
    .query(async ({ input }) => {
      const campos = [...new Set(input.fields)].join(', ');
      const [filas] = await pool.execute<(RowDataPacket & Partial<Product>)[]>(
        `SELECT ${campos} FROM products ORDER BY ProductID`
      );
      return filas;
    }),

  // c) Aplicar los filtros que indique el cliente
  filterProducts: t.procedure
    .input(z.object({
      CategoryID: datosProducto.shape.CategoryID.optional(),
      ProductName: z.string().min(1).optional(),
      UnitPriceMax: z.number().positive().optional(),
    }))
    .query(async ({ input }) => {
      const condiciones: string[] = [];
      const valores: (string | number)[] = [];
      if (input.CategoryID !== undefined) {
        condiciones.push('CategoryID = ?');
        valores.push(input.CategoryID);
      }
      if (input.ProductName !== undefined) {
        condiciones.push('LOCATE(?, ProductName) > 0');
        valores.push(input.ProductName);
      }
      if (input.UnitPriceMax !== undefined) {
        condiciones.push('UnitPrice <= ?');
        valores.push(input.UnitPriceMax);
      }
      const filtro = condiciones.length ? ` WHERE ${condiciones.join(' AND ')}` : '';
      const [filas] = await pool.execute<Product[]>(
        `SELECT ${COLUMNAS_PRODUCTO} FROM products${filtro} ORDER BY ProductID`, valores
      );
      return filas;
    }),

  // d) Relacionar productos y categorías
  getProductsWithCategory: t.procedure.query(async () => {
    const [filas] = await pool.execute<ProductWithCategory[]>(`
      SELECT p.ProductID, p.ProductName, c.CategoryID, c.CategoryName
      FROM products AS p
      INNER JOIN categories AS c ON p.CategoryID = c.CategoryID
      ORDER BY p.ProductID
    `);
    return filas;
  }),

  // e) Insertar, modificar y eliminar datos persistentes
  addProduct: t.procedure.input(datosProducto).mutation(({ input }) => {
    return modificarDatos(async (conexion) => {
      const [resultado] = await conexion.execute<ResultSetHeader>(
        `INSERT INTO products (
          ProductName, SupplierID, CategoryID, QuantityPerUnit, UnitPrice,
          UnitsInStock, ReorderLevel, UnitsOnOrder, Discontinued
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0)`,
        [
          input.ProductName, input.SupplierID, input.CategoryID, input.QuantityPerUnit,
          input.UnitPrice, input.UnitsInStock, input.ReorderLevel,
        ]
      );
      return buscarProducto(conexion, resultado.insertId);
    });
  }),

  updateProduct: t.procedure
    .input(datosProducto.partial().extend(idProducto.shape))
    .mutation(({ input }) => {
      return modificarDatos(async (conexion) => {
        const { ProductID, ...cambios } = input;
        const producto = await buscarProducto(conexion, ProductID);
        const campos = Object.entries(cambios).filter(([, valor]) => valor !== undefined);
        if (campos.length) {
          // Los nombres salen solamente del esquema Zod de datosProducto.
          const asignaciones = campos.map(([campo]) => `${campo} = ?`).join(', ');
          await conexion.execute(
            `UPDATE products SET ${asignaciones} WHERE ProductID = ?`,
            [...campos.map(([, valor]) => valor), ProductID]
          );
        }
        return {
          success: true,
          message: `Producto ${ProductID} modificado correctamente`,
          product: campos.length ? await buscarProducto(conexion, ProductID) : producto,
        };
      });
    }),

  deleteProduct: t.procedure.input(idProducto).mutation(({ input }) => {
    return modificarDatos(async (conexion) => {
      const producto = await buscarProducto(conexion, input.ProductID);
      await conexion.execute('DELETE FROM products WHERE ProductID = ?', [input.ProductID]);
      return {
        success: true,
        message: `Producto '${producto.ProductName}' (ID ${input.ProductID}) eliminado correctamente`,
      };
    });
  }),
});

export type AppRouter = typeof appRouter;
