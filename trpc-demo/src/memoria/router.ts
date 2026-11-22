import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import { categoriasMemoria, productosMemoria, type Product } from './data';

const t = initTRPC.create();

const CAMPOS_PRODUCTO = [
  'ProductID',
  'ProductName',
  'SupplierID',
  'CategoryID',
  'QuantityPerUnit',
  'UnitPrice',
  'UnitsInStock',
  'ReorderLevel',
] as const;

let siguienteProductID = 13;

export const appRouter = t.router({
  // a) Consultar los datos totales de una tabla
  getAllProducts: t.procedure.query(() => {
    return productosMemoria;
  }),

  getAllCategories: t.procedure.query(() => {
    return categoriasMemoria;
  }),

  // b) Consultar seleccionando campos específicos de una tabla
  getProductFields: t.procedure
    .input(
      z.object({
        fields: z.array(z.enum(CAMPOS_PRODUCTO)).min(1),
      })
    )
    .query(({ input }) => {
      return productosMemoria.map((producto) => {
        const fila: Record<string, string | number> = {};
        for (const campo of input.fields) {
          fila[campo] = producto[campo];
        }
        return fila;
      });
    }),

  // c) Consultar aplicando filtros sobre una tabla
  filterProducts: t.procedure
    .input(
      z.object({
        CategoryID: z.number().int().positive().optional(),
        ProductName: z.string().min(1).optional(),
        UnitPriceMax: z.number().positive().optional(),
      })
    )
    .query(({ input }) => {
      return productosMemoria.filter((producto) => {
        const okCategoria =
          input.CategoryID !== undefined ? producto.CategoryID === input.CategoryID : true;
        const okNombre =
          input.ProductName !== undefined
            ? producto.ProductName.toLowerCase().includes(input.ProductName.toLowerCase())
            : true;
        const okPrecio =
          input.UnitPriceMax !== undefined ? producto.UnitPrice <= input.UnitPriceMax : true;

        return okCategoria && okNombre && okPrecio;
      });
    }),

  // e) Insertar datos
  addProduct: t.procedure
    .input(
      z.object({
        ProductName: z.string().min(2),
        SupplierID: z.number().int().positive(),
        CategoryID: z.number().int().positive(),
        QuantityPerUnit: z.string().min(1),
        UnitPrice: z.number().nonnegative(),
        UnitsInStock: z.number().int().nonnegative(),
        ReorderLevel: z.number().int().nonnegative(),
      })
    )
    .mutation(({ input }) => {
      const nuevo: Product = {
        ProductID: siguienteProductID++,
        ...input,
      };
      productosMemoria.push(nuevo);
      return nuevo;
    }),

  // e) Modificar datos
  updateProduct: t.procedure
    .input(
      z.object({
        ProductID: z.number().int().positive(),
        ProductName: z.string().min(2).optional(),
        SupplierID: z.number().int().positive().optional(),
        CategoryID: z.number().int().positive().optional(),
        QuantityPerUnit: z.string().min(1).optional(),
        UnitPrice: z.number().nonnegative().optional(),
        UnitsInStock: z.number().int().nonnegative().optional(),
        ReorderLevel: z.number().int().nonnegative().optional(),
      })
    )
    .mutation(({ input }) => {
      const idx = productosMemoria.findIndex((p) => p.ProductID === input.ProductID);
      if (idx === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Producto con ProductID=${input.ProductID} no encontrado`,
        });
      }

      const { ProductID, ...cambios } = input;
      const camposActualizados = Object.fromEntries(
        Object.entries(cambios).filter(([, valor]) => valor !== undefined)
      );

      productosMemoria[idx] = {
        ...productosMemoria[idx],
        ...camposActualizados,
      };

      return {
        success: true,
        message: `Producto ${ProductID} modificado correctamente`,
        product: productosMemoria[idx],
      };
    }),

  // e) Eliminar datos
  deleteProduct: t.procedure
    .input(
      z.object({
        ProductID: z.number().int().positive(),
      })
    )
    .mutation(({ input }) => {
      const idx = productosMemoria.findIndex((p) => p.ProductID === input.ProductID);
      if (idx === -1) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Producto con ProductID=${input.ProductID} no encontrado`,
        });
      }

      const [eliminado] = productosMemoria.splice(idx, 1);
      return {
        success: true,
        message: `Producto '${eliminado.ProductName}' (ID ${input.ProductID}) eliminado correctamente`,
      };
    }),
});

export type AppRouter = typeof appRouter;