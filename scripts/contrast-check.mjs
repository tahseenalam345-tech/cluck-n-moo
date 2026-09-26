function lum(hex) {
  const rgb = hex.replace("#", "").match(/.{2}/g).map((x) => {
    const v = parseInt(x, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
function ratio(c1, c2) {
  const l1 = lum(c1), l2 = lum(c2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

console.log("White on #FF8243:", ratio("#ffffff", "#FF8243"));
console.log("White on #D34C0A:", ratio("#ffffff", "#D34C0A"));
console.log("White on #C2410C:", ratio("#ffffff", "#C2410C"));
console.log("White on #B43403:", ratio("#ffffff", "#B43403"));
console.log("#181513 (dark text) on #FF8243:", ratio("#181513", "#FF8243"));

console.log("#C2410C on White #ffffff:", ratio("#C2410C", "#ffffff"));
console.log("#B43403 on White #ffffff:", ratio("#B43403", "#ffffff"));
console.log("#C2410C on Cream #FAF6F0:", ratio("#C2410C", "#FAF6F0"));
console.log("#B43403 on Cream #FAF6F0:", ratio("#B43403", "#FAF6F0"));

console.log("Green #10B981 on White:", ratio("#10B981", "#ffffff"));
console.log("Green #047857 on White:", ratio("#047857", "#ffffff"));
console.log("Green #065F46 on #D1FAE5:", ratio("#065F46", "#D1FAE5"));
console.log("Dark mode: #FF8243 on #0C0C0C:", ratio("#FF8243", "#0C0C0C"));
console.log("Dark mode: #FF8243 on #171717:", ratio("#FF8243", "#171717"));
console.log("Dark mode button: #0C0C0C on #FF8243:", ratio("#0C0C0C", "#FF8243"));
console.log("Light mode badge: #9A3412 on #FFEDD5:", ratio("#9A3412", "#FFEDD5"));
console.log("Light mode free badge: #065F46 on #D1FAE5:", ratio("#065F46", "#D1FAE5"));
