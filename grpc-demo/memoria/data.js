// Dataset extraido de la base NorthWind (mismo formato del profesor)
		// Para usar todos los productos, copie el arreglo completo del archivo del profesor.

		const categories = [
		  { CategoryID: 1, CategoryName: "Beverages", Description: "Soft drinks, coffees, teas, beers, and ales" },
		  { CategoryID: 2, CategoryName: "Condiments", Description: "Sweet and savory sauces, relishes, spreads, and seasonings" },
		  { CategoryID: 3, CategoryName: "Confections", Description: "Desserts, candies, and sweet breads" },
		  { CategoryID: 4, CategoryName: "Dairy Products", Description: "Cheeses" },
		  { CategoryID: 5, CategoryName: "Grains/Cereals", Description: "Breads, crackers, pasta, and cereal" },
		  { CategoryID: 6, CategoryName: "Meat/Poultry", Description: "Prepared meats" },
		  { CategoryID: 7, CategoryName: "Produce", Description: "Dried fruit and bean curd" },
		  { CategoryID: 8, CategoryName: "Seafood", Description: "Seaweed and fish" }
		];

		const products = [
		  { ProductID: 1, ProductName: "Chai", SupplierID: 1, CategoryID: 1, QuantityPerUnit: "10 boxes x 20 bags", UnitPrice: 18.0, UnitsInStock: 39, ReorderLevel: 10 },
		  { ProductID: 2, ProductName: "Chang", SupplierID: 1, CategoryID: 1, QuantityPerUnit: "24 - 12 oz bottles", UnitPrice: 19.0, UnitsInStock: 17, ReorderLevel: 25 },
		  { ProductID: 3, ProductName: "Aniseed Syrup", SupplierID: 1, CategoryID: 2, QuantityPerUnit: "12 - 550 ml bottles", UnitPrice: 10.0, UnitsInStock: 13, ReorderLevel: 25 },
		  { ProductID: 4, ProductName: "Chef Anton's Cajun Seasoning", SupplierID: 2, CategoryID: 2, QuantityPerUnit: "48 - 6 oz jars", UnitPrice: 22.0, UnitsInStock: 53, ReorderLevel: 0 },
		  { ProductID: 5, ProductName: "Chef Anton's Gumbo Mix", SupplierID: 2, CategoryID: 2, QuantityPerUnit: "36 boxes", UnitPrice: 21.35, UnitsInStock: 0, ReorderLevel: 0 },
		  { ProductID: 6, ProductName: "Grandma's Boysenberry Spread", SupplierID: 3, CategoryID: 2, QuantityPerUnit: "12 - 8 oz jars", UnitPrice: 25.0, UnitsInStock: 120, ReorderLevel: 25 },
		  { ProductID: 7, ProductName: "Uncle Bob's Organic Dried Pears", SupplierID: 3, CategoryID: 7, QuantityPerUnit: "12 - 1 lb pkgs.", UnitPrice: 30.0, UnitsInStock: 15, ReorderLevel: 10 },
		  { ProductID: 8, ProductName: "Northwoods Cranberry Sauce", SupplierID: 3, CategoryID: 2, QuantityPerUnit: "12 - 12 oz jars", UnitPrice: 40.0, UnitsInStock: 6, ReorderLevel: 0 },
		  { ProductID: 9, ProductName: "Mishi Kobe Niku", SupplierID: 4, CategoryID: 6, QuantityPerUnit: "18 - 500 g pkgs.", UnitPrice: 97.0, UnitsInStock: 29, ReorderLevel: 0 },
		  { ProductID: 10, ProductName: "Ikura", SupplierID: 4, CategoryID: 8, QuantityPerUnit: "12 - 200 ml jars", UnitPrice: 31.0, UnitsInStock: 31, ReorderLevel: 0 },
		  { ProductID: 11, ProductName: "Queso Cabrales", SupplierID: 5, CategoryID: 4, QuantityPerUnit: "1 kg pkg.", UnitPrice: 21.0, UnitsInStock: 22, ReorderLevel: 30 },
		  { ProductID: 12, ProductName: "Queso Manchego La Pastora", SupplierID: 5, CategoryID: 4, QuantityPerUnit: "10 - 500 g pkgs.", UnitPrice: 38.0, UnitsInStock: 86, ReorderLevel: 0 }
		];

		export default { categories, products };