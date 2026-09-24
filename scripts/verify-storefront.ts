async function testStorefront() {
  const res = await fetch("http://localhost:3000");
  const html = await res.text();

  console.log("=== STOREFRONT HTML VERIFICATION ===");
  console.log("Length:", html.length);
  console.log("Contains 'Fries & Signature Dips':", html.includes("Fries & Signature Dips"));
  console.log("Contains 'cat_sides':", html.includes("cat_sides"));
  console.log("Contains 'cat_burgers':", html.includes("cat_burgers"));
  console.log("Contains 'cat_chicken':", html.includes("cat_chicken"));
  console.log("Contains 'cat_deals':", html.includes("cat_deals"));
  console.log("Contains 'Fries N More':", html.includes("Fries N More"));

  const apiRes = await fetch("http://localhost:3000/api/v1/menu");
  const apiData = await apiRes.json();
  const cats = apiData.data.categories;

  console.log("\n=== API ACTIVE CATEGORIES (Total: " + cats.length + ") ===");
  cats.forEach((c: any) => {
    console.log(`[Order ${c.displayOrder}] ${c.id} | ${c.name} (${c.products.length} products)`);
  });

  const emptyInApi = cats.filter((c: any) => c.products.length === 0);
  console.log("Empty categories in API:", emptyInApi.length);

  const totalProducts = cats.reduce((acc: number, c: any) => acc + c.products.length, 0);
  console.log("Total active products in API:", totalProducts);

  const cloudinaryProducts = cats
    .flatMap((c: any) => c.products)
    .filter((p: any) => p.imageUrl && p.cloudinaryPublicId);
  console.log("Active products with Cloudinary images:", cloudinaryProducts.length);
}

testStorefront().catch(console.error);
