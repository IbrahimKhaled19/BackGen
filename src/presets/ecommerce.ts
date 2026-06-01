import type { DomainPreset } from "./registry.js";

export const ecommercePreset: DomainPreset = {
  name: "ecommerce",
  description: "E-commerce platform — products, categories, orders, cart, payments",
  plugins: ["jwt"],
  resources: [
    {
      name: "Category",
      fields: ["name:string", "slug:string", "description:string"],
    },
    {
      name: "Product",
      fields: ["name:string", "slug:string", "description:string", "price:number", "stock:number", "imageUrl:string"],
      relations: ["category:Category"],
    },
    {
      name: "Cart",
      fields: ["quantity:number"],
      relations: ["product:Product"],
    },
    {
      name: "Order",
      fields: ["status:string", "total:number", "shippingAddress:string"],
    },
    {
      name: "OrderItem",
      fields: ["quantity:number", "price:number"],
      relations: ["order:Order", "product:Product"],
    },
    {
      name: "Payment",
      fields: ["amount:number", "status:string", "method:string", "paidAt:datetime"],
      relations: ["order:Order"],
    },
  ],
};
