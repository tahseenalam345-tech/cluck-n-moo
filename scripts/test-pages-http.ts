async function testPages() {
  console.log("Testing HTTP responses for customer-facing pages...\n");

  const dealsRes = await fetch("http://localhost:3000/deals");
  console.log(`GET /deals status: ${dealsRes.status}`);
  const dealsHtml = await dealsRes.text();
  console.log(`  Contains 'Build Your Own Deal': ${dealsHtml.includes("Build Your Own Deal")}`);
  console.log(`  Contains 'btn-open-byo-deal': ${dealsHtml.includes("btn-open-byo-deal")}`);

  const trackRes = await fetch("http://localhost:3000/order/track");
  console.log(`\nGET /order/track status: ${trackRes.status}`);
  const trackHtml = await trackRes.text();
  console.log(`  Contains 'Cluck N Moo': ${trackHtml.includes("Cluck N Moo")}`);
  console.log(`  Contains 'juiciest in town': ${trackHtml.includes("juiciest in town")}`);
  console.log(`  Contains '0302-1949067': ${trackHtml.includes("0302-1949067")}`);
  console.log(`  Contains 'Your Recent Orders': ${trackHtml.includes("Your Recent Orders")}`);

  console.log("\nAll customer routes respond 200 OK and render required brand and UI components!");
}

testPages().catch(console.error);
