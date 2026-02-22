"use client";

import { useState } from "react";
import { useCart } from "@/components/cart-provider";

type Props = {
  product: {
    productId: string;
    slug: string;
    title: string;
    priceArs: number;
    imageUrl: string | null;
    stock: number;
  };
};

export function AddToCartButton({ product }: Props) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleClick = () => {
    addItem(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1300);
  };

  return (
    <button className="button button-primary" onClick={handleClick} disabled={product.stock === 0}>
      {product.stock === 0 ? "Sin stock" : added ? "Agregado" : "Agregar al carrito"}
    </button>
  );
}
