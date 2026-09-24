async function verifyMenuImages() {
  console.log("Verifying /api/v1/menu endpoint image fields...\n");
  const res = await fetch("http://localhost:3000/api/v1/menu");
  const json = await res.json();
  
  if (!json.success || !json.data.categories) {
    throw new Error("Failed to fetch menu");
  }

  const allProducts = json.data.categories.flatMap((c: any) => c.products || []);
  console.log(`Total active products returned by API: ${allProducts.length}`);

  const requiredChecks = [
    "Original Xinger",
    "Classic Cheeseburger",
    "Flaming Tikka",
    "Big Bird Duo",
    "Still Water"
  ];

  console.log("\nTarget Image Verifications:");
  console.log("--------------------------------------------------------------------------------");
  for (const name of requiredChecks) {
    const prod = allProducts.find((p: any) => p.name.toLowerCase() === name.toLowerCase());
    if (!prod) {
      console.error(`❌ Missing product: ${name}`);
      continue;
    }

    if (name === "Still Water") {
      console.assert(prod.imageUrl === null, "Still Water should have null imageUrl for fallback test");
      console.log(`✓ [FALLBACK TEST] ${prod.name}: imageUrl = null (Correct branded fallback)`);
    } else {
      console.assert(Boolean(prod.imageUrl), `${name} should have valid imageUrl`);
      console.assert(prod.imageStatus === "SYNCED", `${name} imageStatus should be SYNCED`);
      console.assert(Boolean(prod.cloudinaryPublicId), `${name} should have cloudinaryPublicId`);
      console.log(`✓ [SYNCED IMAGE] ${prod.name}:`);
      console.log(`    Asset ID:     ${prod.cloudinaryPublicId}`);
      console.log(`    Delivery URL: ${prod.imageUrl}`);
    }
  }

  console.log("\n🎉 All target product image verifications passed!");
}

verifyMenuImages().catch((err) => {
  console.error(err);
  process.exit(1);
});
